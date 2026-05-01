import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { EyeOff, Swords, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import bannerImage from '../assets/salpakan_banner.png';

export default function Onboarding() {
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (user) {
    return <Navigate to="/lobbies" replace />;
  }

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // Register flow
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username }
          }
        });
        if (error) throw error;
        // Check if registration requires confirmation
        setError("Registration successful! You can now log in.");
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/lobbies'
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container py-5">
      <div className="row align-items-center min-vh-100" style={{ marginTop: '-80px' }}>
        
        {/* Left Column: Value Proposition */}
        <div className="col-lg-6 mb-5 mb-lg-0 pe-lg-5">
          <img 
            src={bannerImage} 
            alt="Salpakan Banner" 
            className="img-fluid rounded-4 mb-4" 
            style={{ opacity: 0.9, maxHeight: '200px', objectFit: 'cover', width: '100%' }}
          />
          <h1 className="fw-bold mb-3" style={{ fontSize: '3rem', letterSpacing: '-1px' }}>
            A classic, reimagined.
          </h1>
          <p className="text-muted fs-4 mb-5">
            Experience the classic Game of the Generals online.
          </p>
          
          <div className="d-flex flex-column gap-4">
            <div className="d-flex align-items-start gap-3">
              <div className="bg-white p-2 rounded-3 shadow-sm d-flex flex-shrink-0" style={{ color: 'var(--system-blue)' }}>
                <EyeOff size={24} />
              </div>
              <div>
                <div className="fs-5 fw-semibold">Fog of War</div>
                <div className="text-muted" style={{ fontSize: '0.9rem' }}>Hidden ranks require pure deduction and bluffing.</div>
              </div>
            </div>
            <div className="d-flex align-items-start gap-3">
              <div className="bg-white p-2 rounded-3 shadow-sm d-flex flex-shrink-0" style={{ color: 'var(--system-blue)' }}>
                <Swords size={24} />
              </div>
              <div>
                <div className="fs-5 fw-semibold">Instant Matchmaking</div>
                <div className="text-muted" style={{ fontSize: '0.9rem' }}>Play against friends or challenge the AI.</div>
              </div>
            </div>
            <div className="d-flex align-items-start gap-3">
              <div className="bg-white p-2 rounded-3 shadow-sm d-flex flex-shrink-0" style={{ color: 'var(--system-blue)' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="fs-5 fw-semibold">Climb the Ranks</div>
                <div className="text-muted" style={{ fontSize: '0.9rem' }}>Rise from Cadet to Five-Star General on global leaderboards.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="col-lg-5 offset-lg-1">
          <div className="glass-panel p-4 p-sm-5">
            <h2 className="fw-bold mb-4">{isLogin ? 'Sign In' : 'Create Account'}</h2>
            
            {error && (
              <div className={`alert ${error.includes('successful') ? 'alert-success' : 'alert-danger'} rounded-3 py-2 px-3 text-sm mb-4`}>
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="d-flex flex-column gap-3 mb-4">
              {!isLogin && (
                <div>
                  <input 
                    type="text" 
                    className="apple-input" 
                    placeholder="Username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required 
                  />
                </div>
              )}
              <div>
                <input 
                  type="email" 
                  className="apple-input" 
                  placeholder="Email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div>
                <input 
                  type="password" 
                  className="apple-input" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              
              <button type="submit" className="apple-btn-primary mt-2" disabled={loading}>
                {loading ? 'Processing...' : 'Continue'}
              </button>
            </form>

            <div className="d-flex align-items-center my-4">
              <div className="flex-grow-1 border-bottom" style={{ borderColor: 'rgba(0,0,0,0.1)' }}></div>
              <span className="px-3 text-muted small fw-medium">OR</span>
              <div className="flex-grow-1 border-bottom" style={{ borderColor: 'rgba(0,0,0,0.1)' }}></div>
            </div>

            <button onClick={handleGoogleAuth} className="apple-btn-secondary" type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.79 15.73 17.57V20.34H19.29C21.37 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C14.97 23 17.46 22.02 19.29 20.34L15.73 17.57C14.74 18.23 13.48 18.64 12 18.64C9.14 18.64 6.72 16.7 5.86 14.07H2.18V16.92C4.01 20.56 7.69 23 12 23Z" fill="#34A853"/>
                <path d="M5.86 14.07C5.64 13.41 5.51 12.72 5.51 12C5.51 11.28 5.64 10.59 5.86 9.93V7.08H2.18C1.43 8.57 1 10.23 1 12C1 13.77 1.43 15.43 2.18 16.92L5.86 14.07Z" fill="#FBBC05"/>
                <path d="M12 5.36C13.62 5.36 15.07 5.92 16.21 6.99L19.38 3.82C17.45 2.02 14.97 1 12 1C7.69 1 4.01 3.44 2.18 7.08L5.86 9.93C6.72 7.3 9.14 5.36 12 5.36Z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>

            <div className="text-center mt-4">
              <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="btn btn-link text-decoration-none p-0 fw-medium"
                style={{ color: 'var(--system-blue)' }}
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
