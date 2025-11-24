import React, { useEffect, useRef, useState } from "react";
import VoiceRecorder from "./VoiceRecorder";
import "./GuidanceVoicePopup.css";
import MicIcon from '@mui/icons-material/Mic';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useNotification } from "../../context/NotificationContext";

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  userEmail?: string | null;
};

// Popup is voice-only; no message type required here

export default function VoiceChatPopupImpl({
  open,
  onClose,
  sessionId,
  userEmail,
}: Props) {
  const recorderRef = useRef<any>(null);
  const [state, setState] = useState<
    "idle" | "recording" | "thinking" | "speaking"
  >("idle");
  // messages list intentionally removed for voice-only popup
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState<number>(0);
  const { notify } = useNotification();

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        try {
          recorderRef.current?.start();
          setState("recording");
        } catch (e) {
          console.warn("Failed to start recorder on open", e);
          const errMsg = (e && (e as any).name === 'NotAllowedError') || (e && typeof (e as any).message === 'string' && (e as any).message.toLowerCase().includes('permission'))
            ? 'Microphone access was denied. Please enable microphone permissions in your browser settings.'
            : 'Unable to access microphone.';
          setError(errMsg);
          try {
            notify('error', 'Microphone Permission', errMsg, 8000);
          } catch (notifyErr) {
            console.warn('Notification failed', notifyErr);
          }
        }
      }, 200);
      return () => clearTimeout(t);
    } else {
      try {
        recorderRef.current?.stop();
      } catch (e) {
        // ignore
      }
      setState("idle");
      setTranscript(null);
      setError(null);
    }
  }, [open, notify]);

  // Timer for recording duration: starts when state becomes 'recording'
  useEffect(() => {
    let id: any = null;
    if (state === "recording") {
      setElapsedSecs(0);
      id = setInterval(() => {
        setElapsedSecs((s) => s + 1);
      }, 1000);
    } else {
      // stop timer when leaving recording
      if (id) clearInterval(id);
    }
    return () => {
      if (id) clearInterval(id);
    };
  }, [state]);

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(1, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function handleVoiceSend() {
    setState("thinking");
  }

  function handleTranscription(text: string) {
    setTranscript(text);
  }

  async function playAssistantAudio(resp: any) {
    try {
      console.debug(
        "playAssistantAudio: response keys",
        Object.keys(resp || {})
      );
      if (resp?.audio_url) {
        try {
          const r = await fetch(resp.audio_url, { method: "GET" });
          if (r.ok) {
            const blob = await r.blob();
            const blobUrl = URL.createObjectURL(blob);
            const audio = new Audio(blobUrl);
            setState("speaking");
            audio.onended = () => {
              try {
                URL.revokeObjectURL(blobUrl);
              } catch (_) {}
              setState("idle");
            };
            audio.onerror = (e) => {
              try {
                URL.revokeObjectURL(blobUrl);
              } catch (_) {}
              setState("idle");
              console.warn("playAssistantAudio: audio playback error", e);
            };
            try {
              await audio.play();
            } catch (playErr) {
              console.warn(
                "playAssistantAudio: audio.play() rejected",
                playErr
              );
              // ensure state resets if play failed
              try {
                URL.revokeObjectURL(blobUrl);
              } catch (_) {}
              setState("idle");
            }
            return;
          }
        } catch (err) {
          try {
            const audio = new Audio(resp.audio_url);
            audio.crossOrigin = "anonymous";
            setState("speaking");
            audio.onended = () => setState("idle");
            audio.onerror = (e) => {
              setState("idle");
              console.warn(
                "playAssistantAudio: direct audio_url playback failed",
                e
              );
            };
            try {
              await audio.play();
            } catch (playErr) {
              console.warn(
                "playAssistantAudio: direct audio.play() rejected",
                playErr
              );
              setState("idle");
            }
            return;
          } catch (e) {
            console.warn(
              "playAssistantAudio: direct audio_url playback failed",
              e
            );
          }
        }
      }

      if (resp?.audio_base64) {
        try {
          const bstr = atob(resp.audio_base64);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          const blob = new Blob([u8arr], {
            type: resp.audio_mime || "audio/mpeg",
          });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          setState("speaking");
          audio.onended = () => {
            try {
              URL.revokeObjectURL(url);
            } catch (_) {}
            setState("idle");
          };
          audio.onerror = (e) => {
            try {
              URL.revokeObjectURL(url);
            } catch (_) {}
            setState("idle");
            console.warn("playAssistantAudio: base64 audio playback failed", e);
          };
          try {
            await audio.play();
          } catch (playErr) {
            console.warn(
              "playAssistantAudio: base64 audio.play() rejected",
              playErr
            );
            try {
              URL.revokeObjectURL(url);
            } catch (_) {}
            setState("idle");
          }
          return;
        } catch (e) {
          console.warn("playAssistantAudio: base64 playback failed", e);
        }
      }

      const text =
        resp?.assistant_text ||
        resp?.text ||
        resp?.response ||
        resp?.reply ||
        resp?.answer;
      if (text && window.speechSynthesis) {
        const ut = new SpeechSynthesisUtterance(text);
        setState("speaking");
        ut.onend = () => setState("idle");
        ut.onerror = () => setState("idle");
        window.speechSynthesis.speak(ut);
        return;
      }
    } catch (e) {
      console.warn("playAssistantAudio error", e);
    }
    setState("idle");
  }

  async function handleVoiceResponse(resp: any) {
    try {
      // We intentionally do not append assistant messages to the popup message list
      // because voice playback is the primary communication channel in this popup.
      // Backend response text will still be voiced via playAssistantAudio.
      await playAssistantAudio(resp || {});
    } catch (e) {
      console.error("handleVoiceResponse error", e);
    } finally {
      if (open) setState("idle");
    }
  }

  function onClickListening() {
    try {
      recorderRef.current?.stop();
    } catch (e) {
      console.warn("stop failed", e);
    }
  }

  return open ? (
    <div className="gvp-root">
      <div className="gvp-overlay" onClick={onClose} />
      <div className="gvp-card">
        <div className="gvp-header">
          <strong>Guidance Voice</strong>
          <button onClick={onClose} aria-label="Close" className="gvp-close">
            Close
          </button>
        </div>

        {/* base talking gif will be shown inside the visual area; badges overlay below */}

        <div className="gvp-body">
          <VoiceRecorder
            ref={recorderRef}
            sessionId={sessionId}
            userEmail={userEmail}
            showControls={false}
            showTimer={false}
            onVoiceSend={handleVoiceSend}
            onVoiceResponse={handleVoiceResponse}
            onTranscription={handleTranscription}
          />

          <div className="gvp-visual">
            <div className="gvp-gif-container">
              <img src="/talking.gif" alt="Assistant" className="gvp-gif-base" />

              <div className="gvp-center-icon">
                {state === 'recording' && (
                  <MicIcon className="gvp-center-svg" onClick={onClickListening} />
                )}
                {state === 'thinking' && (
                  <CloudUploadIcon className="gvp-center-svg" />
                )}
                {state === 'speaking' && (
                  <VolumeUpIcon className="gvp-center-svg" />
                )}
              </div>
              {/* timer overlay (shows while recording) */}
              {state === 'recording' && (
                <div className="gvp-timer" role="status">
                  <span className="gvp-timer-text">{formatTime(elapsedSecs)}</span>
                  <button
                    className="gvp-send-btn"
                    onClick={() => {
                      try {
                        recorderRef.current?.stop();
                      } catch (e) {
                        console.warn('send click stop failed', e);
                      }
                    }}
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>

          {transcript && (
            <div className="gvp-transcript">
              <div className="gvp-transcript-label">You said</div>
              <div className="gvp-transcript-text">{transcript}</div>
            </div>
          )}

          {/* messages list removed from popup — voice-only UI */}

          {error && <div className="gvp-error">{error}</div>}
        </div>
      </div>
    </div>
  ) : null;
}
