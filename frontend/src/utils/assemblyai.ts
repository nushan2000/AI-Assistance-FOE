// AssemblyAI helper for frontend-only transcription using MediaRecorder + upload
// - Records audio from microphone using MediaRecorder
// - Uses WebAudio Analyser for simple VAD (silence detection)
// - Uploads the final Blob to AssemblyAI `/v2/upload` and requests transcription
// - Polls for completion and invokes callbacks

type TranscriptCallback = (text: string) => void;
type ErrorCallback = (err: any) => void;

const ASSEMBLYAI_KEY = (process.env.REACT_APP_ASSEMBLYAI_KEY || "").trim();
// In development, log a masked confirmation that the key was read (do not print the key itself)
if (process.env.NODE_ENV === "development") {
  try {
    const len = ASSEMBLYAI_KEY.length;
    const preview = ASSEMBLYAI_KEY
      ? `${ASSEMBLYAI_KEY.slice(0, 4)}${"*".repeat(
          Math.max(0, Math.min(12, len - 4))
        )}`
      : "(empty)";
    // show a masked preview + length to help debugging without exposing the full key
    // eslint-disable-next-line no-console
    console.info(`ASSEMBLYAI_KEY: ${preview} (length=${len})`);
  } catch (e) {
    /* ignore */
  }
}
const UPLOAD_URL = "https://api.assemblyai.com/v2/upload";
const TRANSCRIPT_URL = "https://api.assemblyai.com/v2/transcript";
// When this env var is true, send recorded audio to the backend which will
// perform the AssemblyAI upload/transcribe using a server-side key. This
// avoids exposing the AssemblyAI key in the browser and also avoids 401
// issues caused by keys that are only valid for server-side use.
const USE_BACKEND_PROXY =
  (process.env.REACT_APP_ASSEMBLYAI_USE_PROXY || "true") === "true";
const BACKEND_BASE =
  (process.env.REACT_APP_API_BASE as string) || "http://localhost:9000";

export interface RecorderController {
  stop: () => Promise<void>;
  cancel: () => void;
}

export async function startAssemblyAIRecording(opts: {
  onTranscript: TranscriptCallback;
  onInterim?: TranscriptCallback; // not implemented for REST flow
  onStart?: () => void;
  onError?: ErrorCallback;
  onUploadProgress?: (loaded: number, total: number | null) => void;
  onTranscriptionStart?: () => void;
  // optional identifiers for backend routing/persistence
  sessionId?: string;
  userId?: string;
}): Promise<RecorderController> {
  if (!ASSEMBLYAI_KEY) {
    throw new Error(
      "ASSEMBLYAI_KEY not configured in REACT_APP_ASSEMBLYAI_KEY"
    );
  }

  const { onTranscript, onStart, onError } = opts;

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const mediaRecorder = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];

  mediaRecorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  mediaRecorder.onstart = () => {
    if (onStart) onStart();
  };

  mediaRecorder.onerror = (ev) => {
    if (onError) onError(ev);
  };

  // start recording without any automatic silence-based stop; caller must call stop()
  mediaRecorder.start();

  let stopped = false;
  async function stopInternal() {
    if (stopped) return;
    stopped = true;
    try {
      if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
    } catch (e) {}
    // give a brief moment for final chunk
    await new Promise((r) => setTimeout(r, 120));

    // assemble blob
    const blob = new Blob(chunks, { type: "audio/webm" });

    try {
      if (opts.onTranscriptionStart) opts.onTranscriptionStart();

      if (USE_BACKEND_PROXY) {
        // Upload to backend proxy which will call AssemblyAI with a server-side key
        const form = new FormData();
        // name the file so FastAPI's UploadFile receives a filename and content-type
        form.append("file", blob, "voice.webm");
        // session_id and user_id can be overridden by caller in opts
        const sid = opts.sessionId || "default";
        const uid = opts.userId || "anonymous";
        form.append("session_id", sid);
        form.append("user_id", uid);

        const uploadResp = await fetch(
          `${BACKEND_BASE.replace(/\/$/, "")}/chat/voice`,
          {
            method: "POST",
            body: form,
          }
        );

        if (!uploadResp.ok) {
          const txt = await uploadResp.text().catch(() => "");
          throw new Error(
            `Backend proxy upload failed: ${uploadResp.status} ${txt}`
          );
        }

        // Poll the backend GET /chat/voice/{session_id}/transcript endpoint
        const sessionId = opts.sessionId || "default";
        const userId = opts.userId || "anonymous";
        const pollUrl = `${BACKEND_BASE.replace(
          /\/$/,
          ""
        )}/chat/voice/${sessionId}/transcript?user_id=${encodeURIComponent(
          userId
        )}`;
        let transcriptText = "";
        const maxAttempts = 12;
        for (let i = 0; i < maxAttempts; i++) {
          try {
            const r = await fetch(pollUrl);
            if (r.ok) {
              const j = await r.json();
              if (j && j.transcript) {
                transcriptText = j.transcript;
                break;
              }
            }
          } catch (e) {
            // ignore and retry
          }
          // wait 500ms between attempts
          await new Promise((res) => setTimeout(res, 500));
        }

        if (!transcriptText) {
          throw new Error("Timeout waiting for backend transcript");
        }

        onTranscript(transcriptText);
      } else {
        const uploadUrl = await uploadToAssemblyAI(blob, opts.onUploadProgress);
        const text = await createTranscription(uploadUrl);
        onTranscript(text);
      }
    } catch (e) {
      if (onError) onError(e);
    } finally {
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch (e) {}
    }
  }

  function cancel() {
    stopped = true;
    try {
      if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
    } catch (e) {}
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch (e) {}
  }

  return { stop: stopInternal, cancel };
}

async function uploadToAssemblyAI(
  blob: Blob,
  onProgress?: (loaded: number, total: number | null) => void
): Promise<string> {
  // upload returns an object URL in `upload_url`
  const url = UPLOAD_URL;
  // Use XHR so we can report upload progress
  const j = await new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${ASSEMBLYAI_KEY}`);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(e);
        }
      } else {
        if (xhr.status === 401) {
          reject(
            new Error(
              "AssemblyAI upload failed: 401 Unauthorized. The API key sent by the frontend was rejected. Check REACT_APP_ASSEMBLYAI_KEY in frontend/.env and restart the dev server."
            )
          );
        } else {
          reject(
            new Error(
              `AssemblyAI upload failed: ${xhr.status} ${xhr.responseText}`
            )
          );
        }
      }
    };
    xhr.onerror = () =>
      reject(new Error("Network error during AssemblyAI upload"));
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (ev) => {
        try {
          onProgress(ev.loaded, ev.lengthComputable ? ev.total : null);
        } catch (e) {}
      };
    }
    xhr.send(blob);
  });
  // docs: upload returns { upload_url }
  return j.upload_url || j.url || j.data?.upload_url || "";
}

async function createTranscription(uploadUrl: string): Promise<string> {
  const body = {
    audio_url: uploadUrl,
    // optional: set language and other params
    // e.g., 'language_code': 'en_us'
  } as any;
  const resp = await fetch(TRANSCRIPT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ASSEMBLYAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    if (resp.status === 401) {
      throw new Error(
        "AssemblyAI transcript request failed: 401 Unauthorized. The API key was rejected. Check REACT_APP_ASSEMBLYAI_KEY in frontend/.env and restart the dev server."
      );
    }
    throw new Error(
      `AssemblyAI transcript request failed: ${resp.status} ${txt}`
    );
  }
  const j = await resp.json();
  const id = j.id;
  // poll until status 'completed' or 'error'
  const pollUrl = `${TRANSCRIPT_URL}/${id}`;
  for (;;) {
    const r = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${ASSEMBLYAI_KEY}` },
    });
    if (!r.ok) {
      const txt = await r.text();
      if (r.status === 401) {
        throw new Error(
          "AssemblyAI poll failed: 401 Unauthorized. The API key was rejected when polling transcription. Check REACT_APP_ASSEMBLYAI_KEY in frontend/.env and restart the dev server."
        );
      }
      throw new Error(`AssemblyAI poll failed: ${r.status} ${txt}`);
    }
    const pj = await r.json();
    if (pj.status === "completed") return pj.text || "";
    if (pj.status === "error")
      throw new Error(`transcription error: ${pj.error}`);
    // wait and retry
    await new Promise((res) => setTimeout(res, 1200));
  }
}

const api = {
  startAssemblyAIRecording,
};

export default api;
