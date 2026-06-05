import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import brandIcon from '../assets/icon.png';
import { auth, isFirebaseConfigured } from '../utils/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  GoogleAuthProvider, 
  signInWithCredential,
  updateProfile
} from 'firebase/auth';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  // OTP Verification States
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [userEnteredOTP, setUserEnteredOTP] = useState<string[]>(Array(6).fill(''));
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '' });
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [resendNotification, setResendNotification] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setUserProfile, userProfile } = useAppContext();

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showOTP && otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [showOTP, otpCountdown]);

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...userEnteredOTP];
    newOtp[index] = value.substring(value.length - 1);
    setUserEnteredOTP(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !userEnteredOTP[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  React.useEffect(() => {
    if (userProfile && userProfile.name) {
      navigate('/');
    }
  }, [userProfile, navigate]);

  const handleGoogleSignIn = async () => {
    setIsConnecting(true);
    setFeedback(null);
    try {
      if (window.electronAPI && window.electronAPI.googleSignIn) {
        const profile = await window.electronAPI.googleSignIn();
        
        if (isFirebaseConfigured) {
          if (!profile.idToken) {
            throw new Error('Google Authentication completed but no ID token was returned.');
          }
          const credential = GoogleAuthProvider.credential(profile.idToken);
          await signInWithCredential(auth, credential);
        } else {
          setUserProfile(profile);
          navigate('/');
        }
      } else {
        // Fallback for browser testing/development
        console.log('[Auth] Google Sign-In running in fallback mode');
        setTimeout(() => {
          setUserProfile({ name: 'Kartikey', email: 'kartikey@gmail.com' });
          navigate('/');
        }, 1500);
      }
    } catch (err: any) {
      console.error('[Auth] Google Sign-In failed:', err);
      let errMsg = 'Google Sign-in failed. Please try again.';
      if (err && err.message) {
        if (err.message.includes('Google Client ID is not configured')) {
          errMsg = 'Google Client ID is not configured. Please add GOOGLE_CLIENT_ID to .env.local and restart the app.';
        } else {
          errMsg = `Sign-in Error: ${err.message}`;
        }
      }
      setFeedback({
        type: 'error',
        message: errMsg
      });
      setIsConnecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (showForgot) {
      if (!email.includes('@')) {
        setFeedback({ type: 'error', message: 'Please enter a valid email address.' });
        return;
      }
      setIsConnecting(true);
      try {
        if (isFirebaseConfigured) {
          await sendPasswordResetEmail(auth, email);
          setFeedback({ type: 'success', message: 'Password reset link sent to your email.' });
          setTimeout(() => setShowForgot(false), 3000);
        } else {
          // Fallback mock mode
          setTimeout(() => {
            setFeedback({ type: 'success', message: 'Password reset link sent to your email.' });
            setTimeout(() => setShowForgot(false), 3000);
          }, 1200);
        }
      } catch (err: any) {
        console.error('[Auth] Password reset failed:', err);
        setFeedback({ type: 'error', message: err.message || 'Password reset failed. Please try again.' });
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    if (!isLogin && password.length < 6) {
      setFeedback({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    setIsConnecting(true);
    try {
      if (isFirebaseConfigured) {
        if (isLogin) {
          await signInWithEmailAndPassword(auth, email, password);
        } else {
          // Generate 6-digit OTP code for signup
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          setOtpCode(code);
          setSignupData({ name, email, password });
          setUserEnteredOTP(Array(6).fill('')); // Reset entry

          try {
            if (window.electronAPI && (window.electronAPI as any).sendOTPEmail) {
              await (window.electronAPI as any).sendOTPEmail(email, code);
              setResendNotification(null);
            } else {
              console.log('[Auth Dev Sandbox] Verification code:', code);
              setResendNotification(`[Dev Sandbox] Code is ${code}`);
            }
            setShowOTP(true);
            setOtpCountdown(60);
            setIsConnecting(false);
          } catch (emailErr: any) {
            console.error('[Auth] Failed to send verification email:', emailErr);
            setFeedback({ type: 'error', message: `Failed to send verification email: ${emailErr.message || emailErr}` });
            setIsConnecting(false);
          }
        }
      } else {
        if (isLogin) {
          // Fallback mock mode
          setTimeout(() => {
            setIsConnecting(false);
            setUserProfile({ name: email.split('@')[0], email });
            navigate('/');
          }, 1200);
        } else {
          // Fallback mock mode for signup -> show OTP screen with sandbox code
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          setOtpCode(code);
          setSignupData({ name, email, password });
          setUserEnteredOTP(Array(6).fill('')); // Reset entry

          setTimeout(() => {
            console.log('[Auth Dev Sandbox] Verification code:', code);
            setResendNotification(`[Dev Sandbox] Code is ${code}`);
            setShowOTP(true);
            setOtpCountdown(60);
            setIsConnecting(false);
          }, 1200);
        }
      }
    } catch (err: any) {
      console.error('[Auth] Authentication failed:', err);
      let errMsg = 'Authentication failed. Please check your credentials.';
      if (err && err.code) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          errMsg = 'Incorrect email or password.';
        } else if (err.code === 'auth/email-already-in-use') {
          errMsg = 'An account already exists with this email address.';
        } else if (err.code === 'auth/invalid-email') {
          errMsg = 'Please enter a valid email address.';
        } else {
          errMsg = err.message;
        }
      }
      setFeedback({ type: 'error', message: errMsg });
      setIsConnecting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    
    const enteredCode = userEnteredOTP.join('');
    if (enteredCode.length < 6) {
      setFeedback({ type: 'error', message: 'Please enter all 6 digits.' });
      return;
    }
    
    if (enteredCode !== otpCode) {
      setFeedback({ type: 'error', message: 'Incorrect verification code. Please check your inbox and try again.' });
      return;
    }
    
    setIsConnecting(true);
    try {
      if (isFirebaseConfigured) {
        const userCredential = await createUserWithEmailAndPassword(auth, signupData.email, signupData.password);
        if (signupData.name && userCredential.user) {
          await updateProfile(userCredential.user, { displayName: signupData.name });
        }
        // AppContext handles profile update & navigation
      } else {
        // Fallback local mode
        setTimeout(() => {
          setIsConnecting(false);
          setUserProfile({ name: signupData.name || signupData.email.split('@')[0], email: signupData.email });
          navigate('/');
        }, 1200);
      }
    } catch (err: any) {
      console.error('[Auth] Signup failed:', err);
      let errMsg = 'Failed to create account. Please try again.';
      if (err && err.code) {
        if (err.code === 'auth/email-already-in-use') {
          errMsg = 'An account already exists with this email address.';
        } else if (err.code === 'auth/weak-password') {
          errMsg = 'Password is too weak. Please choose a stronger password.';
        } else {
          errMsg = err.message;
        }
      }
      setFeedback({ type: 'error', message: errMsg });
      setIsConnecting(false);
    }
  };

  const handleResendOTP = async () => {
    if (otpCountdown > 0) return;
    
    setFeedback(null);
    setResendNotification(null);
    setIsConnecting(true);
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(code);
    setUserEnteredOTP(Array(6).fill('')); // Clear inputs
    
    try {
      if (window.electronAPI && (window.electronAPI as any).sendOTPEmail) {
        await (window.electronAPI as any).sendOTPEmail(signupData.email, code);
        setFeedback({ type: 'success', message: 'A new verification code has been sent to your email.' });
      } else {
        console.log('[Auth Dev Sandbox] Resent verification code:', code);
        setResendNotification(`[Dev Sandbox] Code is ${code}`);
      }
      setOtpCountdown(60);
    } catch (err: any) {
      console.error('[Auth] Failed to resend verification email:', err);
      setFeedback({ type: 'error', message: `Failed to resend code: ${err.message || err}` });
    } finally {
      setIsConnecting(false);
    }
  };

  if (showOTP) {
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

          <div className="text-center mb-8">
            <h2 className="text-xl font-serif mb-2 text-primary">
              Verify Your Email
            </h2>
            <p className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">
              Enter the 6-digit code sent to
            </p>
            <p className="text-xs font-mono text-primary mt-1 select-all">{signupData.email}</p>
          </div>

          {resendNotification && (
            <div className="mb-6 px-4 py-3 text-[10px] font-mono border bg-primary/5 border-primary/20 text-primary flex items-center justify-center gap-2 animate-pulse">
              <span className="material-symbols-outlined text-[14px]">terminal</span>
              {resendNotification}
            </div>
          )}

          {feedback && (
            <div className={`mb-6 px-4 py-3 text-xs font-bold uppercase tracking-widest border ${feedback.type === 'error' ? 'bg-error/10 border-error/50 text-error' : 'bg-green-500/10 border-green-500/50 text-green-400'}`}>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleVerifyOTP} className="flex flex-col gap-8">
            <div className="flex justify-between gap-2">
              {userEnteredOTP.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  required
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                  onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  disabled={isConnecting}
                  className="w-12 h-14 bg-surface-bright border border-outline-variant text-center text-xl font-mono focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                  placeholder="-"
                />
              ))}
            </div>

            <button 
              type="submit" 
              disabled={isConnecting}
              className={`mt-4 bg-primary text-background py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-surface-bright hover:text-primary border border-outline transition-all w-full flex justify-center items-center gap-2 ${isConnecting ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isConnecting ? (
                <>
                  <div className="w-3 h-3 border-2 border-background/20 border-t-background rounded-full animate-spin"></div>
                  Verifying...
                </>
              ) : (
                <>
                  Verify & Sign Up
                  <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center flex flex-col gap-4">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={isConnecting || otpCountdown > 0}
              className="text-xs text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-bold text-[10px]"
            >
              {otpCountdown > 0 ? `Resend Code in ${otpCountdown}s` : 'Resend Code'}
            </button>

            <button 
              type="button" 
              onClick={() => { setShowOTP(false); setFeedback(null); }}
              className="text-xs text-on-surface-variant hover:text-primary transition-colors uppercase tracking-wider font-bold text-[10px]"
            >
              Back to Sign Up
            </button>
          </div>
        </div>
        
        <div className="absolute bottom-10 text-[10px] uppercase font-sans font-bold tracking-[0.3em] opacity-40 text-on-surface">
          Digital Mindfulness
        </div>
      </div>
    );
  }

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
