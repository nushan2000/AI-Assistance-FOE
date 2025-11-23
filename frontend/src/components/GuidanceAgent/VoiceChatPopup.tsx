import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
// axios not used here; use fetch for network
import "./VoiceButton.css";
import assemblyai from "../../utils/assemblyai";
import assemblyaiRealtime from "../../utils/assemblyai-realtime";

type CollectedMessage = { role: "user" | "agent"; text: string };

type Props = {
  visible: boolean;
  sessionId?: string;
  userEmail?: string | null;
  onClose: (messages: CollectedMessage[]) => void;
};

// New behavior: use Web Speech API (SpeechRecognition) for live transcription.
// Flow: open -> wait 5000ms -> start SpeechRecognition -> on final result append user message and send transcript to backend /ask_llm -> show thinking -> play TTS -> when silent for 5000ms stop -> return collected messages on close.

export default function VoiceChatPopup({
  visible,
  sessionId = "",
  userEmail = null,
  onClose,
}: Props) {
  const ASSEMBLYAI_KEY = (process.env.REACT_APP_ASSEMBLYAI_KEY || "").trim();
  const [status, setStatus] = useState<
    "idle" | "recording" | "thinking" | "speaking"
  >("idle");
  const [transcript, setTranscript] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [useRealtime, setUseRealtime] = useState<boolean>(
    (process.env.REACT_APP_ASSEMBLYAI_REALTIME || "false") === "true"
  );
  const [collected, setCollected] = useState<CollectedMessage[]>([]);
  const recorderRef = useRef<any | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const usingBackendAudioRef = useRef<boolean>(false);
  // container element for React portal so the modal mounts at document.body
  const elRef = useRef<HTMLDivElement>(document.createElement("div"));

  const [pendingUser, setPendingUser] = useState<string>("");

  const ttsStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const el = elRef.current;
    el.className = "voice-portal-root";
    document.body.appendChild(el);
    return () => {
      try {
        document.body.removeChild(el);
      } catch (e) {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      // reset
      stopRecording();
      setStatus("idle");
      setTranscript("");
      setCollected([]);
      return;
    }

    // Do NOT auto-start recording on open. User must tap the circle to begin.
    setStatus("idle");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function startRecording() {
    try {
      // require AssemblyAI key for frontend transcription
      if (!ASSEMBLYAI_KEY) {
        throw new Error(
          "AssemblyAI key not configured. Set REACT_APP_ASSEMBLYAI_KEY in frontend/.env and restart the dev server."
        );
      }

      if (useRealtime) {
        // start realtime streaming client
        const controller = await assemblyaiRealtime.startRealtimeTranscription({
          onPartial: (t) => {
            setTranscript(t + " (partial)");
          },
          onFinal: (t) => {
            setTranscript(t);
            // do not auto-send; store final as pending for manual send
            setPendingUser(t);
          },
          onError: (e) => {
            console.warn("realtime error", e);
            setStatus("idle");
          },
        });
        recorderRef.current = controller;
        setStatus("recording");
      } else {
        // start AssemblyAI recorder — manual stop only (no VAD auto-stop)
        const controller = await assemblyai.startAssemblyAIRecording({
          onStart: () => {
            setStatus("recording");
          },
          onTranscript: (text: string) => {
            // Received final transcript from AssemblyAI — store as pending; user must click Ask to send
            setTranscript(text);
            setPendingUser(text);
          },
          onError: (e) => {
            console.warn("assemblyai error", e);
            setStatus("idle");
          },
          onUploadProgress: (loaded, total) => {
            setIsUploading(true);
            if (total) setUploadProgress(Math.round((loaded / total) * 100));
            else setUploadProgress(null);
          },
          onTranscriptionStart: () => {
            setIsUploading(false);
            setIsTranscribing(true);
          },
          // pass session and user info so backend can persist and later route correctly
          sessionId: sessionId || "default",
          userId: userEmail || "anonymous",
        });
        recorderRef.current = controller;
      }
    } catch (err) {
      console.warn("startRecording failed", err);
      const msg =
        err && ((err as any).message || String(err))
          ? String((err as any).message || err)
          : "unknown error";
      setTranscript(`(microphone unavailable: ${msg})`);
      setStatus("idle");
    }
  }

  function stopRecognition() {
    stopRecording();
    setIsUploading(false);
    setUploadProgress(null);
    setIsTranscribing(false);
  }

  async function stopRecording() {
    try {
      if (recorderRef.current) {
        await recorderRef.current.stop();
        recorderRef.current = null;
      }
    } catch (e) {
      console.warn("stopRecording error", e);
    }
    setStatus("idle");
  }

  async function pushFinalTranscript(text: string) {
    if (!text) return;
    // clear pendingUser when actually sending
    setPendingUser("");
    // append to collected
    setCollected((prev) => [...prev, { role: "user", text }]);

    // send to backend chat endpoint
    const BACKEND_BASE =
      (process.env.REACT_APP_API_BASE as string) || "http://localhost:9000";
    // If user's email belongs to RUH engineering domain or indicates undergraduate role,
    // route to `/ruh/chat`. Otherwise route to `/ugc/chat`.
    const email = (userEmail || "").toLowerCase();
    const isRuhEng =
      email.endsWith("@engug.ruh.ac.lk") || email.includes("undergrad");
    const chatEndpoint = isRuhEng
      ? `${BACKEND_BASE.replace(/\/$/, "")}/ruh/chat`
      : `${BACKEND_BASE.replace(/\/$/, "")}/ugc/chat`;
    setStatus("thinking");
    try {
      const chatResp = await fetch(chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // backend expects a `message` field (ChatMessage model). Send message instead of text.
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          user_id: userEmail,
        }),
      });
      if (chatResp.ok) {
        const cj = await chatResp.json();
        const assistantText = cj?.response || cj?.message || cj?.text || "";
        if (assistantText) {
          setCollected((prev) => [
            ...prev,
            { role: "agent", text: assistantText },
          ]);
          await tryPlayTTS(assistantText);
        }
      } else {
        console.warn("chat endpoint returned non-ok", chatResp.status);
      }
    } catch (e) {
      console.warn("sending transcript to chat endpoint failed", e);
    } finally {
      setStatus("idle");
      // clear displayed transcript after send to avoid confusion
      setTranscript("");
    }
  }

  function sendPending() {
    const text = pendingUser || transcript.trim();
    if (!text) return;
    pushFinalTranscript(text);
    setPendingUser("");
    setTranscript("");
  }

  async function tryPlayTTS(text: string) {
    // try backend TTS endpoint first
    const BACKEND_BASE =
      (process.env.REACT_APP_API_BASE as string) || "http://localhost:9000";
    const ttsUrl = `${BACKEND_BASE.replace(/\/$/, "")}/chat/voice/tts`;
    try {
      const resp = await fetch(ttsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, text }),
      });
      if (resp.ok) {
        const audioBlob = await resp.blob();
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        // store ref so we can control play/pause/stop
        audioRef.current = audio;
        usingBackendAudioRef.current = true;
        ttsStartTimeRef.current = Date.now();
        setStatus("speaking");
        await new Promise<void>((resolve) => {
          audio.onended = () => {
            resolve();
          };
          audio.play().catch(() => resolve());
        });
        // cleanup object URL after playback
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
        setStatus("idle");
        return;
      }
    } catch (e) {
      // ignore and fallback
      console.warn("backend tts failed", e);
    }

    // fallback to browser speechSynthesis
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      utterRef.current = u;
      usingBackendAudioRef.current = false;
      setStatus("speaking");
      u.onend = () => setStatus("idle");
      u.onerror = () => setStatus("idle");
      window.speechSynthesis.speak(u);
    }
  }

  // TTS controls usable while speaking
  function ttsPause() {
    try {
      if (usingBackendAudioRef.current && audioRef.current) {
        audioRef.current.pause();
      } else if ("speechSynthesis" in window) {
        window.speechSynthesis.pause();
      }
    } catch (e) {
      console.warn("ttsPause failed", e);
    }
  }

  function ttsResume() {
    try {
      if (usingBackendAudioRef.current && audioRef.current) {
        audioRef.current.play().catch(() => {});
      } else if ("speechSynthesis" in window) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      console.warn("ttsResume failed", e);
    }
  }

  function ttsStop() {
    try {
      if (usingBackendAudioRef.current && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        // attempt to revoke src if it was an object URL
        try {
          const src = audioRef.current.src;
          if (src && src.startsWith("blob:")) URL.revokeObjectURL(src);
        } catch (e) {}
        audioRef.current = null;
        usingBackendAudioRef.current = false;
      } else if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        utterRef.current = null;
      }
    } catch (e) {
      console.warn("ttsStop failed", e);
    } finally {
      setStatus("idle");
    }
  }
  function handleClose() {
    // stop any ongoing recognition
    try {
      stopRecognition();
      // if realtime recorder exposes cancel, call it to close websocket immediately
      try {
        if (
          recorderRef.current &&
          typeof recorderRef.current.cancel === "function"
        ) {
          recorderRef.current.cancel();
        }
      } catch (e) {}
    } catch (e) {
      /* ignore */
    }
    onClose(collected);
    // reset local state
    setCollected([]);
    setTranscript("");
    setStatus("idle");
  }

  if (!visible) return null;

  const popup = (
    <div className="voice-popup-overlay">
      <div className="voice-popup">
        <div className="voice-header">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label
              style={{
                fontSize: 13,
                color: "#444",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={useRealtime}
                onChange={() => setUseRealtime((s) => !s)}
              />
              Use realtime
            </label>
          </div>
        </div>
        <div className="voice-body">
          <div
            className={`voice-circle ${
              status === "recording" ? "listening" : ""
            } ${status === "thinking" ? "thinking" : ""} ${
              status === "speaking" ? "speaking" : ""
            }`}
          >
            <div
              className="gif-container"
              onClick={() => {
                if (status === "recording") stopRecognition();
                else if (status === "idle") startRecording();
              }}
              role="button"
              aria-pressed={status === "recording"}
              tabIndex={0}
            >
              {status === "thinking" ? (
                <video
                  src="/processing.mp4"
                  className="voice-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : status === "speaking" ? (
                <img src="/talking.gif" className="voice-gif" alt="speaking" />
              ) : (
                <img
                  src="/listening.gif"
                  className="voice-gif"
                  alt="listening"
                />
              )}

              <div className="status-overlay" aria-hidden>
                {/* status icon */}
                {status === "recording" && (
                  <div className="mic-badge" aria-hidden>
                    <svg
                      className="status-icon mic"
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M12 1v10"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M19 10a7 7 0 01-14 0"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 21v-4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
                {status === "thinking" && (
                  <svg
                    className="status-icon thinking"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2a7 7 0 00-7 7c0 3.866 3.582 7 8 7"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 22v-2"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {status === "speaking" && (
                  <svg
                    className="status-icon speaking"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 12s3-4 9-4 9 4 9 4-3 4-9 4S3 12 3 12z"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 8v8"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
          </div>

          <div className="voice-status">
            {status === "recording" && (
              <div className="gif-placeholder">listening</div>
            )}
            {status === "thinking" && (
              <div className="gif-placeholder">thinking</div>
            )}
            {status === "speaking" && (
              <div className="gif-placeholder">talking</div>
            )}
          </div>

          <div className="transcript-view">
            <strong>You:</strong> {transcript || <em>No speech yet</em>}
          </div>

          <div style={{ marginTop: 8 }}>
            {isUploading && (
              <div style={{ width: 240 }}>
                <div style={{ fontSize: 12, color: "#555" }}>
                  Uploading audio...
                </div>
                <div style={{ height: 8, background: "#eee", borderRadius: 4 }}>
                  <div
                    style={{
                      height: 8,
                      width: uploadProgress ? `${uploadProgress}%` : "20%",
                      background: "#4caf50",
                      borderRadius: 4,
                      transition: "width 200ms linear",
                    }}
                  />
                </div>
              </div>
            )}
            {isTranscribing && (
              <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
                Transcribing... <span aria-hidden>⏳</span>
              </div>
            )}
            {useRealtime && (
              <div style={{ fontSize: 11, color: "#777", marginTop: 6 }}>
                Realtime mode: partial transcripts shown as they arrive
              </div>
            )}
          </div>

          <div className="collected-messages">
            {collected.map((m: CollectedMessage, i: number) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.role === "user" ? "You" : "Agent"}: {m.text}
              </div>
            ))}
          </div>
        </div>

        <div className="voice-footer">
          {/* show TTS controls only when assistant is speaking */}
          {status === "speaking" && (
            <div className="tts-controls">
              <button
                className="tts-btn tts-pause"
                onClick={() => ttsPause()}
                aria-label="Pause speech"
                title="Pause"
              >
                {/* Pause icon: two vertical bars */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <rect x="5" y="4" width="4" height="16" rx="1" fill="#000" />
                  <rect x="15" y="4" width="4" height="16" rx="1" fill="#000" />
                </svg>
              </button>
              <button
                className="tts-btn tts-resume"
                onClick={() => ttsResume()}
                aria-label="Resume speech"
                title="Resume"
              >
                {/* Resume / Play icon: triangle */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path d="M5 3v18l15-9L5 3z" fill="#000" />
                </svg>
              </button>
              <button
                className="tts-btn tts-stop"
                onClick={() => ttsStop()}
                aria-label="Stop speech"
                title="Stop"
              >
                {/* Stop icon: square */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <rect x="5" y="5" width="14" height="14" rx="2" fill="#000" />
                </svg>
              </button>
            </div>
          )}

          {/* show Ask/send button when user is recording and autoSend is disabled and there's pending text */}
          {(pendingUser || transcript) && (
            <button
              className="ask-btn"
              onClick={() => sendPending()}
              aria-label="Send recorded speech"
            >
              Ask
            </button>
          )}

          <button
            className="end-chat-btn"
            onClick={handleClose}
            aria-label="End the chat"
          >
            End the Chat
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(popup, elRef.current);
}
