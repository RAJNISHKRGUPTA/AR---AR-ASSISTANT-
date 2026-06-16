import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, Sparkles, Image, Mic, MicOff, Volume2, VolumeX, Copy, 
  Check, Terminal, Layers, FileText, ArrowUpRight, HelpCircle, 
  Cpu, Code, RefreshCw, X, Search, CloudSun
} from "lucide-react";
import { Message, ChatSession, UserProfile } from "../types";
import { SUGGESTED_CHIPS, SUPPORTED_MODELS } from "../data";

interface ChatAreaProps {
  session: ChatSession | null;
  onSendMessage: (content: string, image?: string, imageName?: string) => void;
  isGenerating: boolean;
  userProfile: UserProfile | null;
  onTriggerAuth: () => void;
  onOpenTools: () => void;
  insertedContext: string;
  clearInsertedContext: () => void;
}

// Beautiful text parser to render clean typographic markdown with code highlights
const CustomMarkdown = ({ content, isUser = false }: { content: string; isUser?: boolean }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!content) return null;

  // Split content by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="prose-custom space-y-2">
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          // Extrude code content and label
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : "code";
          const code = match ? match[2].trim() : part.replace(/```/g, "").trim();
          const blockId = `block-${index}`;

          return (
            <div key={index} className="my-3 rounded-lg overflow-hidden border border-slate-800 bg-slate-950/60 font-mono">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800/65 text-[10px] text-slate-400">
                <span className="uppercase font-semibold tracking-wider flex items-center gap-1.5 text-indigo-400">
                  <Terminal className="h-3 w-3" /> {lang || "interpreter"}
                </span>
                <button
                  onClick={() => copyToClipboard(code, blockId)}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-200 transition-colors"
                >
                  {copiedId === blockId ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs overflow-x-auto m-0 text-indigo-100">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Inline highlights for `code` and **bold** formatting
        const lines = part.split("\n");
        return (
          <div key={index} className="space-y-1 my-1">
            {lines.map((line, lIdx) => {
              // Standard list checks
              if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                return (
                  <ul key={lIdx} className={`list-disc pl-5 ${isUser ? "text-indigo-100" : "text-slate-300"}`}>
                    <li>{parseInline(line.trim().substring(2), isUser)}</li>
                  </ul>
                );
              }
              if (/^\d+\.\s/.test(line.trim())) {
                const match = line.trim().match(/^(\d+)\.\s(.*)/);
                return (
                  <ol key={lIdx} className={`list-decimal pl-5 ${isUser ? "text-indigo-100" : "text-slate-300"}`}>
                    <li value={match ? parseInt(match[1]) : undefined}>
                      {parseInline(match ? match[2] : line, isUser)}
                    </li>
                  </ol>
                );
              }
              // Headers
              if (line.startsWith("### ")) {
                return <h3 key={lIdx} className={`text-sm font-semibold mt-2 ${isUser ? "text-white" : "text-slate-200"}`}>{parseInline(line.substring(4), isUser)}</h3>;
              }
              if (line.startsWith("## ")) {
                return <h2 key={lIdx} className={`text-base font-bold mt-3 ${isUser ? "text-white" : "text-slate-100"}`}>{parseInline(line.substring(3), isUser)}</h2>;
              }
              if (line.startsWith("# ")) {
                return <h1 key={lIdx} className={`text-lg font-bold mt-4 ${isUser ? "text-white" : "text-slate-100"}`}>{parseInline(line.substring(2), isUser)}</h1>;
              }

              return <p key={lIdx} className={`leading-relaxed text-sm ${isUser ? "text-white" : "text-slate-300"}`}>{parseInline(line, isUser)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
};

// Parse tags like `code` and **bold**
function parseInline(str: string, isUser = false) {
  if (!str) return "";
  const words = str.split(/(\*\*.*?\*\*|`.*?`)/g);
  return words.map((w, idx) => {
    if (w.startsWith("**") && w.endsWith("**")) {
      return <strong key={idx} className={`font-extrabold ${isUser ? "text-white" : "text-slate-100"}`}>{w.slice(2, -2)}</strong>;
    }
    if (w.startsWith("`") && w.endsWith("`")) {
      return <code key={idx} className={`px-1.5 py-0.5 rounded font-mono text-[11.5px] ${isUser ? "bg-indigo-700/80 border border-indigo-500/50 text-white" : "bg-slate-900 border border-slate-800 text-indigo-400"}`}>{w.slice(1, -1)}</code>;
    }
    return w;
  });
}

export default function ChatArea({
  session,
  onSendMessage,
  isGenerating,
  userProfile,
  onTriggerAuth,
  onOpenTools,
  insertedContext,
  clearInsertedContext
}: ChatAreaProps) {
  const [inputText, setInputText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedName, setAttachedName] = useState<string | null>(null);
  
  // Voice Synthesis (Text-to-Speech)
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  // Voice Recognition (Speech-to-Text)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Scroll to bottom whenever messages list grows
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, isGenerating]);

  // Handle outside context transfers
  useEffect(() => {
    if (insertedContext) {
      setInputText((prev) => prev + (prev ? "\n" : "") + insertedContext);
      clearInsertedContext();
    }
  }, [insertedContext, clearInsertedContext]);

  // Configure Speech Recognition (STT - Phase 4) on module startup
  useEffect(() => {
    const SpeechComp = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechComp) {
      const recognition = new SpeechComp();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => prev + (prev ? " " : "") + transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Web Speech Recognition API is not supported in this browser. Please use Chrome, Edge or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // If speech synthesis is speaking, abort it first
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      recognitionRef.current.start();
    }
  };

  // TTS Readout toggler (Phase 4)
  const toggleSpeechReadout = (messageId: string, text: string) => {
    if ("speechSynthesis" in window) {
      if (currentlySpeakingId === messageId) {
        window.speechSynthesis.cancel();
        setCurrentlySpeakingId(null);
      } else {
        window.speechSynthesis.cancel(); // cancel current speech
        const cleanText = text.replace(/```[\s\S]*?```/g, "[Code segment omitted]"); // omit codes
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "en-US";
        utterance.rate = 1.0;
        utterance.onend = () => {
          setCurrentlySpeakingId(null);
        };
        utterance.onerror = () => {
          setCurrentlySpeakingId(null);
        };
        setCurrentlySpeakingId(messageId);
        window.speechSynthesis.speak(utterance);
      }
    } else {
      alert("Text-to-speech synthesis not supported in this frame context.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("At present, multi-modal vision accepts JPEG/PNG files for logical analysis.");
        return;
      }
      setAttachedName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() && !attachedImage) return;
    onSendMessage(inputText, attachedImage || undefined, attachedName || undefined);
    setInputText("");
    setAttachedImage(null);
    setAttachedName(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeModelDetails = SUPPORTED_MODELS.find(
    (m) => m.id === session?.selectedModel
  ) || SUPPORTED_MODELS[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0f172a] text-slate-100 min-w-0 font-sans relative">
      {/* Active Conversation Metadata Bar */}
      <div className="flex items-center justify-between p-4 bg-[#0a0f1d] border-b border-slate-800">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex items-center justify-center p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/15">
            <Cpu className="h-4.5 w-4.5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-100 truncate max-w-[180px]">
                {session ? session.title : "Workspace Environment"}
              </span>
              <span className="text-[9px] font-mono bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                {activeModelDetails.name}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">
              {session ? `Tuned latency / Context limit ${activeModelDetails.contextWindow}` : "Initialize a model stream to query."}
            </p>
          </div>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center gap-2 text-slate-400">
          <button
            onClick={onOpenTools}
            className="flex items-center gap-1.5 text-[10px] py-1 px-2.5 rounded-lg border border-slate-800 bg-slate-950/45 text-slate-300 hover:text-white hover:border-slate-700 font-semibold tracking-wide transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-indigo-400" /> Active Agents
          </button>
          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className={`p-1.5 rounded-lg border hover:bg-slate-800 transition-colors ${
              speechEnabled ? "border-slate-800 text-indigo-400 bg-indigo-500/5" : "border-slate-800/50 text-slate-500"
            }`}
            title={speechEnabled ? "Audio Assistant TTS Active" : "Audio Assistant Silenced"}
          >
            {speechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Primary Message Scroller */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence mode="popLayout">
          {!session || session.messages.length === 0 ? (
            /* Welcome / Initial Dashboard empty state (Phase 1 / 8 / 9) */
            <motion.div
              key="welcome-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto py-12 flex flex-col items-center justify-center space-y-6 text-center"
            >
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 terminal-glow">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-950 border border-slate-800">
                  <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-100 tracking-tight">
                  Welcome to AR-AI Assistant Dashboard
                </h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2.5 leading-relaxed">
                  {userProfile?.isLoggedIn 
                    ? `Greetings, ${userProfile.username}! Your persistent token profile is active and your session caches are unlocked.`
                    : "Secure token workspace. Switch OpenRouter models instantly, utilize voice narration, upload files, and activate live web tools."}
                </p>
              </div>

              {/* Suggestions chips */}
              <div className="grid grid-cols-2 gap-3 w-full pt-4">
                {SUGGESTED_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputText(chip.prompt)}
                    className="group flex flex-col items-start gap-1.5 p-3.5 text-left rounded-xl border border-slate-800/80 bg-slate-950/20 hover:border-slate-700/60 transition-all font-sans duration-200"
                  >
                    <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-semibold tracking-wide">
                      {chip.icon === "Code" && <Code className="h-3 w-3" />}
                      {chip.icon === "Brain" && <Cpu className="h-3 w-3" />}
                      {chip.icon === "Cpu" && <HelpCircle className="h-3 w-3" />}
                      {chip.icon === "Map" && <FileText className="h-3 w-3" />}
                      {chip.label}
                    </div>
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-350 line-clamp-1 leading-normal">
                      {chip.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Standard Message listing */
            session.messages.map((message, idx) => (
              <motion.div
                key={`${message.id || "msg"}-${idx}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-4 max-w-3xl mx-auto group ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div className={`mt-0.5 h-8.5 w-8.5 rounded-full shrink-0 flex items-center justify-center text-xs font-bold leading-none select-none shadow-md ${
                  message.role === "user"
                    ? (userProfile?.isLoggedIn ? `bg-gradient-to-tr ${userProfile.avatarColor} text-white` : "bg-indigo-600 text-white")
                    : "bg-slate-950 text-indigo-400 border border-indigo-500/10"
                }`}>
                  {message.role === "user" 
                    ? (userProfile?.isLoggedIn ? userProfile.username.charAt(0).toUpperCase() : "U") 
                    : "AR"}
                </div>

                {/* Bubble Container */}
                <div className={`flex flex-col gap-1 max-w-[85%] ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}>
                  {/* Sender title/metadata */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold text-slate-500">
                      {message.role === "user" ? (userProfile?.isLoggedIn ? userProfile.username : "You") : "AR-AI Core"}
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono">
                      {message.timestamp}
                    </span>
                    {message.modelUsed && (
                      <span className="text-[7.5px] font-mono bg-slate-800 text-slate-500 px-1 rounded">
                        {message.modelUsed}
                      </span>
                    )}
                  </div>

                  {/* Body Bubble */}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-indigo-600 border border-indigo-500 rounded-tr-none text-white shadow-sm"
                      : "bg-slate-800/60 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm"
                  }`}>
                    {/* Render Multimodal Image if attached */}
                    {message.attachedImage && (
                      <div className="mb-2 max-w-xs relative border border-slate-700 rounded-lg overflow-hidden">
                        <img referrerPolicy="no-referrer" src={message.attachedImage} alt="base64 attach" className="w-full object-cover max-h-40" />
                        <span className="absolute bottom-1 right-1 text-[8.5px] font-mono bg-slate-950/80 px-2 py-0.5 rounded text-neutral-300">
                          {message.attachmentName || "image_upload.png"}
                        </span>
                      </div>
                    )}

                    {/* Format standard markdown */}
                    <CustomMarkdown content={message.content} isUser={message.role === "user"} />
                  </div>

                  {/* Tool Action Bars */}
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {speechEnabled && (
                        <button
                          onClick={() => toggleSpeechReadout(message.id, message.content)}
                          className={`flex items-center gap-1 text-[9.5px] px-2 py-1 rounded bg-slate-950/30 border border-slate-800/60 hover:text-white transition-all ${
                            currentlySpeakingId === message.id ? "text-emerald-400 border-emerald-400/20" : "text-slate-500"
                          }`}
                        >
                          <Volume2 className="h-3 w-3" />
                          {currentlySpeakingId === message.id ? "Voice active (click to cancel)" : "TTS narration"}
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(message.content);
                          alert("Response content copied to clipboard!");
                        }}
                        className="flex items-center gap-1 text-[9.5px] px-2 py-1 rounded bg-slate-950/30 border border-slate-800/60 text-slate-500 hover:text-white transition-all"
                      >
                        <Copy className="h-3 w-3" /> Copy Text
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}

          {/* Skeleton generating loader */}
          {isGenerating && (
            <motion.div
              key="skeleton-loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 max-w-3xl mx-auto"
            >
              <div className="h-8.5 w-8.5 rounded-full bg-slate-950 flex items-center justify-center border border-indigo-500/10 shrink-0">
                <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
              </div>
              <div className="space-y-2 max-w-[80%] flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Bridging OpenRouter...</span>
                </div>
                <div className="rounded-2xl bg-slate-950/20 border border-slate-800/40 p-4 space-y-2">
                  <div className="h-2 w-3/4 bg-slate-800 rounded animate-pulse" />
                  <div className="h-2 w-5/6 bg-slate-800 rounded animate-pulse" />
                  <div className="h-2 w-1/2 bg-slate-800 rounded animate-pulse" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Listening State Indicator Wave */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-indigo-650 px-5 py-2 rounded-full border border-indigo-400/35 shadow-xl flex items-center gap-3 z-30"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="text-xs font-bold text-white tracking-wide">Listening: Speak now...</span>
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-white/70 rounded-full animate-bounce"
                  style={{
                    height: `${Math.random() * 12 + 4}px`,
                    animationDelay: `${i * 0.15}s`
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Composition Panel */}
      <div className="p-4 bg-[#0a0f1d] border-t border-slate-800 space-y-3 shrink-0">
        
        {/* Attached image preview bar */}
        {attachedImage && (
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg max-w-sm mx-auto">
            <div className="flex items-center gap-2 overflow-hidden">
              <Image className="h-4 w-4 text-indigo-400 shrink-0" />
              <span className="text-xs text-neutral-300 truncate">{attachedName || "visual_upload.jpg"}</span>
            </div>
            <button
              onClick={() => {
                setAttachedImage(null);
                setAttachedName(null);
              }}
              className="p-1 rounded text-neutral-500 hover:bg-slate-800 hover:text-rose-400 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Form controls */}
        <div className="relative rounded-2xl border border-slate-700 bg-slate-850/40 py-2.5 px-3.5 focus-within:border-indigo-550/70 transition-colors max-w-3xl mx-auto w-full">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder={
              !session 
                ? "Please initialize a new stream using the sidebar button to chat..."
                : `Message ${activeModelDetails.name} or type here...`
            }
            rows={2}
            className="w-full bg-transparent resize-none text-slate-100 placeholder:text-slate-500 text-xs focus:ring-0 focus:outline-none leading-relaxed"
          />

          <div className="flex items-center justify-between border-t border-slate-800/65 pt-2.5 mt-2 text-slate-400">
            {/* Left buttons (Mic, upload image) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating || !session}
                className="p-1.5 rounded-lg hover:text-slate-200 hover:bg-slate-800/80 disabled:opacity-30 transition-colors"
                title="Attach Vision Image (Phase 5)"
              >
                <Image className="h-4.5 w-4.5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={toggleListening}
                disabled={isGenerating || !session}
                className={`p-1.5 rounded-lg hover:bg-slate-800/80 disabled:opacity-30 transition-colors ${
                  isListening ? "text-rose-400 bg-rose-500/10" : "hover:text-slate-200"
                }`}
                title="Voice Dictation (Phase 4)"
              >
                {isListening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
              </button>
            </div>

            {/* Right button (Send) */}
            <button
              onClick={handleSend}
              disabled={isGenerating || (!inputText.trim() && !attachedImage) || !session}
              className="py-1.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-650/25 disabled:shadow-none disabled:opacity-35 text-white text-xs font-semibold font-sans flex items-center gap-1.5 select-none active:scale-[0.97] transition-all outline-none"
            >
              <span>Send Stream</span> <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Core credits */}
        <p className="text-[9px] text-center text-slate-650 font-medium">
          AR-AI Assistant is proxied server-side via Node Express with client-side Speech Recognition.
        </p>
      </div>
    </div>
  );
}
