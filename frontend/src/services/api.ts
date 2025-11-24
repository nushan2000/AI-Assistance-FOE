import { Auth_Base_URL, Guidance_Base_URL } from "../App";
import {
  ChatMessage,
  ChatResponse,
  ChatSessionsResponse,
} from "../utils/types";

import { getAccessToken } from "./authAPI";
export async function fetchUserEmailFromProfile(): Promise<string | null> {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const response = await fetch(`${Auth_Base_URL}/auth/me`, {
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

function updateAccessTokenFromResponse(response: Response) {
  const newToken = response.headers.get("x-access-token");
  if (newToken) {
    localStorage.setItem("auth_token", newToken);
  }
}

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
      const event = document.createEvent("CustomEvent");
      event.initCustomEvent("auth:logout", true, true, {
        status: response.status,
      });
      window.dispatchEvent(event);
    }
  }
}

class ApiService {
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
      const response = await fetch(`${Guidance_Base_URL}/ruh/chat`, {
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
      const response = await fetch(`${Guidance_Base_URL}/chat/session`, {
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

  // Send feedback for a message
  async sendFeedback(
    sessionId: string,
    messageIndex: number,
    feedbackType: "like" | "dislike",
    userId?: string
  ): Promise<void> {
    try {
      const response = await fetch(`${Guidance_Base_URL}/feedback`, {
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
  // async clearChat(sessionId: string = 'default', userId?: string): Promise<void> {
  //   try {
  //     const url = new URL(`${this.baseUrl}/chat/${sessionId}`);
  //     if (userId) {
  //       url.searchParams.append('user_id', userId);
  //     }

  //     const response = await fetch(url.toString(), {
  //       method: 'DELETE',
  //       headers: {
  //         Authorization: `Bearer ${getAccessToken()}`,
  //       },
  //     });
  //     updateAccessTokenFromResponse(response);
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
  //   } catch (error) {
  //     console.error('Error clearing chat:', error);
  //     throw error;
  //   }
  // }

  // Get chat history
  async getChatHistory(
    sessionId: string = "default",
    userId?: string
  ): Promise<{ conversation_history: ChatMessage[]; session_id: string }> {
    try {
      const url = new URL(`${Guidance_Base_URL}/chat/${sessionId}/history`);
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

  async healthCheck(): Promise<{
    status: string;
    message: string;
    active_sessions: number;
  }> {
    try {
      const response = await fetch(`${Guidance_Base_URL}/health`, {
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
      const url = new URL(`${Guidance_Base_URL}/chat/sessions`);
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

  async routeLatest(
    sessionId: string = "default",
    userId?: string
  ): Promise<ChatResponse> {
    try {
      const url = new URL(`${Guidance_Base_URL}/chat/route`);
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
