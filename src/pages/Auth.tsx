import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import brandIcon from '../assets/icon.png';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  const navigate = useNavigate();
  const { setUserProfile, userProfile } = useAppContext();

  React.useEffect(() => {
    if (userProfile && userProfile.name) {
      navigate('/');
    }
  }, [userProfile, navigate]);

  const handleGoogleSignIn = () => {
    setIsConnecting(true);
    setFeedback(null);
    setTimeout(() => {
      setUserProfile({ name: 'Kartikey', email: 'kartikey@gmail.com' });
      navigate('/');
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (showForgot) {
      if (!email.includes('@')) {
        setFeedback({ type: 'error', message: 'Please enter a valid email address.' });
        return;
      }
      setIsConnecting(true);
      setTimeout(() => {
        setIsConnecting(false);
        setFeedback({ type: 'success', message: 'Password reset link sent to your email.' });
        setTimeout(() => setShowForgot(false), 3000);
      }, 1200);
      return;
    }

    if (!isLogin && password.length < 6) {
      setFeedback({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      const displayName = isLogin
        ? email.split('@')[0]
        : name || email.split('@')[0];
      setUserProfile({ name: displayName, email });
      navigate('/');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden text-primary">
      {/* Ambient background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-surface border border-outline-variant p-10 relative z-10 shadow-2xl flex flex-col">
        <div className="flex flex-col items-center justify-center mb-8 gap-3">
          <div className="w-12 h-12 flex items-center justify-center rounded-sm overflow-hidden">
            <img src={brandIcon} className="w-full h-full object-contain" alt="Distrack Logo" />
          </div>
          <h1 className="text-3xl font-serif italic tracking-tight text-primary">
            Distrack  
          </h1>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-xl font-serif mb-2 text-primary">
            {showForgot ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">
            {showForgot ? 'Enter email to receive reset link' : isLogin ? 'Enter your details to proceed' : 'Begin your journey to focus'}
          </p>
        </div>

        {feedback && (
          <div className={`mb-6 px-4 py-3 text-xs font-bold uppercase tracking-widest border ${feedback.type === 'error' ? 'bg-error/10 border-error/50 text-error' : 'bg-green-500/10 border-green-500/50 text-green-400'}`}>
            {feedback.message}
          </div>
        )}

        {!showForgot && (
          <>
            <button 
              type="button" 
              onClick={handleGoogleSignIn}
              disabled={isConnecting}
              className={`mb-6 bg-surface-bright text-primary py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-primary hover:text-background border border-outline-variant transition-all w-full flex justify-center items-center gap-3 ${isConnecting ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isConnecting ? (
                <>
                  <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 opacity-80" />
                  Continue with Google
                </>
              )}
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-[1px] flex-1 bg-outline-variant"></div>
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">OR</span>
              <div className="h-[1px] flex-1 bg-outline-variant"></div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {!isLogin && !showForgot && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Full Name</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isConnecting}
                className="bg-transparent border-b border-outline-variant py-2 outline-none focus:border-primary transition-colors text-sm font-sans disabled:opacity-50"
                placeholder="John Doe"
              />
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isConnecting}
              className="bg-transparent border-b border-outline-variant py-2 outline-none focus:border-primary transition-colors text-sm font-sans disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>

          {!showForgot && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Password</label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={() => { setShowForgot(true); setFeedback(null); }}
                    className="text-[10px] text-on-surface hover:text-primary transition-colors"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isConnecting}
                className="bg-transparent border-b border-outline-variant py-2 outline-none focus:border-primary transition-colors text-sm font-mono tracking-widest disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={isConnecting}
            className={`mt-6 bg-primary text-background py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-surface-bright hover:text-primary border border-outline transition-all w-full flex justify-center items-center gap-2 ${isConnecting ? 'opacity-50 cursor-wait' : ''}`}
          >
            {isConnecting ? (
              <>
                <div className="w-3 h-3 border-2 border-background/20 border-t-background rounded-full animate-spin"></div>
                Processing...
              </>
            ) : showForgot ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Sign Up'}
            {!isConnecting && <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
          </button>
        </form>

        <div className="mt-8 text-center flex flex-col gap-3">
          {showForgot && (
            <button 
              type="button" 
              onClick={() => { setShowForgot(false); setFeedback(null); }}
              className="text-xs text-on-surface-variant hover:text-primary transition-colors"
            >
              Back to Sign In
            </button>
          )}
          {!showForgot && (
            <button 
              type="button" 
              onClick={() => { setIsLogin(!isLogin); setFeedback(null); }}
              className="text-xs text-on-surface-variant hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-10 text-[10px] uppercase font-sans font-bold tracking-[0.3em] opacity-40 text-on-surface">
        Digital Mindfulness
      </div>
    </div>
  );
}
