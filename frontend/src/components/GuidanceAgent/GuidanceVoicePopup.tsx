import React, { useEffect, useRef, useState } from "react";
import VoiceRecorder from "./VoiceRecorder";

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  userEmail?: string | null;
};

type Message = { role: "user" | "assistant"; text: string };

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        try {
          recorderRef.current?.start();
          setState("recording");
        } catch (e) {
          console.warn("Failed to start recorder on open", e);
          setError("Unable to access microphone");
        }
      }, 200);
    } else {
      try {
        recorderRef.current?.stop();
      } catch (e) {}
      setState("idle");
      setTranscript(null);
      setError(null);
    }
  }, [open]);

  const handleVoiceSend = () => setState("thinking");

  const handleTranscription = (text: string) => {
    setTranscript(text);
    setMessages((m) => [...m, { role: "user", text }]);
  };

  const playAssistantAudio = async (resp: any) => {
    try {
      console.debug(
        "playAssistantAudio: response keys",
        Object.keys(resp || {})
      );
      // Try audio_url by fetching blob first (safer for CORS)
      if (resp?.audio_url) {
        try {
          const r = await fetch(resp.audio_url, { method: "GET" });
          if (r.ok) {
            const blob = await r.blob();
            const blobUrl = URL.createObjectURL(blob);
            const audio = new Audio(blobUrl);
            setState("speaking");
            await audio.play();
            URL.revokeObjectURL(blobUrl);
            setState("idle");
            return;
          } else {
            console.debug(
              "playAssistantAudio: audio_url fetch failed",
              r.status
            );
          }
        } catch (err) {
          console.debug(
            "playAssistantAudio: audio_url fetch error, falling back to direct",
            err
          );
          try {
            const audio = new Audio(resp.audio_url);
            audio.crossOrigin = "anonymous";
            setState("speaking");
            await audio.play();
            setState("idle");
            return;
          } catch (e) {
            console.warn(
              "playAssistantAudio: direct audio_url playback failed",
              e
            );
          }
        }
      }

      // Try base64
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
          await audio.play();
          URL.revokeObjectURL(url);
          setState("idle");
          return;
        } catch (e) {
          console.warn("playAssistantAudio: base64 playback failed", e);
        }
      }

      // Try text fields - include 'response' which backend uses
      const text =
        resp?.assistant_text ||
        resp?.text ||
        resp?.response ||
        resp?.reply ||
        resp?.answer;
      if (text) {
        if (window.speechSynthesis) {
          const ut = new SpeechSynthesisUtterance(text);
          setState("speaking");
          ut.onend = () => setState("idle");
          ut.onerror = () => setState("idle");
          window.speechSynthesis.speak(ut);
          return;
        }
      }
    } catch (e) {
      console.warn("playAssistantAudio error", e);
    }
    setState("idle");
  };

  const handleVoiceResponse = async (resp: any) => {
    try {
      const assistantText =
        resp?.assistant_text ||
        resp?.text ||
        resp?.response ||
        resp?.reply ||
        resp?.answer ||
        null;
      if (assistantText)
        setMessages((m) => [...m, { role: "assistant", text: assistantText }]);
      await playAssistantAudio(resp || {});
    } catch (e) {
      console.error("handleVoiceResponse error", e);
    } finally {
      if (open) setState("idle");
    }
  };

  const onClickListening = () => {
    try {
      recorderRef.current?.stop();
    } catch (e) {
      console.warn("stop failed", e);
    }
  };

  return open ? (
    <div style={{ position: "fixed", inset: 0, zIndex: 1400 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          background: "#fff",
          borderRadius: 12,
          padding: 16,
          width: 360,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong>Guidance Voice</strong>
          <button onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
          }}
        >
          <VoiceRecorder
            ref={recorderRef}
            sessionId={sessionId}
            userEmail={userEmail}
            showControls={false}
            onVoiceSend={handleVoiceSend}
            onVoiceResponse={handleVoiceResponse}
            onTranscription={handleTranscription}
          />

          {state === "recording" && (
            <img
              src="/listening.gif"
              alt="Listening"
              style={{ width: 120, height: 120, cursor: "pointer" }}
              onClick={onClickListening}
            />
          )}
          {state === "thinking" && (
            <video
              src="/processing.mp4"
              autoPlay
              loop
              muted
              style={{ width: 140, height: 140 }}
            />
          )}
          {state === "speaking" && (
            <img
              src="/talking.gif"
              alt="Assistant speaking"
              style={{ width: 140, height: 140 }}
            />
          )}

          {transcript && (
            <div
              style={{
                width: "100%",
                background: "#f6f6f6",
                padding: 8,
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 12, color: "#666" }}>You said</div>
              <div style={{ marginTop: 6 }}>{transcript}</div>
            </div>
          )}

          <div style={{ width: "100%", maxHeight: 200, overflow: "auto" }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: "#444" }}>
                  {m.role === "user" ? "You" : "Assistant"}
                </div>
                <div style={{ marginTop: 4 }}>{m.text}</div>
              </div>
            ))}
          </div>

          {error && <div style={{ color: "red" }}>{error}</div>}
        </div>
      </div>
    </div>
  ) : null;
}
