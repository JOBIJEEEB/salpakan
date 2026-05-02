import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { LogOut, Gamepad2, Swords, Trophy, User as UserIcon } from 'lucide-react';
import salpakanBanner from '../assets/salpakan_banner.png';

export default function TopNav() {
  const { user, profile } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!user) return null;

  return (
    <div className="fixed-top d-flex justify-content-center pt-3" style={{ pointerEvents: 'none' }}>
      <nav className="glass-panel px-3 py-2 d-flex align-items-center gap-2 shadow-lg" 
        style={{ pointerEvents: 'auto', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}>
        
        <Link to="/lobbies" className="d-flex align-items-center me-2 pe-3 border-end position-relative">
          <img src={salpakanBanner} alt="Salpakan Banner" style={{ height: '30px', width: 'auto' }} />
          <span className="ms-2 px-2 py-0 rounded-pill fw-black" 
                style={{ fontSize: '0.6rem', background: 'rgba(0,0,0,0.05)', color: '#86868B', letterSpacing: '0.5px' }}>
            V1.2
          </span>
        </Link>

        <div className="d-flex align-items-center gap-1">
          <NavButton to="/lobbies" icon={<Gamepad2 size={18} />} label="Play" />
          <NavButton to="/practice" icon={<Swords size={18} />} label="Practice" />
          <NavButton to="/leaderboard" icon={<Trophy size={18} />} label="Rankings" />
          <NavButton to="/account" icon={<UserIcon size={18} />} label="Profile" />
        </div>

        <div className="ms-3 ps-3 border-start d-flex align-items-center gap-3">
          <Link to="/account" className="d-flex align-items-center gap-2 text-decoration-none">
            <div className="rounded-circle overflow-hidden border shadow-sm" style={{ width: 32, height: 32, background: '#fff' }}>
              <img 
                src={`https://api.dicebear.com/7.x/${profile?.avatar_style || 'notionists'}/svg?seed=${profile?.avatar_seed || profile?.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%' }} 
              />
            </div>
            <div className="d-none d-md-block text-dark fw-bold small">{profile?.username}</div>
          </Link>
          
          <button onClick={handleLogout} className="btn btn-link text-muted p-0 hover-red" title="Log Out">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        .nav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
          text-decoration: none;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.2s ease;
        }
        .nav-btn:hover {
          background: rgba(0,0,0,0.03);
          color: var(--text-primary);
        }
        .nav-btn.active {
          background: var(--system-blue);
          color: white;
          box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
        }
        .hover-red:hover { color: #FF3B30 !important; }
      `}} />
    </div>
  );
}

function NavButton({ to, icon, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
      {icon}
      <span className="d-none d-lg-inline">{label}</span>
    </NavLink>
  );
}
