/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  apiService,
  ChatMessage,
  ChatSession,
  fetchUserEmailFromProfile,
} from "../../services/api";
import "./ChatInterface.css";
import { useTheme } from "../../context/ThemeContext";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import MicIcon from "@mui/icons-material/Mic";
import IconButton from "@mui/material/IconButton";
import VoiceChatPopupImpl from "./GuidanceVoicePopup";

interface ChatInterfaceProps {
  sessionId?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  sessionId = "default",
}) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Create a new chat session for the user
  const handleNewChat = async () => {
    if (!currentUser) return;
    try {
      // Call API to create a new chat session with user email
      const newSession = await apiService.createNewChatSession(
        currentUser.email
      );
      // Use backend session_id directly
      setUserSpecificSessionId(newSession.session_id);
      setMessages([]);
      loadChatSessions();
    } catch (error) {
      console.error("Error creating new chat session:", error);
      setError("Failed to start a new chat.");
    }
  };
  const [inputValue, setInputValue] = useState("");
  const [guidanceFilters, setGuidanceFilters] = useState<string[]>(["all"]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userSpecificSessionId, setUserSpecificSessionId] =
    useState<string>(sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [voicePopupVisible, setVoicePopupVisible] = useState(false);
  const pendingVoiceIndexRef = useRef<number | null>(null);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Get current user email from /auth/me endpoint
  useEffect(() => {
    async function fetchUser() {
      const email = await fetchUserEmailFromProfile();
      if (email) {
        setCurrentUser({ email });
      } else {
        setCurrentUser(null);
      }
    }
    fetchUser();
    // Use backend sessionId directly
    setUserSpecificSessionId(sessionId);
  }, [sessionId, navigate]);

  const loadChatHistory = useCallback(async () => {
    if (!currentUser) return;
    try {
      const userId = currentUser.email; // Use email as user identifier
      const history = await apiService.getChatHistory(
        userSpecificSessionId,
        userId
      );
      setMessages(history.conversation_history);
    } catch (error) {
      setError("Failed to load chat history");
    }
  }, [currentUser, userSpecificSessionId]);

  const loadChatSessions = useCallback(async () => {
    if (!currentUser) return;
    try {
      setSessionsLoading(true);
      setSessionsError(null);
      const userId = currentUser.email; // Use email as user identifier
      const sessionsData = await apiService.getChatSessions(userId);
      setChatSessions(sessionsData.sessions);
    } catch (error) {
      setSessionsError("Failed to load chat sessions");
    } finally {
      setSessionsLoading(false);
    }
  }, [currentUser]);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history on component mount
  useEffect(() => {
    if (currentUser && userSpecificSessionId) {
      loadChatHistory();
      loadChatSessions();
    }
  }, [userSpecificSessionId, currentUser, loadChatHistory, loadChatSessions]);

  // const formatTimeAgo = (timestamp: string): string => {
  //   const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }));
  //   const messageTime = new Date(new Date(timestamp).toLocaleString('en-US', { timeZone: 'Asia/Colombo' }));
  //   const diffInMs = now.getTime() - messageTime.getTime();
  //   const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  //   if (diffInHours < 1) {
  //     return 'Just now';
  //   } else if (diffInHours < 24) {
  //     return `${diffInHours}h ago`;
  //   } else {
  //     const diffInDays = Math.floor(diffInHours / 24);
  //     return `${diffInDays}d ago`;
  //   }
  // };

  const formatMessage = (content: string): JSX.Element => {
    // Split content into paragraphs
    const paragraphs = content.split("\n\n").filter((p) => p.trim() !== "");
    return (
      <div className="formatted-message">
        {paragraphs.map((paragraph, index) => {
          // Check if paragraph is a numbered list item (e.g., "1. **Sources**:")
          const numberedListMatch = paragraph.match(
            /^(\d+)\.\s*\*\*(.*?)\*\*:\s*([\s\S]*)/
          );
          if (numberedListMatch) {
            const [, number, title, content] = numberedListMatch;
            return (
              <div key={index} className="message-section">
                <div className="section-header">
                  <span className="section-number">{number}.</span>
                  <span className="section-title">{title}</span>
                </div>
                <div className="section-content">{content.trim()}</div>
              </div>
            );
          }

          // Check if paragraph starts with ** (bold heading)
          const boldHeadingMatch = paragraph.match(
            /^\*\*(.*?)\*\*:\s*([\s\S]*)/
          );
          if (boldHeadingMatch) {
            const [, title, content] = boldHeadingMatch;
            return (
              <div key={index} className="message-section">
                <div className="section-title-only">{title}</div>
                <div className="section-content">{content.trim()}</div>
              </div>
            );
          }

          // Regular paragraph with inline formatting
          const formattedText = paragraph
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold text
            .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic text
            .replace(/`(.*?)`/g, "<code>$1</code>"); // Code text

          return (
            <div
              key={index}
              className="message-paragraph"
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />
          );
        })}
      </div>
    );
  };

  // Play assistant audio (try server-provided audio_url / audio_base64, fallback to browser TTS)
  const playAudioFromUrl = (url: string) =>
    new Promise<void>(async (resolve, reject) => {
      try {
        console.debug("playAudioFromUrl: trying to fetch audio URL", url);
        // First try fetching the URL as a blob (safer for CORS and to detect errors)
        try {
          const resp = await fetch(url, { method: "GET" });
          if (resp.ok) {
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const audio = new Audio(blobUrl);
            audio.onended = () => {
              URL.revokeObjectURL(blobUrl);
              resolve();
            };
            audio.onerror = (e) => {
              URL.revokeObjectURL(blobUrl);
              reject(e);
            };
            const p = audio.play();
            if (p && typeof p.then === "function") p.catch(reject);
            return;
          } else {
            console.debug(
              "playAudioFromUrl: fetch returned non-ok",
              resp.status
            );
          }
        } catch (fetchErr) {
          console.debug(
            "playAudioFromUrl: fetch failed, will try direct playback",
            fetchErr
          );
        }

        // Fallback: try direct playback from URL (may fail due to CORS/autoplay)
        const audio = new Audio(url);
        audio.crossOrigin = "anonymous";
        audio.onended = () => resolve();
        audio.onerror = (e) => reject(e);
        const p = audio.play();
        if (p && typeof p.then === "function") p.catch(reject);
      } catch (e) {
        reject(e);
      }
    });

  const playAudioFromBase64 = (base64: string, mime = "audio/mpeg") =>
    new Promise<void>((resolve, reject) => {
      try {
        console.debug("playAudioFromBase64: playing base64 audio, mime=", mime);
        const bstr = atob(base64);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        const blob = new Blob([u8arr], { type: mime });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = (e) => reject(e);
        const p = audio.play();
        if (p && typeof p.then === "function") p.catch(reject);
      } catch (e) {
        reject(e);
      }
    });

  const speakText = (text: string) =>
    new Promise<void>((resolve) => {
      try {
        if (!window.speechSynthesis) return resolve();
        const ut = new SpeechSynthesisUtterance(text);
        ut.onend = () => resolve();
        ut.onerror = () => resolve();
        window.speechSynthesis.speak(ut);
      } catch (e) {
        resolve();
      }
    });

  const playAssistantMedia = async (respOrText: any) => {
    try {
      setIsPlayingAudio(true);
      // If caller passed a simple string, speak it
      if (typeof respOrText === "string") {
        console.debug("playAssistantMedia: speaking string");
        await speakText(respOrText);
        return;
      }

      // Try structured response fields
      if (respOrText?.audio_url) {
        console.debug(
          "playAssistantMedia: found audio_url",
          respOrText.audio_url
        );
        try {
          await playAudioFromUrl(respOrText.audio_url);
          return;
        } catch (err) {
          console.warn(
            "playAssistantMedia: audio_url playback failed, falling back",
            err
          );
        }
      }
      if (respOrText?.audio_base64) {
        console.debug(
          "playAssistantMedia: found audio_base64 (len)",
          (respOrText.audio_base64 || "").length
        );
        try {
          // try to detect mime if provided, else default
          const mime =
            respOrText.audio_mime || respOrText.audioType || "audio/mpeg";
          await playAudioFromBase64(respOrText.audio_base64, mime);
          return;
        } catch (err) {
          console.warn(
            "playAssistantMedia: audio_base64 playback failed, falling back",
            err
          );
        }
      }

      const t =
        respOrText?.response ||
        respOrText?.assistant_text ||
        respOrText?.text ||
        "";
      if (t) {
        console.debug(
          "playAssistantMedia: falling back to TTS",
          t.slice(0, 80)
        );
        await speakText(t);
      } else {
        console.debug(
          "playAssistantMedia: no audio or text available to speak"
        );
      }
    } catch (e) {
      // swallow playback errors — keep app responsive
      // console.warn('assistant playback failed', e);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !currentUser) return;
    await sendText(inputValue.trim());
  };

  // Shared send logic for text (used by keyboard send and by voice transcription)
  // Shared send logic for text (used by keyboard send and by voice transcription)
  // options: skipLocal -> don't add the user message to UI (used when UI already has a placeholder)
  // force -> bypass current isLoading guard (used when upload already set loading)
  const sendText = async (
    text: string,
    options?: { skipLocal?: boolean; force?: boolean }
  ) => {
    const skipLocal = options?.skipLocal || false;
    const force = options?.force || false;
    if (!text || (!force && isLoading) || !currentUser) return;
    const userMessage = text;
    // Clear input field if this was typed
    setInputValue((prev) => (prev === text ? "" : prev));
    setIsLoading(true);
    setError(null);

    // Add user message to UI immediately unless caller provided a placeholder
    if (!skipLocal) {
      const newUserMessage: ChatMessage = {
        role: "user",
        content: userMessage,
      };
      setMessages((prev) => [...prev, newUserMessage]);
    }

    try {
      const guidanceToSend =
        !guidanceFilters ||
        guidanceFilters.length === 0 ||
        guidanceFilters.includes("all")
          ? "all"
          : guidanceFilters.join(",");

      let outgoingMessage = userMessage;
      if (guidanceToSend !== "all") {
        const readable = guidanceFilters
          .map((f) => {
            if (f === "student_handbook") return "Student handbook";
            if (f === "exam_manual") return "Exam manual";
            if (f === "by_law") return "By-law";
            return f;
          })
          .join(", ");
        outgoingMessage = `${userMessage}\n\n[Search only in: ${readable}]`;
      }

      const response = await apiService.sendMessage(
        outgoingMessage,
        userSpecificSessionId,
        guidanceToSend
      );
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      // Speak the assistant response (try server audio then fallback to TTS)
      (async () => {
        try {
          await playAssistantMedia(response);
        } catch (e) {
          console.warn("assistant playback error", e);
        }
      })();
      loadChatSessions();
      setGuidanceFilters(["all"]);
    } catch (error) {
      setError("Failed to send message. Please try again.");
      if (!options?.skipLocal) setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const SOURCE_OPTIONS = [
    { key: "all", label: "All" },
    { key: "student_handbook", label: "Student handbook" },
    { key: "exam_manual", label: "Exam manual" },
    { key: "by_law", label: "By-law" },
  ];

  const toggleFilter = (key: string) => {
    if (key === "all") {
      setGuidanceFilters(["all"]);
      return;
    }
    setGuidanceFilters((prev) => {
      const setPrev = new Set(prev.filter((p) => p !== "all"));
      if (setPrev.has(key)) {
        setPrev.delete(key);
      } else {
        setPrev.add(key);
      }
      const arr = Array.from(setPrev);
      return arr.length === 0 ? ["all"] : arr;
    });
  };

  // const clearChat = async () => {
  //   if (!currentUser) return;
  //   try {
  //     const userId = currentUser.email; // Use email as user identifier
  //     console.log('[FRONTEND] Sending userId for clearChat:', userId);
  //     await apiService.clearChat(userSpecificSessionId, userId);
  //     setMessages([]);
  //     setError(null);
  //     // Refresh chat sessions to update metadata
  //     loadChatSessions();
  //   } catch (error) {
  //     console.error('Error clearing chat:', error);
  //     setError('Failed to clear chat');
  //   }
  // };

  const handleFeedback = async (
    messageIndex: number,
    feedbackType: "like" | "dislike"
  ) => {
    if (!currentUser) return;
    try {
      const userId = currentUser.email; // Use email as user identifier
      await apiService.sendFeedback(
        userSpecificSessionId,
        messageIndex,
        feedbackType,
        userId
      );
      // You could add UI feedback here, like showing a success message
      // console.log(`Feedback sent: ${feedbackType} for message ${messageIndex}`);
    } catch (error) {
      // console.error('Error sending feedback:', error);
    }
  };

  // Called by VoiceRecorder when a raw transcription string is available
  const handleVoiceTranscription = (text: string) => {
    // Voice transcription is handled by the upload->GET->handleVoiceResponse flow.
    // Do not write the transcription into the textarea; voice messages should
    // appear directly as a user bubble instead.
    return;
  };

  // Called when upload starts — insert a pending user bubble
  const handleVoiceSend = () => {
    const placeholder: ChatMessage = {
      role: "user",
      content: "Sending voice...",
    };
    setMessages((prev) => {
      const next = [...prev, placeholder];
      pendingVoiceIndexRef.current = next.length - 1;
      return next;
    });
    // mark upload in progress; do not set assistant loading yet
    setVoiceUploading(true);
  };

  // Called when backend returns full response for voice upload
  const handleVoiceResponse = (resp: any) => {
    // Extract transcript
    let transcript =
      resp?.transcript ||
      resp?.text ||
      resp?.transcription ||
      resp?.result ||
      "";
    if (!transcript && resp?.conversation_history) {
      const ch = resp.conversation_history as any[];
      for (let i = ch.length - 1; i >= 0; i--) {
        if (ch[i]?.role === "user" && ch[i]?.content) {
          transcript = ch[i].content;
          break;
        }
      }
    }

    const assistantText = resp?.response || "";

    // If server already returned an assistant response, apply both user and assistant
    if (assistantText) {
      setMessages((prev) => {
        const next = [...prev];
        const idx = pendingVoiceIndexRef.current;
        if (idx !== null && idx >= 0 && idx < next.length) {
          next[idx] = { role: "user", content: transcript || "(voice)" };
        } else {
          next.push({ role: "user", content: transcript || "(voice)" });
        }
        // Append assistant reply
        next.push({ role: "assistant", content: assistantText });
        return next;
      });
      // Play assistant audio / TTS and show talking.gif while speaking
      (async () => {
        try {
          setIsPlayingAudio(true);
          // try audio_url
          if (resp?.audio_url) {
            const audio = new Audio(resp.audio_url);
            await audio.play();
          } else if (resp?.audio_base64) {
            const bstr = atob(resp.audio_base64);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) u8arr[n] = bstr.charCodeAt(n);
            const blob = new Blob([u8arr], { type: "audio/mpeg" });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            await audio.play();
            URL.revokeObjectURL(url);
          } else if (resp?.response || resp?.assistant_text || resp?.text) {
            const t = resp?.response || resp?.assistant_text || resp?.text;
            if (window.speechSynthesis) {
              await new Promise<void>((resolve) => {
                const ut = new SpeechSynthesisUtterance(t);
                ut.onend = () => resolve();
                window.speechSynthesis.speak(ut);
              });
            }
          }
        } catch (e) {
          console.warn("play assistant audio failed", e);
        } finally {
          setIsPlayingAudio(false);
        }
      })();
      // clear pending marker and loading
      pendingVoiceIndexRef.current = null;
      setVoiceUploading(false);
      setIsLoading(false);
      // Refresh sessions metadata
      loadChatSessions();
    } else if (transcript) {
      // No assistant reply yet: replace the pending user bubble with the transcript
      setMessages((prev) => {
        const next = [...prev];
        const idx = pendingVoiceIndexRef.current;
        if (idx !== null && idx >= 0 && idx < next.length) {
          next[idx] = { role: "user", content: transcript };
        } else {
          next.push({ role: "user", content: transcript });
        }
        return next;
      });
      // clear pending marker and mark upload done
      pendingVoiceIndexRef.current = null;
      setVoiceUploading(false);
      // Now route the transcript through the regular sendText flow (skip adding local user msg)
      // Use the new /chat/route endpoint which routes the latest persisted user
      // message (saved by /chat/voice) through the agent without inserting
      // another duplicate user message.
      (async () => {
        try {
          setIsLoading(true);
          const userId = currentUser?.email;
          const resp = await apiService.routeLatest(
            userSpecificSessionId,
            userId
          );
          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: resp.response,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          // Speak the assistant response from routed voice
          try {
            await playAssistantMedia(resp);
          } catch (e) {
            console.warn("assistant playback error (routed)", e);
          }
          loadChatSessions();
        } catch (e) {
          setError("Failed to route voice message to agent");
        } finally {
          setIsLoading(false);
        }
      })();
    } else {
      // no transcript and no assistant reply: show error and clean up
      setMessages((prev) =>
        prev.filter((_, i) => i !== pendingVoiceIndexRef.current)
      );
      pendingVoiceIndexRef.current = null;
      setVoiceUploading(false);
      setError("No transcription returned from server");
    }
  };

  return (
    <div
      className={`chat-interface ${
        theme === "dark" ? "dark-theme" : "light-theme"
      }`}
    >
      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              Welcome! I'm your Guidance Agent. How can I assist you today?
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-container">
                {message.role === "assistant" && (
                  <div className="message-avatar">
                    <img
                      src="/openai.png"
                      alt="AI Assistant"
                      className="avatar-image"
                      onError={(e) => {
                        console.error("Failed to load OpenAI image");
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div className="message-content">
                  <div className="message-text">
                    {message.role === "assistant" ? (
                      formatMessage(message.content)
                    ) : // If this is the pending voice upload bubble, show a small loading spinner there as well
                    index === pendingVoiceIndexRef.current ? (
                      <span className="pending-voice">
                        <span className="pending-spinner" aria-hidden="true">
                          <span></span>
                          <span></span>
                          <span></span>
                        </span>
                        {/* <span style={{ marginLeft: 8 }}>Sending voice...</span> */}
                      </span>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
                {message.role === "user" && (
                  <div className="message-avatar">
                    <img
                      src="/ai_rt.png"
                      alt="User"
                      className="avatar-image"
                      onError={(e) => {
                        console.error("Failed to load AI_RT image");
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
              {message.role === "assistant" && (
                <div className="message-actions">
                  <button
                    onClick={() => handleFeedback(index, "like")}
                    className="feedback-btn like-btn"
                    title="Like this response"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleFeedback(index, "dislike")}
                    className="feedback-btn dislike-btn"
                    title="Dislike this response"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H6.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="message assistant">
              <div className="message-container">
                <div className="message-avatar">
                  <img
                    src="/openai.png"
                    alt="AI Assistant"
                    className="avatar-image"
                    onError={(e) => {
                      console.error("Failed to load OpenAI image");
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="chat-input-container">
          <div className="input-wrapper">
            {/* Guidance source filter - small horizontal buttons inside input area */}
            <div
              className="filter-row"
              role="toolbar"
              aria-label="Guidance source filters"
            >
              {SOURCE_OPTIONS.map((opt) => {
                const selected =
                  guidanceFilters.includes(opt.key) ||
                  (opt.key === "all" && guidanceFilters.length === 0);
                return (
                  <button
                    key={opt.key}
                    className={`filter-btn ${selected ? "selected" : ""}`}
                    onClick={() => toggleFilter(opt.key)}
                    aria-pressed={selected}
                    type="button"
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="chat-input"
              rows={3}
              disabled={isLoading}
            />
            <div className="input-buttons">
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="input-btn send-btn"
                title="Send message"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22,2 15,22 11,13 2,9 22,2" />
                </svg>
              </button>

              {/* Show processing video while uploading, talking.gif while assistant speaks, otherwise mic button */}
              {voiceUploading ? (
                <video
                  src="/processing.mp4"
                  autoPlay
                  loop
                  muted
                  style={{ width: 40, height: 40, borderRadius: 6 }}
                />
              ) : isPlayingAudio ? (
                <img
                  src="/talking.gif"
                  alt="Assistant speaking"
                  style={{ width: 40, height: 40 }}
                />
              ) : (
                <IconButton
                  aria-label={"Open voice popup"}
                  onClick={() => setVoicePopupVisible(true)}
                  title={"Open voice assistant"}
                >
                  <MicIcon />
                </IconButton>
              )}

              <button
                onClick={handleNewChat}
                className="input-btn new-chat-btn"
                title="Start a new chat"
              >
                <LibraryAddIcon />
              </button>
            </div>
          </div>
        </div>
        <VoiceChatPopupImpl
          open={voicePopupVisible}
          sessionId={userSpecificSessionId}
          userEmail={currentUser?.email}
          onClose={() => {
            // close popup and refresh chat history
            setVoicePopupVisible(false);
            if (currentUser && userSpecificSessionId) loadChatHistory();
          }}
        />
      </div>

      <div className="sidebar">
        <div className="chat-history-section">
          <h3>Chat History</h3>
          <div className="chat-history-list">
            {sessionsLoading ? (
              <div className="chat-history-loading">
                Loading chat history...
              </div>
            ) : sessionsError ? (
              <div className="chat-history-error">
                {sessionsError}
                <button onClick={loadChatSessions} className="retry-btn">
                  Retry
                </button>
              </div>
            ) : chatSessions.length === 0 ? (
              <div className="chat-history-empty">
                No chat history yet. Start a conversation!
              </div>
            ) : (
              [...chatSessions].map((session) => (
                <div
                  key={session.session_id}
                  className={`chat-history-item ${
                    session.session_id === userSpecificSessionId ? "active" : ""
                  }`}
                  onClick={() => {
                    if (session.session_id !== userSpecificSessionId) {
                      setUserSpecificSessionId(session.session_id);
                      setMessages([]);
                      // Chat history will reload automatically via useEffect
                    }
                  }}
                >
                  <div className="chat-title">
                    {session.topic.split(" ").slice(0, 4).join(" ")}
                    {session.topic.split(" ").length > 4 ? "..." : ""}
                  </div>
                  <button
                    className="delete-btn"
                    title="Delete this chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      // open in-app confirmation modal
                      setConfirmTarget(session);
                      setConfirmOpen(true);
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Confirmation modal for delete action rendered via portal to avoid stacking issues */}
      {confirmOpen &&
        confirmTarget &&
        createPortal(
          <div className="confirm-overlay" role="dialog" aria-modal="true">
            <div className="confirm-modal" role="document">
              <div className="confirm-title">Delete Chat</div>
              <div className="confirm-body">
                Are you sure you want to delete this chat session? This action
                cannot be undone.
              </div>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="confirm-btn"
                  onClick={() => {
                    setConfirmOpen(false);
                    setConfirmTarget(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="confirm-btn confirm-delete"
                  onClick={async () => {
                    if (!currentUser || !confirmTarget) return;
                    try {
                      await apiService.clearChat(
                        confirmTarget.session_id,
                        currentUser.email
                      );
                      await loadChatSessions();
                      if (confirmTarget.session_id === userSpecificSessionId) {
                        setUserSpecificSessionId("default");
                        setMessages([]);
                      }
                    } catch (err) {
                      console.error("Failed to delete session", err);
                      setSessionsError("Failed to delete chat session");
                    } finally {
                      setConfirmOpen(false);
                      setConfirmTarget(null);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ChatInterface;

// ////////////////////////////////////////////////////////////////////////////////////////

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   apiService,
//   ChatMessage,
//   ChatSession,
//   fetchUserEmailFromProfile,
// } from "../../services/api";
// import "./ChatInterface.css";
// import { useTheme } from "../../context/ThemeContext";
// import LibraryAddIcon from "@mui/icons-material/LibraryAdd";

// interface ChatInterfaceProps {
//   sessionId?: string;
// }

// const ChatInterface: React.FC<ChatInterfaceProps> = ({
//   sessionId = "default",
// }) => {
//   const navigate = useNavigate();
//   const [messages, setMessages] = useState<ChatMessage[]>([]);

//   // ✅ UPDATED: Removed old voice recognition, added file upload recorder
//   const [isRecording, setIsRecording] = useState(false);
//   const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
//     null
//   );
//   const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

//   const handleNewChat = async () => {
//     if (!currentUser) return;
//     try {
//       const newSession = await apiService.createNewChatSession(
//         currentUser.email
//       );
//       setUserSpecificSessionId(newSession.session_id);
//       setMessages([]);
//       loadChatSessions();
//     } catch (error) {
//       console.error("Error creating new chat session:", error);
//       setError("Failed to start a new chat.");
//     }
//   };

//   const [inputValue, setInputValue] = useState("");
//   const [guidanceFilters, setGuidanceFilters] = useState<string[]>(["all"]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const { theme } = useTheme();
//   const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
//   const [sessionsLoading, setSessionsLoading] = useState(true);
//   const [sessionsError, setSessionsError] = useState<string | null>(null);
//   const [currentUser, setCurrentUser] = useState<any>(null);
//   const [userSpecificSessionId, setUserSpecificSessionId] =
//     useState<string>(sessionId);

//   const messagesEndRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     async function fetchUser() {
//       const email = await fetchUserEmailFromProfile();
//       if (email) {
//         setCurrentUser({ email });
//       } else {
//         setCurrentUser(null);
//       }
//     }
//     fetchUser();
//     setUserSpecificSessionId(sessionId);
//   }, [sessionId, navigate]);

//   const loadChatHistory = useCallback(async () => {
//     if (!currentUser) return;
//     try {
//       const userId = currentUser.email;
//       const history = await apiService.getChatHistory(
//         userSpecificSessionId,
//         userId
//       );
//       setMessages(history.conversation_history);
//     } catch (error) {
//       setError("Failed to load chat history");
//     }
//   }, [currentUser, userSpecificSessionId]);

//   const loadChatSessions = useCallback(async () => {
//     if (!currentUser) return;
//     try {
//       setSessionsLoading(true);
//       setSessionsError(null);
//       const userId = currentUser.email;
//       const sessionsData = await apiService.getChatSessions(userId);
//       setChatSessions(sessionsData.sessions);
//     } catch (error) {
//       setSessionsError("Failed to load chat sessions");
//     } finally {
//       setSessionsLoading(false);
//     }
//   }, [currentUser]);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   // 🔥 NEW CODE: Voice recording using MediaRecorder
//   const startRecording = async () => {
//     if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//       alert("Audio recording is not supported in this browser.");
//       return;
//     }

//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       const recorder = new MediaRecorder(stream);
//       const chunks: Blob[] = [];

//       recorder.ondataavailable = (e) => {
//         if (e.data.size > 0) chunks.push(e.data);
//       };

//       recorder.onstop = async () => {
//         const audioBlob = new Blob(chunks, { type: "audio/wav" });
//         setAudioChunks([]);
//         setIsRecording(false);

//         // 🔥 Upload to backend /voice-to-text
//         try {
//           const formData = new FormData();
//           formData.append("file", audioBlob, "voice.wav");
//           const transcriptResponse = await apiService.voiceToText(formData);
//           const transcriptText = transcriptResponse.transcript;
//           setInputValue((prev) => (prev ? prev + " " : "") + transcriptText);
//         } catch (err) {
//           console.error("Voice to text failed", err);
//         }
//       };

//       recorder.start();
//       setMediaRecorder(recorder);
//       setAudioChunks(chunks);
//       setIsRecording(true);
//     } catch (err) {
//       console.error("Failed to start recording:", err);
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorder && mediaRecorder.state !== "inactive") {
//       mediaRecorder.stop();
//     }
//   };

//   const toggleRecording = () => {
//     if (isRecording) {
//       stopRecording();
//     } else {
//       startRecording();
//     }
//   };
//   // ✅ END NEW VOICE CODE

//   useEffect(() => {
//     if (currentUser && userSpecificSessionId) {
//       loadChatHistory();
//       loadChatSessions();
//     }
//   }, [userSpecificSessionId, currentUser, loadChatHistory, loadChatSessions]);

//   const formatMessage = (content: string): JSX.Element => {
//     const paragraphs = content.split("\n\n").filter((p) => p.trim() !== "");
//     return (
//       <div className="formatted-message">
//         {paragraphs.map((paragraph, index) => {
//           const numberedListMatch = paragraph.match(
//             /^(\d+)\.\s*\*\*(.*?)\*\*:\s*([\s\S]*)/
//           );
//           if (numberedListMatch) {
//             const [, number, title, content] = numberedListMatch;
//             return (
//               <div key={index} className="message-section">
//                 <div className="section-header">
//                   <span className="section-number">{number}.</span>
//                   <span className="section-title">{title}</span>
//                 </div>
//                 <div className="section-content">{content.trim()}</div>
//               </div>
//             );
//           }

//           const boldHeadingMatch = paragraph.match(/^\*\*(.*?)\*\*:\s*([\s\S]*)/);
//           if (boldHeadingMatch) {
//             const [, title, content] = boldHeadingMatch;
//             return (
//               <div key={index} className="message-section">
//                 <div className="section-title-only">{title}</div>
//                 <div className="section-content">{content.trim()}</div>
//               </div>
//             );
//           }

//           const formattedText = paragraph
//             .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
//             .replace(/\*(.*?)\*/g, "<em>$1</em>")
//             .replace(/`(.*?)`/g, "<code>$1</code>");

//           return (
//             <div
//               key={index}
//               className="message-paragraph"
//               dangerouslySetInnerHTML={{ __html: formattedText }}
//             />
//           );
//         })}
//       </div>
//     );
//   };

//   const sendMessage = async () => {
//     if (!inputValue.trim() || isLoading || !currentUser) return;

//     const userMessage = inputValue.trim();
//     setInputValue("");
//     setIsLoading(true);
//     setError(null);

//     const newUserMessage: ChatMessage = { role: "user", content: userMessage };
//     setMessages((prev) => [...prev, newUserMessage]);

//     try {
//       const guidanceToSend =
//         !guidanceFilters || guidanceFilters.length === 0 || guidanceFilters.includes("all")
//           ? "all"
//           : guidanceFilters.join(",");

//       let outgoingMessage = userMessage;
//       if (guidanceToSend !== "all") {
//         const readable = guidanceFilters
//           .map((f) => {
//             if (f === "student_handbook") return "Student handbook";
//             if (f === "exam_manual") return "Exam manual";
//             if (f === "by_law") return "By-law";
//             return f;
//           })
//           .join(", ");
//         outgoingMessage = `${userMessage}\n\n[Search only in: ${readable}]`;
//       }

//       const response = await apiService.sendMessage(
//         outgoingMessage,
//         userSpecificSessionId,
//         guidanceToSend
//       );
//       const assistantMessage: ChatMessage = {
//         role: "assistant",
//         content: response.response,
//       };
//       setMessages((prev) => [...prev, assistantMessage]);
//       loadChatSessions();
//       setGuidanceFilters(["all"]);
//     } catch (error) {
//       setError("Failed to send message. Please try again.");
//       setMessages((prev) => prev.slice(0, -1));
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       sendMessage();
//     }
//   };

//   const SOURCE_OPTIONS = [
//     { key: "all", label: "All" },
//     { key: "student_handbook", label: "Student handbook" },
//     { key: "exam_manual", label: "Exam manual" },
//     { key: "by_law", label: "By-law" },
//   ];

//   const toggleFilter = (key: string) => {
//     if (key === "all") {
//       setGuidanceFilters(["all"]);
//       return;
//     }
//     setGuidanceFilters((prev) => {
//       const setPrev = new Set(prev.filter((p) => p !== "all"));
//       if (setPrev.has(key)) {
//         setPrev.delete(key);
//       } else {
//         setPrev.add(key);
//       }
//       const arr = Array.from(setPrev);
//       return arr.length === 0 ? ["all"] : arr;
//     });
//   };

//   const handleFeedback = async (
//     messageIndex: number,
//     feedbackType: "like" | "dislike"
//   ) => {
//     if (!currentUser) return;
//     try {
//       const userId = currentUser.email;
//       await apiService.sendFeedback(
//         userSpecificSessionId,
//         messageIndex,
//         feedbackType,
//         userId
//       );
//     } catch (error) {}
//   };

//   return (
//     <div
//       className={`chat-interface ${
//         theme === "dark" ? "dark-theme" : "light-theme"
//       }`}
//     >
//       <div className="chat-container">
//         <div className="chat-messages">
//           {messages.length === 0 && (
//             <div className="welcome-message">
//               Welcome! I'm your Guidance Agent. How can I assist you today?
//             </div>
//           )}

//           {messages.map((message, index) => (
//             <div key={index} className={`message ${message.role}`}>
//               <div className="message-container">
//                 {message.role === "assistant" && (
//                   <div className="message-avatar">
//                     <img
//                       src="/openai.png"
//                       alt="AI Assistant"
//                       className="avatar-image"
//                       onError={(e) => {
//                         e.currentTarget.style.display = "none";
//                       }}
//                     />
//                   </div>
//                 )}
//                 <div className="message-content">
//                   <div className="message-text">
//                     {message.role === "assistant"
//                       ? formatMessage(message.content)
//                       : message.content}
//                   </div>
//                 </div>
//                 {message.role === "user" && (
//                   <div className="message-avatar">
//                     <img
//                       src="/ai_rt.png"
//                       alt="User"
//                       className="avatar-image"
//                       onError={(e) => {
//                         e.currentTarget.style.display = "none";
//                       }}
//                     />
//                   </div>
//                 )}
//               </div>
//               {message.role === "assistant" && (
//                 <div className="message-actions">
//                   <button
//                     onClick={() => handleFeedback(index, "like")}
//                     className="feedback-btn like-btn"
//                     title="Like this response"
//                   >
//                     👍
//                   </button>
//                   <button
//                     onClick={() => handleFeedback(index, "dislike")}
//                     className="feedback-btn dislike-btn"
//                     title="Dislike this response"
//                   >
//                     👎
//                   </button>
//                 </div>
//               )}
//             </div>
//           ))}

//           {isLoading && (
//             <div className="message assistant">
//               <div className="message-container">
//                 <div className="message-avatar">
//                   <img src="/openai.png" alt="AI Assistant" className="avatar-image" />
//                 </div>
//                 <div className="message-content">
//                   <div className="typing-indicator">
//                     <span></span>
//                     <span></span>
//                     <span></span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           <div ref={messagesEndRef} />
//         </div>

//         {error && <div className="error-message">{error}</div>}

//         <div className="chat-input-container">
//           <div className="input-wrapper">
//             <div className="filter-row">
//               {SOURCE_OPTIONS.map((opt) => {
//                 const selected =
//                   guidanceFilters.includes(opt.key) ||
//                   (opt.key === "all" && guidanceFilters.length === 0);
//                 return (
//                   <button
//                     key={opt.key}
//                     className={`filter-btn ${selected ? "selected" : ""}`}
//                     onClick={() => toggleFilter(opt.key)}
//                   >
//                     {opt.label}
//                   </button>
//                 );
//               })}
//             </div>

//             <textarea
//               value={inputValue}
//               onChange={(e) => setInputValue(e.target.value)}
//               onKeyPress={handleKeyPress}
//               placeholder="Type a message..."
//               className="chat-input"
//               rows={3}
//               disabled={isLoading}
//             />

//             <div className="input-buttons">
//               {/* 🔥 NEW CODE: voice recorder button */}
//               <button
//                 onClick={toggleRecording}
//                 className={`input-btn mic-btn ${isRecording ? "recording" : ""}`}
//                 title={isRecording ? "Stop Recording" : "Start Voice Input"}
//               >
//                 {isRecording ? (
//                   <svg width="20" height="20" viewBox="0 0 24 24" fill="red">
//                     <circle cx="12" cy="12" r="6" />
//                   </svg>
//                 ) : (
//                   <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor">
//                     <path d="M12 1a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
//                     <path d="M19 10a7 7 0 0 1-14 0" />
//                     <path d="M12 17v6" />
//                     <path d="M8 23h8" />
//                   </svg>
//                 )}
//               </button>

//               <button
//                 onClick={sendMessage}
//                 disabled={isLoading || !inputValue.trim()}
//                 className="input-btn send-btn"
//               >
//                 Send
//               </button>

//               <button
//                 onClick={handleNewChat}
//                 className="input-btn new-chat-btn"
//                 title="Start a new chat"
//               >
//                 <LibraryAddIcon />
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="sidebar">
//         <div className="chat-history-section">
//           <h3>Chat History</h3>
//           <div className="chat-history-list">
//             {sessionsLoading ? (
//               <div>Loading chat history...</div>
//             ) : sessionsError ? (
//               <div>
//                 {sessionsError}
//                 <button onClick={loadChatSessions}>Retry</button>
//               </div>
//             ) : chatSessions.length === 0 ? (
//               <div>No chat history yet. Start a conversation!</div>
//             ) : (
//               chatSessions.map((session) => (
//                 <div
//                   key={session.session_id}
//                   className={`chat-history-item ${
//                     session.session_id === userSpecificSessionId ? "active" : ""
//                   }`}
//                   onClick={() => {
//                     if (session.session_id !== userSpecificSessionId) {
//                       setUserSpecificSessionId(session.session_id);
//                       setMessages([]);
//                     }
//                   }}
//                 >
//                   <div className="chat-title">
//                     {session.topic.split(" ").slice(0, 4).join(" ")}
//                     {session.topic.split(" ").length > 4 ? "..." : ""}
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ChatInterface;
