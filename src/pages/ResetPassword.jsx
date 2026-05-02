import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: password
    });

    setLoading(false);
    if (updateErr) {
      setError(updateErr.message);
    } else {
      setSuccess(true);
      await Swal.fire({
        title: 'Password Updated',
        text: 'Your password has been reset successfully. You can now sign in with your new password.',
        icon: 'success',
        confirmButtonText: 'Sign In',
        confirmButtonColor: '#007AFF',
        customClass: { popup: 'apple-swal', title: 'apple-swal-title', confirmButton: 'apple-swal-confirm' }
      });
      navigate('/', { replace: true });
    }
  };

  if (success) {
    return (
      <div className="page-container d-flex align-items-center justify-content-center">
        <div className="glass-panel p-5 text-center" style={{ maxWidth: 400 }}>
          <CheckCircle size={60} className="text-success mb-3" />
          <h2 className="fw-bold">Success!</h2>
          <p className="text-muted">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container d-flex align-items-center justify-content-center">
      <div className="container" style={{ maxWidth: 450 }}>
        <div className="glass-panel p-4 p-sm-5 shadow-2xl">
          <div className="text-center mb-4">
            <div className="d-inline-flex p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-3">
              <Lock size={32} />
            </div>
            <h2 className="fw-bold mb-1">Set New Password</h2>
            <p className="text-muted small">Choose a strong password for your account.</p>
          </div>

          {error && <div className="alert alert-danger rounded-3 py-2 px-3 mb-4">{error}</div>}

          <form onSubmit={handleReset} className="d-flex flex-column gap-3">
            <div className="position-relative">
              <label className="text-uppercase fw-bold text-muted mb-2 d-block" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>New Password</label>
              <input 
                type={showPass ? 'text' : 'password'} 
                className="apple-input" 
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight: '2.8rem' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPass(v => !v)}
                style={{ 
                  position: 'absolute', right: 12, top: 'calc(100% - 24px)', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#86868B', cursor: 'pointer', padding: 0 
                }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div>
              <label className="text-uppercase fw-bold text-muted mb-2 d-block" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Confirm Password</label>
              <input 
                type={showPass ? 'text' : 'password'} 
                className="apple-input" 
                placeholder="Repeat password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="apple-btn-primary py-3 mt-3" disabled={loading}>
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
