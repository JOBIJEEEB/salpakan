import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { LogOut } from 'lucide-react';
import salpakanLogo from '../assets/salpakan_LOGO.png';

export default function TopNav() {
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="glass-nav py-3 px-4 d-flex justify-content-between align-items-center fixed-top">
      <Link to="/" className="text-decoration-none d-flex align-items-center">
        <img src={salpakanLogo} alt="Salpakan Logo" style={{ height: '36px', width: 'auto' }} className="me-2" />
        <span className="fw-bold text-dark" style={{ fontSize: '1.25rem', letterSpacing: '-0.5px' }}>Salpakan</span>
      </Link>
      
      <div className="d-flex align-items-center gap-4">
        {user ? (
          <>
            <NavLink to="/lobbies" className={({isActive}) => `text-decoration-none fw-medium ${isActive ? 'text-primary' : 'text-dark'}`}>LOBBIES</NavLink>
            <NavLink to="/practice" className={({isActive}) => `text-decoration-none fw-medium ${isActive ? 'text-primary' : 'text-dark'}`}>PRACTICE</NavLink>
            <NavLink to="/leaderboard" className={({isActive}) => `text-decoration-none fw-medium ${isActive ? 'text-primary' : 'text-dark'}`}>LEADERBOARD</NavLink>
            <NavLink to="/account" className={({isActive}) => `text-decoration-none fw-medium ${isActive ? 'text-primary' : 'text-dark'}`}>ACCOUNT</NavLink>
          </>
        ) : null}
        
        {user && (
          <button onClick={handleLogout} className="btn btn-link text-muted p-0 ms-2" title="Log Out">
            <LogOut size={20} />
          </button>
        )}
      </div>
    </nav>
  );
}
