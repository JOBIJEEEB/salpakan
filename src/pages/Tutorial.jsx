import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Target, 
  Swords, 
  Shield, 
  Map, 
  ChevronRight, 
  ChevronLeft,
  LayoutDashboard,
  Trophy,
  User,
  Gamepad2,
  History,
  Code
} from 'lucide-react';
import { PIECE_DEFS } from '../lib/gameConstants';

const STEPS = [
  {
    id: 'history',
    title: 'The Legacy of Salpakan',
    icon: <History size={48} className="text-primary" />,
    content: (
      <div className="text-center animate-fade-in h-100 d-flex flex-column justify-content-center">
        <p className="lead text-dark fw-bold mb-4">
          Salpakan (Game of the Generals) is a proud piece of Philippine culture, invented in 1970 to celebrate strategy and psychological warfare.
        </p>
        <div className="glass-panel p-4 bg-white border-dark border-opacity-10 shadow-sm text-start">
          <h6 className="fw-black text-uppercase d-flex align-items-center gap-2 mb-3" style={{ fontSize: '0.7rem', color: '#007AFF' }}>
            <Code size={14} /> The Digital Commander
          </h6>
          <p className="mb-0 small fw-medium" style={{ lineHeight: '1.6' }}>
            This digital Command Center was engineered and envisioned by <b>JB Hernandez</b>, 
            bringing the classic game into the modern era with high-stakes competitive tracking and elite tactical training.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'welcome',
    title: 'Welcome Soldier',
    icon: <Gamepad2 size={48} className="text-primary" />,
    content: (
      <div className="text-center animate-fade-in h-100 d-flex flex-column justify-content-center">
        <p className="text-muted mb-4 fw-medium">
          You lead an army of hidden units. Success depends on your ability to outsmart, outmaneuver, and outlast your opponent.
        </p>
        <div className="glass-panel p-4 text-start bg-white-50 border-dark border-opacity-10">
          <h6 className="fw-black text-uppercase d-flex align-items-center gap-2 mb-3" style={{ fontSize: '0.7rem', color: '#FF3B30' }}>
            <Target size={16} /> Mission Objectives
          </h6>
          <ul className="mb-0 small d-flex flex-column gap-2 fw-bold">
            <li><b>Capture the Flag</b>: Locate and eliminate the enemy Flag piece.</li>
            <li><b>Reach the Edge</b>: Move your Flag to the opponent's back row.</li>
            <li><b>Total Elimination</b>: Wipe out all opposing mobile pieces.</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'hierarchy',
    title: 'The Elite Hierarchy',
    icon: <Swords size={48} className="text-danger" />,
    content: (
      <div className="animate-fade-in h-100 d-flex flex-column justify-content-center">
        <p className="text-center text-muted small mb-3 fw-medium">
          Higher-ranking pieces eliminate lower-ranking ones.
        </p>
        <div className="row g-2 mb-3 px-2 overflow-auto no-scrollbar" style={{ maxHeight: '220px' }}>
          {[...PIECE_DEFS]
            .sort((a, b) => b.rank - a.rank)
            .map((def) => (
              <div key={def.type} className="col-6">
                <div className="glass-panel p-1 px-2 d-flex align-items-center gap-2" 
                     style={{ borderLeft: `3px solid ${def.rank > 10 ? '#FF3B30' : '#8E8E93'}`, background: '#fff' }}>
                  <div className="fw-black text-center" style={{ fontSize: '0.65rem', width: 18, color: '#000' }}>{def.rank}</div>
                  <div className="fw-bold text-truncate" style={{ fontSize: '0.7rem', color: '#000' }}>{def.label}</div>
                </div>
              </div>
            ))}
        </div>
        <div className="glass-panel p-3 bg-warning-subtle border-warning border-opacity-25 shadow-sm">
          <h6 className="fw-bold mb-2" style={{ fontSize: '0.75rem' }}>Special Combat Rules:</h6>
          <ul className="mb-0 fw-bold" style={{ fontSize: '0.65rem' }}>
            <li><b>The Spy</b>: Eliminates all ranks, but is defeated by the <b>Private</b>.</li>
            <li><b>The Private</b>: The only piece that can eliminate a <b>Spy</b>.</li>
            <li><b>Equal Ranks</b>: Both pieces are eliminated from the board.</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'navigation',
    title: 'Command Center Navigation',
    icon: <Map size={48} className="text-success" />,
    content: (
      <div className="d-flex flex-column gap-2 animate-fade-in h-100 justify-content-center">
        {[
          { icon: <LayoutDashboard size={18} />, title: 'Game Center', desc: 'Host live matches and track RR stats.' },
          { icon: <Shield size={18} />, title: 'Command Training', desc: 'Sharpen tactics against elite AI.' },
          { icon: <Trophy size={18} />, title: 'Global Rankings', desc: 'Rise from Mandirigma to Bayani.' },
          { icon: <User size={18} />, title: 'Profile', desc: 'Customize your tactical avatar.' }
        ].map((nav, i) => (
          <div key={i} className="glass-panel p-2 d-flex align-items-center gap-3 border-dark border-opacity-10 bg-white">
            <div className="stat-icon-wrapper text-primary p-2 bg-light rounded-3" style={{ width: 36, height: 36 }}>
              {nav.icon}
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: '0.8rem' }}>{nav.title}</div>
              <div className="text-muted fw-medium" style={{ fontSize: '0.65rem' }}>{nav.desc}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }
];

export default function Tutorial() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      navigate('/lobbies');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  return (
    <div className="page-container fit-screen no-scrollbar" style={{ overflow: 'hidden', height: '100vh', width: '100vw' }}>
      <div className="dashboard-mesh-bg" />
      
      <div className="container h-100 d-flex align-items-center justify-content-center">
        <div className="col-12 col-md-10 col-lg-7 position-relative z-1">
          <div className="glass-panel shadow-2xl" 
               style={{ 
                 borderRadius: '32px', 
                 background: 'rgba(255,255,255,0.95)', 
                 border: '2px solid #000',
                 height: '640px',
                 maxHeight: '85vh',
                 display: 'flex', 
                 flexDirection: 'column',
                 padding: '2rem',
                 margin: '0 auto'
               }}>
            
            {/* Header Area (Fixed) */}
            <div className="text-center mb-4" style={{ flexShrink: 0 }}>
              <div className="d-block mb-3">
                <div className="d-inline-flex p-3 rounded-circle bg-light shadow-sm animate-bounce-subtle">
                  {step.icon}
                </div>
              </div>
              <h1 className="display-6 fw-black header-gradient-text mb-3" style={{ letterSpacing: '-1.5px', fontSize: '2.2rem' }}>
                {step.title}
              </h1>
              <div className="d-flex justify-content-center gap-1">
                {STEPS.map((_, i) => (
                  <div key={i} 
                       style={{ 
                         width: i === currentStep ? 32 : 8, 
                         height: 6, 
                         borderRadius: 3, 
                         background: i === currentStep ? '#007AFF' : '#E5E5EA',
                         transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)'
                       }} />
                ))}
              </div>
            </div>

            {/* Content Body (Fixed Height with Overflow) */}
            <div className="flex-grow-1 overflow-hidden px-lg-4" style={{ position: 'relative' }}>
              <div className="h-100 w-100">
                {step.content}
              </div>
            </div>

            {/* Footer Actions (Fixed) */}
            <div className="d-flex justify-content-between align-items-center pt-4 border-top mt-4" style={{ flexShrink: 0 }}>
              <button 
                className="apple-btn-secondary" 
                onClick={handleBack}
                disabled={currentStep === 0}
                style={{ 
                  width: 'auto', 
                  visibility: currentStep === 0 ? 'hidden' : 'visible', 
                  padding: '10px 24px',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(0,0,0,0.1)'
                }}
              >
                <ChevronLeft size={20} /> Back
              </button>
              
              <button 
                className="apple-btn-primary" 
                onClick={handleNext}
                style={{ 
                  width: 'auto', 
                  padding: '12px 48px', 
                  background: '#000',
                  color: '#fff',
                  borderRadius: '16px',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: 'none'
                }}
              >
                <span>{currentStep === STEPS.length - 1 ? 'Start Mission' : 'Next Step'}</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .animate-bounce-subtle {
          animation: bounce-subtle 3s infinite ease-in-out;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .fw-black { font-weight: 900; }
        .shadow-2xl { box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.3); }
        .fit-screen { height: 100vh; width: 100vw; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
