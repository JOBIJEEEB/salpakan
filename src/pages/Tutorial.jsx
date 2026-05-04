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
          Salpakan (Game of the Generals) is a proud piece of Philippine culture, invented in 1970 by <b>Sofronio H. Pasola Jr.</b> to celebrate strategy and psychological warfare.
        </p>
        <div className="glass-panel p-4 bg-white border-dark border-opacity-10 shadow-sm text-start">
          <h6 className="fw-black text-uppercase d-flex align-items-center gap-2 mb-3" style={{ fontSize: '0.7rem', color: '#007AFF' }}>
            <Code size={14} /> Developed by: <a href="https://github.com/JOBIJEEEB" target="_blank" rel="noopener noreferrer" className="text-decoration-none" style={{ color: 'inherit' }}>JB Hernandez</a>
          </h6>
          <p className="mb-0 small fw-medium" style={{ lineHeight: '1.6' }}>
            To honor the legacy of Game of the Generals, I engineered this digital platform to bring the classic Philippine board game into the modern era integrated with competitive leaderboard and community features.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'welcome',
    title: 'Salpakan na!',
    icon: <Gamepad2 size={48} className="text-primary" />,
    content: (
      <div className="text-center animate-fade-in h-100 d-flex flex-column justify-content-center">
        <p className="text-muted mb-4 fw-medium">
          Take command of your units. Plan your moves carefully and outthink your opponent to win the war.
        </p>
        <div className="glass-panel p-4 text-start bg-white-50 border-dark border-opacity-10">
          <h6 className="fw-black text-uppercase d-flex align-items-center gap-2 mb-3" style={{ fontSize: '0.7rem', color: '#FF3B30' }}>
            <Target size={16} /> How to Win?
          </h6>
          <ul className="mb-0 small d-flex flex-column gap-2 fw-bold">
            <li><b>Capture the Flag</b>: Locate and eliminate the enemy Flag piece.</li>
            <li><b>Reach the Edge</b>: Move your Flag to the opponent's back row.</li>
            <li><b>Ubusin! Ubusin!</b>: Wipe out all opposing mobile pieces.</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'hierarchy',
    title: 'Pieces Hierarchy',
    icon: <Swords size={48} className="text-primary" />,
    content: (
      <div className="animate-fade-in h-100 d-flex flex-column justify-content-start pt-2">
        <p className="text-center text-muted small mb-2 fw-medium">
          Higher-ranking pieces eliminate lower-ranking ones.
        </p>
        <div className="row g-1 mb-2 px-1">
          {[...PIECE_DEFS]
            .sort((a, b) => b.rank - a.rank)
            .map((def) => {
              const isSpecial = def.type === 'FLAG' || def.type === 'SPY';
              const displayRank = isSpecial ? 'S' : (def.rank - 1);
              return (
                <div key={def.type} className="col-4">
                  <div className="glass-panel p-1 px-2 d-flex align-items-center gap-1" 
                       style={{ 
                         borderLeft: `2px solid ${isSpecial ? '#FF9500' : (def.rank > 10 ? '#e67710ff' : '#0966cfff')}`, 
                         background: '#ffffffff', 
                         height: '32px' 
                       }}>
                    <div className="fw-black text-center" style={{ fontSize: '0.6rem', width: 14, color: isSpecial ? '#FF9500' : '#000' }}>
                      {displayRank}
                    </div>
                    <div className="fw-bold text-truncate" style={{ fontSize: '0.6rem', color: '#000' }}>
                      {def.label} {isSpecial && <span style={{ fontSize: '0.5rem', opacity: 0.5 }}>(Special)</span>}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
        <div className="glass-panel p-3 bg-white-subtle border-info border-opacity-25 shadow-sm">
          <h6 className="fw-bold mb-1" style={{ fontSize: '0.7rem' }}>Special Combat Rules:</h6>
          <ul className="mb-0 fw-bold" style={{ fontSize: '0.6rem', paddingLeft: '1.2rem' }}>
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
    title: 'Page Navigation',
    icon: <Map size={48} className="text-primary" />,
    content: (
      <div className="d-flex flex-column gap-2 animate-fade-in h-100 justify-content-center">
        {[
          { icon: <Gamepad2 size={18} />, title: 'Play', desc: 'Host live matches and climb the competitive ladder.' },
          { icon: <Swords size={18} />, title: 'Practice', desc: 'Sharpen your tactics against elite AI commanders.' },
          { icon: <Trophy size={18} />, title: 'Rankings', desc: 'View global standings and seasonal leaderboards.' },
          { icon: <User size={18} />, title: 'Profile', desc: 'Customize your callsign, avatar, and view stats.' }
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
            
            {/* Content Transition Wrapper */}
            <div key={currentStep} className="animate-slide-up d-flex flex-column h-100 overflow-hidden">
              {/* Header Area (Fixed) */}
              <div className="text-center mb-1" style={{ flexShrink: 0 }}>
                <div className="d-block mb-1">
                  <div className="d-inline-flex p-2 rounded-circle bg-light shadow-sm animate-bounce-subtle">
                    {step.icon}
                  </div>
                </div>
                <h1 className="display-6 fw-black header-gradient-text mb-2" style={{ letterSpacing: '-1.5px', fontSize: '2.0rem' }}>
                  {step.title}
                </h1>
                <div className="d-flex justify-content-center gap-1">
                  {STEPS.map((_, i) => (
                    <div key={i} 
                         style={{ 
                           width: i === currentStep ? 32 : 8, 
                           height: 4, 
                           borderRadius: 2, 
                           background: i === currentStep ? '#007AFF' : '#E5E5EA',
                           transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)'
                         }} />
                  ))}
                </div>
              </div>

              {/* Content Body (Fixed Height with Overflow) */}
              <div className="flex-grow-1 overflow-hidden px-lg-4 mt-3" style={{ position: 'relative' }}>
                <div className="h-100 w-100">
                  {step.content}
                </div>
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
                  background: '#007AFF',
                  color: '#fff',
                  borderRadius: '16px',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: 'none'
                }}
              >
                <span>{currentStep === STEPS.length - 1 ? 'Salpakan na!' : 'Next'}</span>
                <ChevronRight size={18} color="#ffffff" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .animate-slide-up {
          animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
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
