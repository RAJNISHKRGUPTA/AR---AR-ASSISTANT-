import { ModelOption } from "./types";

export const SUPPORTED_MODELS: ModelOption[] = [
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    description: "Multimodal powerhouse with lightning speed and advanced reasoning capabilities.",
    contextWindow: "1M tokens",
    category: "vision"
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    description: "Highly efficient performance, exceptional in coding, logic, and general queries.",
    contextWindow: "64k tokens",
    category: "coding"
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Super fast, lightweight, and versatile. Perfect for rapid iterative responses.",
    contextWindow: "128k tokens",
    category: "lightweight"
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    provider: "Meta",
    description: "State-of-the-art open-weights model, excellent with structural logic and conversational rhythm.",
    contextWindow: "128k tokens",
    category: "all-rounder"
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    description: "Anthropic's fastest, light model. Extremely responsive with clear prose output.",
    contextWindow: "200k tokens",
    category: "all-rounder"
  }
];

export const SUGGESTED_CHIPS = [
  {
    label: "Analyze React state patterns",
    prompt: "Can you design a custom React hook for debouncing state changes cleanly in TypeScript? Show a elegant usage example.",
    icon: "Code"
  },
  {
    label: "Explore quantum principles",
    prompt: "Compare quantum superposition and entanglement in simple words, using a physical coin analogy.",
    icon: "Brain"
  },
  {
    label: "Solve algorithmic problem",
    prompt: "Write a high-efficiency algorithm to find two elements in an array that sum to a target integer. Discuss O(n) performance.",
    icon: "Cpu"
  },
  {
    label: "Translate technical architecture",
    prompt: "Explain how an Express JS middleware pipeline functions. Use ASCII art to trace req/res sequences.",
    icon: "Map"
  }
];

export const SYSTEM_PROMPTS = [
  {
    name: "AR-AI Orchestrator",
    prompt: "You are the AR-AI Assistant (Advanced Responsive Artificial Intelligence Assistant). You are elegant, smart, highly analytical, and direct. You write precise markdown responses, use technical terms with simplified examples, and excel at coding scripts, writing analyses, and resolving creative challenges."
  },
  {
    name: "Software Architect",
    prompt: "You are a pragmatic, master-level Software Architect. You specify strict design paradigms, outline clean folder topologies, design precise entity models, write robust defensive code, and enforce standard modular structures."
  },
  {
    name: "Curious Educator",
    prompt: "You are a warm, intellectually curious educator. You explain advanced academic or computer science concepts using simple analogies, Socratic questions, and incremental breakdowns to expand human understanding."
  },
  {
    name: "No-Nonsense Expert",
    prompt: "You are a concise engineering expert. Skip the pleasantries, intro, and outro. State immediately the solution, key calculations, or code blocks. Keep interactions extremely compressed and dense."
  }
];
