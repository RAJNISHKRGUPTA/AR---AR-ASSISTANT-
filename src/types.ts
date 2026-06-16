export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
  modelUsed?: string;
  attachedImage?: string; // base64 representation for multimodel analysis
  attachmentName?: string;
  toolResults?: {
    type: "search" | "weather" | "calculator";
    query: string;
    description: string;
    data: any;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  selectedModel: string;
  systemPrompt: string;
  createdAt: string;
  temperature: number;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextWindow: string;
  category: "all-rounder" | "coding" | "reasoning" | "lightweight" | "vision";
  iconUrl?: string;
}

export interface UserProfile {
  username: string;
  email: string;
  apiKeyUsed: string;
  joinedAt: string;
  isLoggedIn: boolean;
  avatarColor: string;
}

export interface AgentTool {
  id: "search" | "weather" | "calculator";
  title: string;
  description: string;
  status: "idle" | "searching" | "running" | "completed" | "error";
  icon: string;
}
