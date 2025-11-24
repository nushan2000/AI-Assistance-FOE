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

export type UploadVoiceOptions = {
  blob: Blob;
  sessionId: string;
  userId?: string | null;
  backendBase?: string;
  onProgress?: (percent: number) => void;
};

export interface ChatInterfaceProps {
  sessionId?: string;
}

export interface AuthFormValues {
  emailFront: string;
  emailDomain: string;
  password: string;
  confirmPassword: string;
  title: string;
  department: string;
  firstName: string;
  lastName: string;
}

export interface LoginFormValues {
  emailFront: string;
  emailDomain: string;
  password: string;
}
export interface AuthFormProps {
  mode: "login" | "signup";
  onSubmit: (data: { email: string; password: string }) => void;
  buttonText?: string;
  theme?: "light" | "dark" | string;
  onSwitchToLogin?: () => void;
}

export interface AuthPageProps {
  onAuthSuccess: (userSession: any) => void;
  theme?: "light" | "dark" | string;
}

export interface OTPPopupProps {
  open: boolean;
  email: string;
  timer: number;
  otp: string;
  error?: string;
  onChange: (otp: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onResend?: () => void;
}
