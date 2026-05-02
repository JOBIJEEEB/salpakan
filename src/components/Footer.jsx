import React from 'react';

export default function Footer() {
  return (
    <footer className="w-100 py-4 mt-auto">
      <div className="container">
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-center gap-2 gap-md-4 text-muted">
          
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Made by:
            </span>
            <a 
              href="https://github.com/JOBIJEEEB" 
              target="_blank" 
              rel="noopener noreferrer"
              className="d-flex align-items-center gap-2 text-decoration-none transition-all hover-dark"
              style={{ color: 'inherit' }}
            >
              <div className="p-1 rounded-circle bg-dark text-white d-flex align-items-center justify-content-center" style={{ width: 24, height: 24 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
              </div>
              <span className="fw-black" style={{ color: '#000', fontSize: '0.85rem' }}>JB Hernandez</span>
            </a>
          </div>

          <div className="d-none d-md-block" style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.1)' }} />

          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Version:
            </span>
            <span className="badge rounded-pill fw-black" style={{ background: 'rgba(0,0,0,0.05)', color: '#000', fontSize: '0.7rem' }}>
              1.2
            </span>
          </div>

        </div>
      </div>

      <style>{`
        .hover-dark:hover {
          opacity: 0.7;
          transform: translateY(-1px);
        }
        .transition-all {
          transition: all 0.2s ease;
        }
        .fw-black { font-weight: 900; }
      `}</style>
    </footer>
  );
}
