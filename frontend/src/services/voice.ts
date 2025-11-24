// Service to upload recorded voice files to the backend role-based voice endpoints
// Exports a single function `uploadVoice` which POSTs a FormData with keys:
// - file: audio file
// - session_id: session id
// - user_id: user identifier (email)
// The backend endpoints used are `/ruh/chat/voice` for undergraduates and
// `/ugc/chat/voice` for other users.
import userRoleUtils from "../utils/userRole";

export type UploadVoiceOptions = {
  blob: Blob;
  sessionId: string;
  userId?: string | null;
  backendBase?: string; // optional override of REACT_APP_API_BASE
  onProgress?: (percent: number) => void;
};

// Use central userRole utility to decide endpoint routing (undergraduate vs others)
const isUndergraduate = (userId?: string | null) =>
  userRoleUtils.isUndergraduate(userId as any);

export async function uploadVoice(opts: UploadVoiceOptions) {
  const { blob, sessionId, userId, backendBase, onProgress } = opts;

  const base = (
    backendBase ||
    process.env.REACT_APP_API_BASE ||
    "http://localhost:8000"
  ).replace(/\/$/, "");

  const endpoint = isUndergraduate(userId)
    ? "/ruh/chat/voice"
    : "/ugc/chat/voice";
  const url = `${base}${endpoint}`;

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
  form.append("user_id", userId || "");

  // Use XMLHttpRequest so upload progress can be reported reliably
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText || "{}");
          resolve(json);
        } catch (e) {
          // If backend returns non-json, still resolve with raw text
          resolve({ text: xhr.responseText });
        }
      } else {
        reject(
          new Error(
            `Upload failed: ${xhr.status} ${xhr.statusText}: ${xhr.responseText}`
          )
        );
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          try {
            onProgress(pct);
          } catch (e) {
            // ignore progress handler errors
          }
        }
      };
    }

    xhr.send(form);
  });
}

export default uploadVoice;
