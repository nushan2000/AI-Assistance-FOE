import userRoleUtils from "../utils/userRole";

export type UploadVoiceOptions = {
  blob: Blob;
  sessionId: string;
  userId?: string | null;
  backendBase?: string;
  onProgress?: (percent: number) => void;
};

const isUndergraduate = (userId?: string | null) =>
  userRoleUtils.isUndergraduate(userId as any);

export async function uploadVoice(opts: UploadVoiceOptions) {
  const { blob, sessionId, userId, onProgress } = opts;

  let appGuidanceBase: string | undefined = undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const appMod = require("../App") as any;
    appGuidanceBase = appMod && appMod.Guidance_Base_URL;
  } catch (e) {
    appGuidanceBase = undefined;
  }

  const base = (appGuidanceBase || "http://localhost:9000").replace(/\/$/, "");

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

  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText || "{}");
          resolve(json);
        } catch (e) {
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
