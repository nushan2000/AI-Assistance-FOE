// Utility to fetch user email from profile API
import { getAccessToken } from "./authAPI";
export async function fetchUserEmailFromProfile(): Promise<string | null> {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const response = await fetch("http://localhost:5000/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.email || null;
  } catch (e) {
    return null;
  }
}

// Helper to update access token from response headers (if present)
function updateAccessTokenFromResponse(response: Response) {
  const newToken = response.headers.get("x-access-token");
  if (newToken) {
    localStorage.setItem("auth_token", newToken);
  }
}

// Centralized handler for auth errors. If the backend returns 401 or 403
// dispatch a global event so the app can react (show login, clear state).
function handleAuthError(response: Response) {
  if (response.status === 401 || response.status === 403) {
    try {
      localStorage.removeItem("auth_token");
    } catch (e) {
      // ignore
    }
    // Dispatch a cross-window/custom event so React can listen and react.
    try {
      const ev = new CustomEvent("auth:logout", {
        detail: { status: response.status },
      });
      window.dispatchEvent(ev);
    } catch (e) {
      // older browsers may not support CustomEvent constructor in some contexts
      const event = document.createEvent("CustomEvent");
      event.initCustomEvent("auth:logout", true, true, {
        status: response.status,
      });
      window.dispatchEvent(event);
    }
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  user_id?: string;
}

export interface ChatResponse {
  response: string;
  conversation_history: ChatMessage[];
  session_id: string;
}

export interface FeedbackRequest {
  session_id: string;
  message_index: number;
  feedback_type: "like" | "dislike";
  user_id?: string;
}

export interface ChatSession {
  session_id: string;
  topic: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionsResponse {
  sessions: ChatSession[];
  total_count: number;
}

class ApiService {
  // Example: include user email in chat requests automatically
  async sendMessage(
    message: string,
    sessionId: string = "default",
    guidanceFilter?: string
  ): Promise<ChatResponse> {
    const userEmail = await fetchUserEmailFromProfile();
    const postBody: any = {
      message,
      session_id: sessionId,
      user_id: userEmail,
    };
    if (guidanceFilter) {
      postBody.guidance_filter = guidanceFilter;
    }

    try {
      const response = await fetch(`${this.baseUrl}/ruh/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify(postBody),
      });
      updateAccessTokenFromResponse(response);
      handleAuthError(response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  // // ================= NEW METHOD FOR VOICE =================
  // // Option B: Voice to text using backend endpoint
  // async voiceToText(formData: FormData): Promise<{ transcript: string }> {
  //   try {
  //     const response = await fetch(`${this.baseUrl}/chat/voice`, {
  //       method: "POST",
  //       body: formData, // send as FormData
  //       // Authorization header included if your backend requires auth
  //       headers: {
  //         Authorization: `Bearer ${getAccessToken()}`,
  //       },
  //     });

  //     updateAccessTokenFromResponse(response);
  //     handleAuthError(response);

  //     if (!response.ok) {
  //       throw new Error(`Voice to text request failed with status ${response.status}`);
  //     }

  //     // Backend should return { transcript: "recognized text" }
  //     return await response.json();
  //   } catch (error) {
  //     console.error("voiceToText error:", error);
  //     throw error;
  //   }
  // }

  // Create a new chat session for the user
  async createNewChatSession(
    userId?: string
  ): Promise<{ session_id: string; topic?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });
      updateAccessTokenFromResponse(response);
      handleAuthError(response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error creating new chat session:", error);
      throw error;
    }
  }
  private baseUrl: string;

  constructor() {
    // Prefer `REACT_APP_API_BASE` (used elsewhere) but fall back to older name or localhost
    this.baseUrl =
      (process.env.REACT_APP_API_BASE as string) ||
      (process.env.REACT_APP_API_URL as string) ||
      "http://localhost:9000";
  }

  // Send feedback for a message
  async sendFeedback(
    sessionId: string,
    messageIndex: number,
    feedbackType: "like" | "dislike",
    userId?: string
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          message_index: messageIndex,
          feedback_type: feedbackType,
          user_id: userId,
        }),
      });
      updateAccessTokenFromResponse(response);
      handleAuthError(response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending feedback:", error);
      throw error;
    }
  }

  // Clear chat history
  async clearChat(
    sessionId: string = "default",
    userId?: string
  ): Promise<void> {
    try {
      const url = new URL(`${this.baseUrl}/chat/${sessionId}`);
      if (userId) {
        url.searchParams.append("user_id", userId);
      }

      const response = await fetch(url.toString(), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
      updateAccessTokenFromResponse(response);
      handleAuthError(response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error clearing chat:", error);
      throw error;
    }
  }

  // Get chat history
  async getChatHistory(
    sessionId: string = "default",
    userId?: string
  ): Promise<{ conversation_history: ChatMessage[]; session_id: string }> {
    try {
      const url = new URL(`${this.baseUrl}/chat/${sessionId}/history`);
      if (userId) {
        url.searchParams.append("user_id", userId);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
      updateAccessTokenFromResponse(response);
      handleAuthError(response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error getting chat history:", error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{
    status: string;
    message: string;
    active_sessions: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
      updateAccessTokenFromResponse(response);
      handleAuthError(response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error checking health:", error);
      throw error;
    }
  }

  // Get all chat sessions
  async getChatSessions(userId?: string): Promise<ChatSessionsResponse> {
    try {
      const url = new URL(`${this.baseUrl}/chat/sessions`);
      if (userId) {
        url.searchParams.append("user_id", userId);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
      updateAccessTokenFromResponse(response);
      handleAuthError(response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error getting chat sessions:", error);
      throw error;
    }
  }

  // Route the latest persisted user message for a session through the agent
  // (Used for voice uploads that already saved the transcript)
  async routeLatest(
    sessionId: string = "default",
    userId?: string
  ): Promise<ChatResponse> {
    try {
      const url = new URL(`${this.baseUrl}/chat/route`);
      if (sessionId) url.searchParams.append("session_id", sessionId);
      if (userId) url.searchParams.append("user_id", userId);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
      updateAccessTokenFromResponse(response);
      handleAuthError(response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error routing latest message:", error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
