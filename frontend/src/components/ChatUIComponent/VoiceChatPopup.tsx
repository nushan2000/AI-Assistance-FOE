import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
// axios not used here; use fetch for network
import "./VoiceButton.css";

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
  const [status, setStatus] = useState<
    "idle" | "waiting" | "recording" | "thinking" | "speaking"
  >("idle");
  const [transcript, setTranscript] = useState("");
  const [collected, setCollected] = useState<CollectedMessage[]>([]);
  const recognitionRef = useRef<any | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const usingBackendAudioRef = useRef<boolean>(false);
  // container element for React portal so the modal mounts at document.body
  const elRef = useRef<HTMLDivElement>(document.createElement("div"));
  const startDelayRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const interimRef = useRef<string>("");
  const alwaysListenRef = useRef<boolean>(true);
  const [alwaysListen, setAlwaysListen] = useState<boolean>(true);
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
      stopRecognition();
      setStatus("idle");
      setTranscript("");
      setCollected([]);
      if (startDelayRef.current) {
        window.clearTimeout(startDelayRef.current);
        startDelayRef.current = null;
      }
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      return;
    }

    // when popup opens, wait 2000ms then start recognition automatically
    setStatus("waiting");
    startDelayRef.current = window.setTimeout(() => {
      startRecognition();
    }, 2000) as unknown as number;

    return () => {
      if (startDelayRef.current) {
        window.clearTimeout(startDelayRef.current);
        startDelayRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function startRecognition() {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API not available in this browser.");
      setStatus("idle");
      setTranscript("(speech recognition not supported)");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setStatus("recording");
      interimRef.current = "";
    };

    recognition.onerror = (ev: any) => {
      console.warn("SpeechRecognition error", ev);
      setStatus("idle");
    };

    recognition.onresult = (ev: any) => {
      let interim = "";
      let finalTranscript = "";
      for (let i = ev.resultIndex; i < ev.results.length; ++i) {
        const res = ev.results[i];
        if (res.isFinal) {
          finalTranscript += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }

      if (finalTranscript) {
        // finalize
        const trimmed = finalTranscript.trim();
        setTranscript((t) => (t ? t + " " + trimmed : trimmed));
        // Decide whether this final transcript is likely user speech (to avoid TTS echo)
        const isLikelyUserSpeech = (() => {
          try {
            const tokens = trimmed.toLowerCase().match(/\b\w+\b/g) || [];
            const stopWords = new Set([
              "i",
              "am",
              "is",
              "are",
              "the",
              "a",
              "an",
              "and",
              "or",
              "but",
              "in",
              "on",
              "at",
              "to",
              "for",
              "of",
              "with",
              "by",
              "can",
              "you",
              "me",
              "my",
              "what",
              "how",
              "when",
              "where",
              "why",
              "do",
              "does",
              "did",
              "will",
              "would",
              "could",
              "should",
              "please",
              "thanks",
              "thank",
              "hi",
              "hello",
              "hey",
            ]);
            const meaningful = tokens.filter(
              (t: string) => t.length > 2 && !stopWords.has(t)
            );
            // require at least 2 meaningful tokens or at least 2 tokens total
            return meaningful.length >= 2 || tokens.length >= 2;
          } catch (e) {
            return true;
          }
        })();

        // If assistant is speaking and we are in always-listen mode and the
        // transcript looks like user speech, treat it as an interrupt: stop TTS
        // and immediately send this transcript.
        if (
          status === "speaking" &&
          alwaysListenRef.current &&
          isLikelyUserSpeech
        ) {
          // small guard: ignore transcripts that occur within 200ms of tts start (likely self-loop)
          const now = Date.now();
          if (!ttsStartTimeRef.current || now - ttsStartTimeRef.current > 200) {
            try {
              ttsStop();
            } catch (e) {}
            // push transcript (will set thinking etc.)
            pushFinalTranscript(trimmed);
          } else {
            // fallthrough: treat as normal final transcript but do not interrupt
            pushFinalTranscript(trimmed);
          }
        } else {
          pushFinalTranscript(trimmed);
        }
      }

      // show interim
      setTranscript((t) => {
        const base = t.split(" (interim)")[0];
        return base + (interim ? ` ${interim} (interim)` : "");
      });

      // reset silence timer on result
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      silenceTimerRef.current = window.setTimeout(() => {
        // 5s silence -> stop recognition
        stopRecognition();
      }, 5000) as unknown as number;
    };

    recognition.onend = () => {
      // ended (either silent stop or manual stop)
      if (status === "recording") setStatus("idle");
      // If always-listen is enabled and popup still visible, restart recognition
      if (alwaysListenRef.current && visible) {
        // small delay to avoid busy restart loops
        window.setTimeout(() => {
          if (!recognitionRef.current) startRecognition();
        }, 250);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn("recognition start failed", e);
    }
  }

  // toggle handler for always listen
  function toggleAlwaysListen() {
    const next = !alwaysListenRef.current;
    alwaysListenRef.current = next;
    setAlwaysListen(next);
    // if enabling, ensure recognition is running
    if (next && visible && !recognitionRef.current) startRecognition();
  }

  function stopRecognition() {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch (e) {
      console.warn("stopRecognition error", e);
    }
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setStatus("idle");
  }

  async function pushFinalTranscript(text: string) {
    if (!text) return;
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
    }
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
        audioRef.current = null;
        usingBackendAudioRef.current = false;
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
    } catch (e) {
      /* ignore */
    }
    if (startDelayRef.current) {
      window.clearTimeout(startDelayRef.current);
      startDelayRef.current = null;
    }
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
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
          {/* <h3 className="voice-title"></h3> */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 12, color: "#444" }}>
              <input
                type="checkbox"
                checked={alwaysListen}
                onChange={() => toggleAlwaysListen()}
                style={{ marginRight: 6 }}
              />
              Always listen
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
                else if (status === "idle" || status === "waiting")
                  startRecognition();
              }}
              role="button"
              aria-pressed={status === "recording"}
              tabIndex={0}
            >
              <img
                src="/voice.gif"
                className="voice-gif"
                alt="voice activity"
              />

              <div className="status-overlay" aria-hidden>
                {/* status icon */}
                {status === "recording" && (
                  <svg
                    className="status-icon mic"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 1v10"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 10a7 7 0 01-14 0"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 21v-4"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
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

          <div className="collected-messages">
            {collected.map((m: CollectedMessage, i: number) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.role === "user" ? "You" : "Agent"}: {m.text}
              </div>
            ))}
          </div>
        </div>

        <div className="voice-footer">
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
