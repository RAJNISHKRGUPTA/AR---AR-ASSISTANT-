import React, { useState } from "react";
import { 
  Plus, MessageSquare, Trash2, Settings, Sparkles, User, LogOut, 
  ChevronRight, Brain, Sliders, Shield, Key, RefreshCw
} from "lucide-react";
import { ChatSession, ModelOption, UserProfile } from "../types";
import { SUPPORTED_MODELS, SYSTEM_PROMPTS } from "../data";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: (modelId: string, systemPrompt: string) => void;
  onDeleteSession: (id: string) => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  systemPrompt: string;
  onUpdateSystemPrompt: (prompt: string) => void;
  temperature: number;
  onUpdateTemperature: (temp: number) => void;
  userProfile: UserProfile | null;
  onTriggerAuth: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  selectedModel,
  onSelectModel,
  systemPrompt,
  onUpdateSystemPrompt,
  temperature,
  onUpdateTemperature,
  userProfile,
  onTriggerAuth,
  onLogout
}: SidebarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const currentModelDetails = SUPPORTED_MODELS.find((m) => m.id === selectedModel) || SUPPORTED_MODELS[0];

  return (
    <div className="flex flex-col h-full bg-[#0b1222] border-r border-slate-850 text-slate-100 font-sans w-72 shrink-0 select-none">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-[#0a0f1d]">
        <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white shrink-0 shadow-md">
          AR
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            AR-AI Assistant
          </h1>
          <p className="text-[10px] font-semibold text-indigo-400/80 uppercase tracking-wider">Advanced Agent Core</p>
        </div>
      </div>

      {/* User Login/Signup Widget (Simulates Phase 2 of roadmap) */}
      <div className="p-4 border-b border-slate-900 bg-slate-950/40">
        {userProfile?.isLoggedIn ? (
          <div className="flex items-center justify-between bg-slate-900/50 rounded-xl border border-slate-800 p-2.5">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${userProfile.avatarColor} shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-inner`}>
                {userProfile.username.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-200 truncate">{userProfile.username}</p>
                <p className="text-[9px] text-slate-500 truncate">{userProfile.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Logout session"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="text-center p-1.5">
            <p className="text-xs text-slate-400 mb-2">Simulate Cloud Identity & Auth Profiles</p>
            <button
              onClick={onTriggerAuth}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-indigo-400 font-semibold transition-all shadow-inner"
            >
              <User className="h-3.5 w-3.5" /> Sign In / Register
            </button>
          </div>
        )}
      </div>

      {/* Primary Action Button: Create Chat Session */}
      <div className="p-4">
        <button
          onClick={() => onCreateSession(selectedModel, systemPrompt)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all font-medium text-xs text-white"
        >
          <Plus className="h-4 w-4" /> Start New AI Stream
        </button>
      </div>

      {/* Main Drawer Navigation Tabs */}
      <div className="flex-1 overflow-y-auto px-3 space-y-4">
        {/* Active chats lists */}
        <div>
          <span className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
            Active Chat Logs ({sessions.length})
          </span>
          {sessions.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-900 bg-slate-950/20">
              <p className="text-[10px] text-slate-500">No session backups active. Create a stream above.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session, sIdx) => (
                <div
                  key={`${session.id || "session"}-${sIdx}`}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all duration-150 border cursor-pointer ${
                    activeSessionId === session.id
                      ? "bg-slate-900/60 border-slate-800 text-slate-100"
                      : "bg-transparent border-transparent text-slate-400 hover:bg-slate-900/20 hover:text-slate-200"
                  }`}
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${activeSessionId === session.id ? "text-indigo-400" : "text-slate-500"}`} />
                    <span className="truncate font-medium">{session.title}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-800 hover:text-rose-400 text-slate-500 transition-all duration-150"
                    title="Delete Chat Backups"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Model Selector panel */}
        <div>
          <span className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-1">
            <RefreshCw className="h-2.5 w-2.5" /> Core Switch Engine (OpenRouter)
          </span>
          <div className="space-y-1">
            {SUPPORTED_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => onSelectModel(model.id)}
                className={`w-full flex items-start gap-2.5 text-left rounded-xl p-2.5 border transition-all ${
                  selectedModel === model.id
                    ? "bg-slate-900/40 border-indigo-500/25 text-white"
                    : "bg-slate-950 border-transparent text-slate-400 hover:bg-slate-900/10 hover:text-slate-200"
                }`}
              >
                <div className={`mt-0.5 rounded p-1 text-[9px] font-bold ${
                  selectedModel === model.id ? "bg-indigo-500/15 text-indigo-400" : "bg-slate-900 text-slate-500"
                }`}>
                  {model.provider.substring(0, 3).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold leading-none">{model.name}</span>
                    {model.category === "vision" && (
                      <span className="text-[7.5px] font-sans font-medium uppercase tracking-tight text-teal-400 border border-teal-400/20 px-1 py-0 rounded-full bg-teal-500/5">
                        Vision
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-500 truncate leading-relaxed mt-0.5">{model.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Settings Drawer */}
      <div className="p-4 border-t border-slate-900 bg-slate-950">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-900 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Tuning Parameters
          </span>
          <ChevronRight className={`h-3 w-3 transform transition-transform ${showSettings ? "rotate-90" : ""}`} />
        </button>

        {showSettings && (
          <div className="mt-3 p-3 bg-slate-900/40 rounded-xl border border-slate-900 space-y-4">
            {/* System Prompt Switcher */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Brain className="h-3 w-3" /> Agent System Role
              </label>
              <select
                value={systemPrompt}
                onChange={(e) => onUpdateSystemPrompt(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 py-1.5 px-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {SYSTEM_PROMPTS.map((prompt, pIdx) => (
                  <option key={pIdx} value={prompt.prompt}>
                    {prompt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span className="font-semibold uppercase tracking-widest flex items-center gap-1">
                  <Sliders className="h-3 w-3" /> Temperature
                </span>
                <span className="font-mono text-indigo-400">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => onUpdateTemperature(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[8px] text-slate-600 font-mono">
                <span>Deterministic</span>
                <span>Creative</span>
              </div>
            </div>

            {/* API Key Safety details */}
            <div className="text-[9px] leading-relaxed text-slate-500 bg-slate-950/40 p-2 rounded-lg border border-slate-900 flex items-start gap-1">
              <Shield className="h-3 w-3 text-indigo-500 shrink-0 mt-0.5" />
              <span>Proxy architecture prevents API Key leakage. No data keys are stored on client browsers.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
