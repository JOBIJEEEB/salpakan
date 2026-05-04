import React from 'react';
import Swal from 'sweetalert2';

export default function Footer() {
  return (
    <footer className="w-100 py-4 mt-auto">
      <div className="container">
        <div className="d-flex flex-column flex-row align-items-center justify-content-center gap-2 gap-md-4 text-muted">
          
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
            <button 
              onClick={() => {
                Swal.fire({
                  title: '<span class="fw-black">v1.2.2-beta: Dev notes</span>',
                  html: `
                    <div class="text-start" style="font-size: 0.9rem; line-height: 1.6;">
                      <div class="mb-3">
                        <strong style="color: #007AFF;">UI Changes:</strong>
                        <ul class="ps-3 mt-1">
                          <li>Added page transitions (Framer Motion).</li>
                          <li>Fixed redundant entry animations.</li>
                          <li>Layout stability fixes.</li>
                          <li>Utilized vanta.js for dynamic background.</li>
                        </ul>
                      </div>
                      <div class="mb-3">
                        <strong style="color: #34C759;">QoL Updates:</strong>
                        <ul class="ps-3 mt-1">
                          <li>Added timer for lobby creation (lobbies expire after 3 mins).</li>
                          <li>Enhanced match history with RR change badges.</li>
                        </ul>
                      </div>
                      <div>
                        <strong style="color: #FF3B30;">Bug Fixes:</strong>
                        <ul class="ps-3 mt-1">
                          <li>Fixed 404 on refreshes with vercel.json.</li>
                          <li>Cleaned up CSS rules and fixed hook dependencies.</li>
                        </ul>
                      </div>
                    </div>
                  `,
                  confirmButtonText: 'Great!',
                  confirmButtonColor: '#000',
                  customClass: { popup: 'apple-swal', title: 'apple-swal-title', confirmButton: 'apple-swal-confirm' }
                });
              }}
              className="badge rounded-pill fw-black border-0 transition-all hover-scale" 
              style={{ background: 'rgba(0,0,0,0.05)', color: '#000', fontSize: '0.7rem', cursor: 'pointer' }}
            >
              1.2.2-beta
            </button>
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
        .hover-scale:hover {
          transform: scale(1.05);
          background: rgba(0,0,0,0.1) !important;
        }
        .fw-black { font-weight: 900; }
      `}</style>
    </footer>
  );
}
