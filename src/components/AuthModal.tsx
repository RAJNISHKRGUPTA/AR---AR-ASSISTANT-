import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Shield, Key, Sparkles, X, Mail, CheckCircle2 } from "lucide-react";
import { UserProfile } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("sk-or-v1-96b0492a7...");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [avatarIndex, setAvatarIndex] = useState(0);

  const colors = [
    "from-indigo-500 to-purple-600",
    "from-emerald-500 to-teal-600",
    "from-cyan-500 to-blue-600",
    "from-pink-500 to-rose-600",
    "from-amber-500 to-orange-600"
  ];

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please provide a username.");
      return;
    }
    if (!isLogin && !email.trim()) {
      setError("Please provide an email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      const simulatedJWT = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
        JSON.stringify({ username, email })
      )}.simulated_sig`;
      
      const profile: UserProfile = {
        username: username.trim(),
        email: email.trim() || `${username.toLowerCase()}@arai.dev`,
        apiKeyUsed: key.trim(),
        joinedAt: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }),
        isLoggedIn: true,
        avatarColor: colors[avatarIndex]
      };

      localStorage.setItem("ar_ai_profile", JSON.stringify(profile));
      localStorage.setItem("ar_ai_jwt", simulatedJWT);
      onSuccess(profile);
      setSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-100"
          >
            {/* Ambient Background Decorative Grid */}
            <div className="absolute top-0 right-0 -m-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -m-12 h-40 w-40 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-semibold tracking-tight">
                  {isLogin ? "Sign In to AR-AI" : "Create Account"}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Success Overlay */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/95 p-6 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10 }}
                  >
                    <CheckCircle2 className="h-16 w-16 text-emerald-400 mb-4" />
                  </motion.div>
                  <h4 className="text-xl font-bold text-slate-100 mb-1">
                    Authentication Successful!
                  </h4>
                  <p className="text-sm text-slate-400">
                    {isLogin ? "Welcome back to your dashboard." : "Creating your custom agent memory workspace..."}
                  </p>
                  <div className="mt-4 flex gap-1 items-center bg-slate-800 px-3 py-1.5 rounded-full text-xs text-indigo-400">
                    <Sparkles className="h-3 w-3" /> Token JWT Cached
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleAuth} className="p-6 space-y-4">
              {error && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-400">
                  {error}
                </div>
              )}

              {/* Username */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/55 py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Email (Signup only) */}
              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      placeholder="alex@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/55 py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/55 py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400">Select Profile Identity Color</label>
                  <div className="flex gap-2.5">
                    {colors.map((color, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setAvatarIndex(index)}
                        className={`h-8 w-8 rounded-full bg-gradient-to-tr ${color} border-2 transition-transform duration-200 ${
                          avatarIndex === index ? "border-slate-100 scale-110 shadow-lg shadow-indigo-500/25" : "border-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Key Preset Indicator */}
              <div className="flex items-center gap-1.5 rounded-lg bg-indigo-950/30 border border-indigo-900/40 p-2.5 text-xs text-indigo-400">
                <Shield className="h-4 w-4 shrink-0" />
                <span>Default secure OpenRouter API key provided will be used: <b>sk-or-v1-96b0...</b></span>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full mt-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98] transition-all"
              >
                {isLogin ? "Sign In" : "Register and Create Workspace"}
              </button>

              {/* Footer Swap */}
              <div className="pt-3 text-center text-xs text-slate-500 border-t border-slate-800/50">
                {isLogin ? (
                  <span>
                    New to AR-AI?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(false);
                        setError("");
                      }}
                      className="font-medium text-indigo-400 hover:underline"
                    >
                      Register here
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(true);
                        setError("");
                      }}
                      className="font-medium text-indigo-400 hover:underline"
                    >
                      Sign In instead
                    </button>
                  </span>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
