import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden text-white">
      {/* Ambient background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-surface border border-outline-variant p-10 relative z-10 shadow-2xl flex flex-col">
        <div className="flex justify-center mb-8">
          <h1 className="text-3xl font-serif italic tracking-tight text-white mb-2 flex items-center">
            Distrack  
          </h1>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-xl font-serif mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">
            {isLogin ? 'Enter your details to proceed' : 'Begin your journey to focus'}
          </p>
        </div>

        <button 
          type="button" 
          onClick={() => navigate('/')}
          className="mb-6 bg-surface-bright text-white py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-black border border-outline-variant transition-all w-full flex justify-center items-center gap-3"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 opacity-80" />
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-[1px] flex-1 bg-outline-variant"></div>
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">OR</span>
          <div className="h-[1px] flex-1 bg-outline-variant"></div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {!isLogin && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Full Name</label>
              <input 
                type="text" 
                required 
                className="bg-transparent border-b border-outline-variant py-2 outline-none focus:border-white transition-colors text-sm font-sans"
                placeholder="John Doe"
              />
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Email</label>
            <input 
              type="email" 
              required 
              className="bg-transparent border-b border-outline-variant py-2 outline-none focus:border-white transition-colors text-sm font-sans"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Password</label>
              {isLogin && <button type="button" className="text-[10px] text-on-surface hover:text-white transition-colors">Forgot?</button>}
            </div>
            <input 
              type="password" 
              required 
              className="bg-transparent border-b border-outline-variant py-2 outline-none focus:border-white transition-colors text-sm font-mono tracking-widest"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="mt-6 bg-white text-black py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-surface-bright hover:text-white border border-transparent transition-all w-full flex justify-center items-center gap-2">
            {isLogin ? 'Sign In' : 'Sign Up'}
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-on-surface-variant hover:text-white transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-10 text-[10px] uppercase font-sans font-bold tracking-[0.3em] opacity-40 text-on-surface">
        Digital Mindfulness
      </div>
    </div>
  );
}
