import React, { useState } from "react";
import { Shield, RefreshCw, Key, ShieldCheck, Check, ArrowLeft, KeyRound } from "lucide-react";
import { UserRole } from "../types";
import { auth } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();
      
      // Default to Super Admin for testing
      const role = UserRole.SUPER_ADMIN; 
      
      const userObj = {
        id: result.user.uid,
        name: result.user.displayName || "Staff Member",
        email: result.user.email,
        role: role
      };
      
      onLoginSuccess(token, userObj);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Visual Brand Header */}
        <div className="bg-slate-900 px-6 py-8 text-center text-white relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent)] pointer-events-none" />
          <div className="inline-flex p-3 bg-indigo-600 rounded-2xl text-white shadow-lg mb-3">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-black tracking-tight font-sans">Urban Haven Business PMS</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">Enterprise Short-Stay Management</p>
        </div>

        {/* Form Body */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center md:text-left">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Secure Access Authentication</h3>
            <p className="text-xs text-slate-450 mt-1">Please sign in with your corporate Google account.</p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl leading-relaxed flex items-start gap-2.5 animate-shake">
                <span className="shrink-0 p-1 bg-rose-100 text-rose-800 rounded-lg text-[10px]">!</span>
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:bg-indigo-400 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign in with Google</span>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            Protected by Google Firebase Authentication
          </p>
        </div>
      </div>
    </div>
  );
}
