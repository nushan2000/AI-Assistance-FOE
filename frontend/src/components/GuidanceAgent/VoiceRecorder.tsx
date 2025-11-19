import React, {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import MicIcon from "@mui/icons-material/Mic";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

interface VoiceRecorderProps {
  sessionId: string;
  userEmail?: string | null;
  onTranscription?: (text: string) => void;
  onVoiceSend?: () => void; // called when upload starts
  onVoiceResponse?: (resp: any) => void; // full backend response for voice
  showControls?: boolean;
  onRecordingChange?: (isRecording: boolean) => void;
}

// Simple MediaRecorder-based recorder that auto-uploads on stop (no preview/accept)
const VoiceRecorder = forwardRef<any, VoiceRecorderProps>(
  function VoiceRecorder(
    {
      sessionId,
      userEmail,
      onTranscription,
      onVoiceSend,
      onVoiceResponse,
      showControls = true,
      onRecordingChange,
    },
    ref
  ) {
    const [isRecording, setIsRecording] = useState(false);
    const [uploading, setUploading] = useState(false);
    // Removed local preview/download state: we don't keep blobs locally
    const [recordSeconds, setRecordSeconds] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    const start = async () => {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaStreamRef.current = stream;
        chunksRef.current = [];
        const options: MediaRecorderOptions = {};
        if (MediaRecorder.isTypeSupported("audio/webm"))
          options.mimeType = "audio/webm";
        else if (MediaRecorder.isTypeSupported("audio/ogg"))
          options.mimeType = "audio/ogg";
        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, {
            type: chunksRef.current[0]?.type || "audio/webm",
          });
          // Do not store blob locally; it will be uploaded then discarded
          // stop tracks
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
          }
          // upload automatically
          await uploadBlob(blob);
        };

        recorder.start();
        setIsRecording(true);
        onRecordingChange?.(true);
        // start timer
        setRecordSeconds(0);
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
          setRecordSeconds((s) => s + 1);
        }, 1000) as unknown as number;
      } catch (err: any) {
        console.error("VoiceRecorder start error", err);
        setError(err?.message || "Microphone access denied or not available");
      }
    };

    const stop = () => {
      try {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          mediaRecorderRef.current.stop();
        }
      } catch (err) {
        console.warn("stop error", err);
      } finally {
        setIsRecording(false);
        onRecordingChange?.(false);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    };

    const uploadBlob = async (blob: Blob) => {
      if (!blob) return;
      setUploading(true);
      setError(null);
      try {
        const form = new FormData();
        const ext = blob.type.includes("ogg")
          ? "ogg"
          : blob.type.includes("mpeg")
          ? "mp3"
          : blob.type.includes("wav")
          ? "wav"
          : "webm";
        const filename = `voice.${ext}`;
        form.append("file", blob, filename);
        form.append("session_id", sessionId);
        form.append("user_id", userEmail || "");

        // Use explicit backend URL to ensure requests reach the FastAPI server
        // Allow override via `REACT_APP_API_BASE` env variable (e.g. http://localhost:8000)
        const BACKEND_BASE =
          (process.env.REACT_APP_API_BASE as string) || "http://localhost:8000";
        const uploadUrl = `${BACKEND_BASE.replace(/\/$/, "")}/chat/voice`;

        // notify parent that upload is starting so it can show a pending user bubble
        onVoiceSend?.();

        const response = await fetch(uploadUrl, {
          method: "POST",
          body: form,
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Upload failed: ${response.status} ${text}`);
        }

        const postResp = await response.json();

        // The backend now persists the transcript and returns an acknowledgement.
        // Fetch the saved transcript via the dedicated GET endpoint so the frontend
        // can display the user query first and then call /chat for routing.
        const transcriptUrl = `${BACKEND_BASE.replace(
          /\/$/,
          ""
        )}/chat/voice/${encodeURIComponent(
          sessionId
        )}/transcript?user_id=${encodeURIComponent(userEmail || "")}`;

        let transcript = "";
        try {
          const tResp = await fetch(transcriptUrl, { method: "GET" });
          if (tResp.ok) {
            const tjson = await tResp.json();
            transcript = tjson?.transcript || "";
          } else {
            // transcript may not be immediately available; fall back to empty
            console.warn(
              "Failed to fetch transcript after upload",
              await tResp.text()
            );
          }
        } catch (e) {
          console.warn("Error fetching transcript", e);
        }

        const normalized = { ...(postResp || {}), transcript };
        onVoiceResponse?.(normalized);
        if (!normalized.response && transcript) {
          onTranscription?.(transcript);
        }
      } catch (err) {
        console.error("Voice upload failed", err);
        setError(
          (err as any)?.message ||
            "Failed to upload audio or transcribe. Try again."
        );
      } finally {
        setUploading(false);
        // clear collected chunks to avoid keeping blob data in memory
        chunksRef.current = [];
        setRecordSeconds(0);
      }
    };

    // No local preview or object URLs: we avoid storing audio locally
    useImperativeHandle(ref, () => ({
      start: () => start(),
      stop: () => stop(),
      isRecording: () => isRecording,
    }));

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {showControls && (
          <IconButton
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            onClick={isRecording ? stop : start}
            title={isRecording ? "Stop recording" : "Record voice"}
            style={{ color: isRecording ? "#c62828" : undefined }}
          >
            {isRecording ? <CloseIcon /> : <MicIcon />}
          </IconButton>
        )}

        {isRecording && (
          <div
            style={{ fontSize: 12, color: "#c62828", minWidth: 48 }}
          >{`${Math.floor(recordSeconds / 60)
            .toString()
            .padStart(1, "0")}:${(recordSeconds % 60)
            .toString()
            .padStart(2, "0")}`}</div>
        )}

        {uploading && <div style={{ fontSize: 12 }}>Uploading...</div>}
        {error && <div style={{ color: "red", fontSize: 12 }}>{error}</div>}

        {/* No local preview/download UI for privacy and to avoid local storage */}
      </div>
    );
  }
);

export default VoiceRecorder;
