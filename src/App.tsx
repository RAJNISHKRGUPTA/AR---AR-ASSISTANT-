import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import ToolsPanel from "./components/ToolsPanel";
import AuthModal from "./components/AuthModal";
import { ChatSession, Message, UserProfile } from "./types";
import { SUPPORTED_MODELS, SYSTEM_PROMPTS } from "./data";
import { Sparkles, Layout, Database } from "lucide-react";

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // Current settings for new streams
  const [selectedModel, setSelectedModel] = useState<string>("google/gemini-2.5-flash");
  const [systemPrompt, setSystemPrompt] = useState<string>(SYSTEM_PROMPTS[0].prompt);
  const [temperature, setTemperature] = useState<number>(0.7);

  // Auth and identity state (Phase 2)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Tools overlay drawer (Phase 9)
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [insertedContext, setInsertedContext] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);

  // Load cached data on mount
  useEffect(() => {
    // Load session configs
    const cachedSessions = localStorage.getItem("ar_ai_sessions");
    if (cachedSessions) {
      try {
        const parsed = JSON.parse(cachedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error("Local recovery error:", e);
      }
    }

    // Load active settings
    const cachedModel = localStorage.getItem("ar_ai_selected_model");
    if (cachedModel) setSelectedModel(cachedModel);

    const cachedTemp = localStorage.getItem("ar_ai_temp");
    if (cachedTemp) setTemperature(parseFloat(cachedTemp));

    // Load user profile
    const cachedProfile = localStorage.getItem("ar_ai_profile");
    if (cachedProfile) {
      try {
        setUserProfile(JSON.parse(cachedProfile));
      } catch (e) {
        console.error("Profile recovery error:", e);
      }
    }
  }, []);

  // Sync sessions cache with local storage
  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    localStorage.setItem("ar_ai_sessions", JSON.stringify(updatedSessions));
  };

  const handleCreateSession = (modelId: string, sysPrompt: string) => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: `AI Stream - ${new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      })}`,
      messages: [],
      selectedModel: modelId,
      systemPrompt: sysPrompt,
      createdAt: new Date().toISOString(),
      temperature: temperature
    };

    const nextSessions = [newSession, ...sessions];
    saveSessions(nextSessions);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (id: string) => {
    const nextSessions = sessions.filter((s) => s.id !== id);
    saveSessions(nextSessions);
    if (activeSessionId === id) {
      setActiveSessionId(nextSessions.length > 0 ? nextSessions[0].id : null);
    }
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem("ar_ai_selected_model", modelId);
    
    // Update active session metadata as well
    if (activeSessionId) {
      const nextSessions = sessions.map((s) => {
        if (s.id === activeSessionId) {
          return { ...s, selectedModel: modelId };
        }
        return s;
      });
      saveSessions(nextSessions);
    }
  };

  const handleUpdateSystemPrompt = (prompt: string) => {
    setSystemPrompt(prompt);
    if (activeSessionId) {
      const nextSessions = sessions.map((s) => {
        if (s.id === activeSessionId) {
          return { ...s, systemPrompt: prompt };
        }
        return s;
      });
      saveSessions(nextSessions);
    }
  };

  const handleUpdateTemperature = (temp: number) => {
    setTemperature(temp);
    localStorage.setItem("ar_ai_temp", String(temp));
    if (activeSessionId) {
      const nextSessions = sessions.map((s) => {
        if (s.id === activeSessionId) {
          return { ...s, temperature: temp };
        }
        return s;
      });
      saveSessions(nextSessions);
    }
  };

  const handleSendMessage = async (content: string, image?: string, imageName?: string) => {
    if (!activeSessionId) return;

    const currentSession = sessions.find((s) => s.id === activeSessionId);
    if (!currentSession) return;

    // 1. Construct user message item
    const userMessage: Message = {
      id: `user-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      attachedImage: image,
      attachmentName: imageName
    };

    const initialMessages = [...currentSession.messages, userMessage];
    
    // Dynamically rename chat if first user message
    let updatedTitle = currentSession.title;
    if (currentSession.messages.length === 0) {
      updatedTitle = content.substring(0, 32) + (content.length > 32 ? "..." : "");
    }

    const updatedSessionBeforeResponse = {
      ...currentSession,
      title: updatedTitle,
      messages: initialMessages
    };

    saveSessions(
      sessions.map((s) => (s.id === activeSessionId ? updatedSessionBeforeResponse : s))
    );

    setIsGenerating(true);

    try {
      // 2. Prepare standardized messages payload for OpenRouter
      const payloadMessages = [
        { role: "system", content: currentSession.systemPrompt },
        ...initialMessages.map((m) => {
          if (m.attachedImage) {
            // Multimodal content structure
            return {
              role: m.role,
              content: [
                { type: "text", text: m.content || "Analyze the following visual attachments:" },
                {
                  type: "image_url",
                  image_url: { url: m.attachedImage }
                }
              ]
            };
          }
          return { role: m.role, content: m.content };
        })
      ];

      // 3. Dispatch to secure server-side Express proxy
      const apiRes = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: currentSession.selectedModel,
          messages: payloadMessages,
          temperature: currentSession.temperature,
          max_tokens: 2048
        })
      });

      if (!apiRes.ok) {
        const errDetails = await apiRes.json();
        throw new Error(errDetails.details || "API stream connection snapped.");
      }

      const responseData = await apiRes.json();
      const assistantText = responseData.choices[0]?.message?.content || "[No reply generated]";

      // 4. Construct Assistant message item
      const assistantMessage: Message = {
        id: `assistant-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: "assistant",
        content: assistantText,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit"
        }),
        modelUsed: currentSession.selectedModel
      };

      const finalMessages = [...initialMessages, assistantMessage];
      const updatedSessionAfterResponse = {
        ...currentSession,
        title: updatedTitle,
        messages: finalMessages
      };

      saveSessions(
        sessions.map((s) => (s.id === activeSessionId ? updatedSessionAfterResponse : s))
      );

    } catch (error: any) {
      console.error(error);
      const errorMessage: Message = {
        id: `error-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: "assistant",
        content: `⚠️ **AR-AI Coprocessor Routing Exception**:\n\n${
          error.message || "Failed to make connection contact with OpenRouter backend proxy nodes."
        }\n\n*Please confirm your server configuration or double-check that your OPENROUTER_API_KEY is correctly defined in '.env' settings.*`,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit"
        })
      };

      const finalMessagesWithErr = [...initialMessages, errorMessage];
      saveSessions(
        sessions.map((s) =>
          s.id === activeSessionId ? { ...s, messages: finalMessagesWithErr } : s
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertContext = (text: string) => {
    setInsertedContext(text);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden font-sans select-none text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        systemPrompt={systemPrompt}
        onUpdateSystemPrompt={handleUpdateSystemPrompt}
        temperature={temperature}
        onUpdateTemperature={handleUpdateTemperature}
        userProfile={userProfile}
        onTriggerAuth={() => setIsAuthOpen(true)}
        onLogout={() => {
          localStorage.removeItem("ar_ai_profile");
          localStorage.removeItem("ar_ai_jwt");
          setUserProfile(null);
        }}
      />

      {/* Main Conversation Stream */}
      <div className="flex-1 flex min-w-0 h-full relative">
        <ChatArea
          session={activeSession}
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          userProfile={userProfile}
          onTriggerAuth={() => setIsAuthOpen(true)}
          onOpenTools={() => setIsToolsOpen(!isToolsOpen)}
          insertedContext={insertedContext}
          clearInsertedContext={() => setInsertedContext("")}
        />

        {/* Sliding Tools Side Drawer */}
        {isToolsOpen && (
          <div className="w-80 border-l border-slate-800 shadow-2xl h-full shrink-0 z-10">
            <ToolsPanel
              onInsertContext={handleInsertContext}
              onClose={() => setIsToolsOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Simulated User Auth identity Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(profile) => {
          setUserProfile(profile);
          setIsAuthOpen(false);
        }}
      />
    </div>
  );
}
