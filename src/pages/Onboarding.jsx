import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Swords, TrendingUp, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import bannerImage from '../assets/salpakan_banner.png';
import Swal from 'sweetalert2';

// ── Input sanitizer ───────────────────────────────────────────────────────────
const sanitize = (str) => str.replace(/[<>"'`]/g, '').trim();

export default function Onboarding() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  // ── Prevent the redirect-on-user-set from firing during the signup flow ─────
  // When supabase.auth.signUp() auto-confirms, onAuthStateChange sets `user`
  // synchronously. Without this guard, the render-based redirect would fire
  // before our Swal can show, causing a white screen.
  const signingUpRef = useRef(false);

  // Redirect already-logged-in users to lobbies (but NOT during signup or password reset)
  useEffect(() => {
    const isResetting = window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token');
    if (user && !signingUpRef.current && !isResetting) {
      navigate('/lobbies', { replace: true });
    }
  }, [user]);

  // Lock body scroll on this page
  useEffect(() => {
    document.body.style.overflow        = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow        = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // ── Form state ────────────────────────────────────────────────────────────
  const [isLogin,       setIsLogin]       = useState(true);
  const [showForgot,    setShowForgot]    = useState(false);

  // Login fields
  const [loginEmail,    setLoginEmail]    = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Signup fields  (no username here — that's collected in UsernameSetup)
  const [regEmail,      setRegEmail]      = useState('');
  const [regPassword,   setRegPassword]   = useState('');
  const [regConfirm,    setRegConfirm]    = useState('');
  const [showRegPass,   setShowRegPass]   = useState(false);

  // Forgot-password field
  const [forgotEmail,   setForgotEmail]   = useState('');

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // ── SIGN IN ───────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const input = sanitize(loginEmail);
    if (!input) { setError('Please enter your username or email.'); setLoading(false); return; }

    let targetEmail = input;

    // If no @ symbol, assume it's a username and try to look up the email
    if (!input.includes('@')) {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('username', input)
        .maybeSingle();

      if (!profileData?.email) {
        setError('Username not found or email missing. Please sign in with your email address.');
        setLoading(false);
        return;
      }
      
      targetEmail = profileData.email;
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: loginPassword,
    });

    setLoading(false);
    if (signInErr) {
      const msg = signInErr.message?.toLowerCase() ?? '';
      setError(
        msg.includes('invalid') || msg.includes('credentials')
          ? 'Incorrect email or password.'
          : signInErr.message
      );
    }
    // On success AuthContext will update `user`, the useEffect above redirects to /lobbies
  };

  // ── SIGN UP ───────────────────────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = sanitize(regEmail);
    const pwd        = regPassword;
    const confirm    = regConfirm;

    // Validate
    if (!cleanEmail.includes('@')) { setError('Enter a valid email address.'); setLoading(false); return; }
    if (pwd.length < 6)            { setError('Password must be at least 6 characters.'); setLoading(false); return; }
    if (pwd !== confirm)           { setError('Passwords do not match.'); setLoading(false); return; }

    // Prevent the useEffect redirect from firing while we handle the signup flow
    signingUpRef.current = true;

    const { data, error: signUpErr } = await supabase.auth.signUp({ email: cleanEmail, password: pwd });

    if (signUpErr) {
      signingUpRef.current = false;
      setError(signUpErr.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data.session) {
      // Auto-confirmed (email verification disabled in Supabase) ─────────────
      await Swal.fire({
        title: 'Account Created',
        text: 'Welcome! Now choose your callsign to start playing.',
        icon: 'success',
        confirmButtonText: 'Choose Callsign',
        confirmButtonColor: '#056d94',
        allowOutsideClick: false,
        customClass: {
          popup: 'apple-swal',
          title: 'apple-swal-title',
          confirmButton: 'apple-swal-confirm',
        }
      });
      // Navigate explicitly — signingUpRef guards against the useEffect redirect
      navigate('/setup-username', { replace: true });

    } else {
      // Email verification required ──────────────────────────────────────────
      signingUpRef.current = false; // allow future redirects
      await Swal.fire({
        title: 'Check Your Inbox',
        html: `We sent a verification link to <b>${cleanEmail}</b>.<br/>Click it, then come back to sign in.`,
        icon: 'success',
        confirmButtonText: 'Got It',
        confirmButtonColor: '#056d94',
        customClass: {
          popup: 'apple-swal',
          title: 'apple-swal-title',
          confirmButton: 'apple-swal-confirm',
        }
      });
      setIsLogin(true);
      setRegEmail('');
      setRegPassword('');
      setRegConfirm('');
    }
  };

  // ── FORGOT PASSWORD ───────────────────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const cleanEmail = sanitize(forgotEmail);
    if (!cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin + '/reset-password',
    });
    setLoading(false);
    if (resetErr) {
      setError(resetErr.message);
    } else {
      await Swal.fire({
        title: 'Reset Link Sent',
        text: 'Check your inbox for a password reset link.',
        icon: 'info',
        confirmButtonText: 'OK',
        confirmButtonColor: '#056d94',
        customClass: {
          popup: 'apple-swal',
          title: 'apple-swal-title',
          confirmButton: 'apple-swal-confirm',
        }
      });
      setShowForgot(false);
      setForgotEmail('');
    }
  };

  // ── GOOGLE OAUTH ──────────────────────────────────────────────────────────
  const handleGoogleAuth = async () => {
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/lobbies' },
    });
    if (oauthErr) setError(oauthErr.message);
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      display: 'flex', alignItems: 'center',
    }}>
      <div className="container">
        <div className="row align-items-center">

          {/* Left: Value Prop */}
          <div className="col-lg-6 mb-5 mb-lg-0 pe-lg-5">
            <img src={bannerImage} alt="Salpakan"
              className="img-fluid rounded-4 mb-4"
              style={{ opacity: 0.9, maxHeight: '170px', objectFit: 'cover', width: '100%' }} />
            <h1 className="fw-bold mb-3" style={{ fontSize: '2.4rem', letterSpacing: '-1px' }}>
              A classic, reimagined.
            </h1>
            <p className="text-muted mb-4" style={{ fontSize: '1rem' }}>
              Experience Game of the Generals online.
            </p>
            <div className="d-flex flex-column gap-3">
              {[
                [Shield,     'Fog of War',         'Hidden ranks require pure deduction and bluffing.'],
                [Swords,     'Instant Matchmaking', 'Play friends or challenge the AI any time.'],
                [TrendingUp, 'Climb the Ranks',     'Rise from Cadet to Five-Star General.'],
              ].map(([Icon, title, desc]) => (
                <div key={title} className="d-flex align-items-start gap-3">
                  <div className="bg-white p-2 rounded-3 shadow-sm d-flex flex-shrink-0"
                    style={{ color: 'var(--system-blue)' }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{title}</div>
                    <div className="text-muted" style={{ fontSize: '0.82rem' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Auth Card */}
          <div className="col-lg-5 offset-lg-1">
            <div className="glass-panel p-4 p-sm-5">

              {/* ── FORGOT PASSWORD ─────────────────────────────────────── */}
              {showForgot ? (
                <>
                  <button onClick={() => { setShowForgot(false); setError(null); }}
                    className="btn btn-link p-0 mb-3 text-muted" style={{ fontSize: '0.85rem' }}>
                    ← Back to Sign In
                  </button>
                  <h2 className="fw-bold mb-1">Reset Password</h2>
                  <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
                    Enter your email and we'll send a reset link.
                  </p>
                  {error && <div className="alert alert-danger rounded-3 py-2 px-3 mb-3">{error}</div>}
                  <form onSubmit={handleForgotPassword} className="d-flex flex-column gap-3">
                    <input type="email" className="apple-input" placeholder="your@email.com"
                      value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                    <button type="submit" className="apple-btn-primary" disabled={loading}>
                      {loading ? 'Sending…' : 'Send Reset Link'}
                    </button>
                  </form>
                </>

              ) : isLogin ? (
                /* ── SIGN IN ──────────────────────────────────────────────── */
                <>
                  <h2 className="fw-bold mb-4">Sign In</h2>
                  {error && <div className="alert alert-danger rounded-3 py-2 px-3 mb-3">{error}</div>}
                  <form onSubmit={handleLogin} className="d-flex flex-column gap-3 mb-4">
                    <input type="text" className="apple-input" placeholder="Username or Email"
                      value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      autoComplete="username" required />

                    <div className="position-relative">
                      <input type={showLoginPass ? 'text' : 'password'} className="apple-input"
                        placeholder="Password" value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        style={{ paddingRight: '2.8rem' }} required />
                      <button type="button" onClick={() => setShowLoginPass(v => !v)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                 background: 'none', border: 'none', color: '#86868B', cursor: 'pointer', padding: 0 }}>
                        {showLoginPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div className="text-end" style={{ marginTop: -6 }}>
                      <button type="button" onClick={() => { setShowForgot(true); setError(null); }}
                        className="btn btn-link p-0" style={{ fontSize: '0.82rem', color: 'var(--system-blue)' }}>
                        Forgot password?
                      </button>
                    </div>

                    <button type="submit" className="apple-btn-primary" disabled={loading}>
                      {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                  </form>

                  <Divider />
                  <GoogleBtn onClick={handleGoogleAuth} />
                  <ToggleLink isLogin onClick={() => { setIsLogin(false); setError(null); }} />
                </>

              ) : (
                /* ── SIGN UP ──────────────────────────────────────────────── */
                <>
                  <h2 className="fw-bold mb-1">Create Account</h2>
                  <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>
                    You'll choose a username on the next screen.
                  </p>
                  {error && <div className="alert alert-danger rounded-3 py-2 px-3 mb-3">{error}</div>}
                  <form onSubmit={handleSignup} className="d-flex flex-column gap-3 mb-4">
                    <input type="email" className="apple-input" placeholder="Email address"
                      value={regEmail} onChange={e => setRegEmail(e.target.value)}
                      autoComplete="email" required />

                    <div className="position-relative">
                      <input type={showRegPass ? 'text' : 'password'} className="apple-input"
                        placeholder="Create password (min. 6 chars)" value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        style={{ paddingRight: '2.8rem' }} required />
                      <button type="button" onClick={() => setShowRegPass(v => !v)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                 background: 'none', border: 'none', color: '#86868B', cursor: 'pointer', padding: 0 }}>
                        {showRegPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <input type="password" className="apple-input" placeholder="Confirm password"
                      value={regConfirm} onChange={e => setRegConfirm(e.target.value)}
                      autoComplete="new-password" required />

                    <button type="submit" className="apple-btn-primary" disabled={loading}>
                      {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                  </form>

                  <Divider />
                  <GoogleBtn onClick={handleGoogleAuth} />
                  <ToggleLink isLogin={false} onClick={() => { setIsLogin(true); setError(null); }} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small shared sub-components ───────────────────────────────────────────────
function Divider() {
  return (
    <div className="d-flex align-items-center my-3">
      <div className="flex-grow-1 border-bottom" style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
      <span className="px-3 text-muted small fw-medium">OR</span>
      <div className="flex-grow-1 border-bottom" style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
    </div>
  );
}

function GoogleBtn({ onClick }) {
  return (
    <button onClick={onClick} className="apple-btn-secondary" type="button">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.79 15.73 17.57V20.34H19.29C21.37 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
        <path d="M12 23C14.97 23 17.46 22.02 19.29 20.34L15.73 17.57C14.74 18.23 13.48 18.64 12 18.64C9.14 18.64 6.72 16.7 5.86 14.07H2.18V16.92C4.01 20.56 7.69 23 12 23Z" fill="#34A853"/>
        <path d="M5.86 14.07C5.64 13.41 5.51 12.72 5.51 12C5.51 11.28 5.64 10.59 5.86 9.93V7.08H2.18C1.43 8.57 1 10.23 1 12C1 13.77 1.43 15.43 2.18 16.92L5.86 14.07Z" fill="#FBBC05"/>
        <path d="M12 5.36C13.62 5.36 15.07 5.92 16.21 6.99L19.38 3.82C17.45 2.02 14.97 1 12 1C7.69 1 4.01 3.44 2.18 7.08L5.86 9.93C6.72 7.3 9.14 5.36 12 5.36Z" fill="#EA4335"/>
      </svg>
      Continue with Google
    </button>
  );
}

function ToggleLink({ isLogin, onClick }) {
  return (
    <div className="text-center mt-4">
      <button onClick={onClick} className="btn btn-link text-decoration-none p-0 fw-medium"
        style={{ color: 'var(--system-blue)', fontSize: '0.9rem' }}>
        {isLogin
          ? "Don't have an account? Sign up"
          : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}
