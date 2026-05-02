import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, profile, profileLoading } = useAuth();

  // Not logged in at all → back to onboarding
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Still loading profile from Supabase — show spinner instead of blank white screen
  if (profileLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  // Logged in but hasn't set a username yet → username setup
  if (!profile?.username) {
    return <Navigate to="/setup-username" replace />;
  }

  return children;
}
