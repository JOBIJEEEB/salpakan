import React from 'react';
import Swal from 'sweetalert2';

export default function VersionBadge() {
  const showChangelog = () => {
    Swal.fire({
      title: '<span class="fw-black">v1.2.2: Dev notes</span>',
      html: `
        <div class="text-start" style="font-size: 0.9rem; line-height: 1.6;">
          <div class="mb-3">
            <strong style="color: #007AFF;">UI Changes:</strong>
            <ul class="ps-3 mt-1">
              <li>UI/UX overhaul. Navigation and rank tracking UI improvements.</li>
              <li>Added more profile options.</li>
              <li>Added page transitions (Framer Motion).</li>
              <li>Fixed redundant entry animations and layout stability.</li>
              <li>Utilized vanta.js for dynamic background.</li>
              <li>Modernized Match History with RR change badges.</li>
            </ul>
          </div>
          <div class="mb-3">
            <strong style="color: #34C759;">QoL & Competitive:</strong>
            <ul class="ps-3 mt-1">
              <li>Lobby Expiry: Active lobbies now expire after 3 minutes of inactivity.</li>
              <li>Atomic RR Sync: Implemented Supabase RPC for reliable rating updates.</li>
              <li>Rejoin Logic: Guests can now rejoin their original match if disconnected.</li>
              <li>Smart Surrender: Context-aware lobby management for Host/Guest.</li>
            </ul>
          </div>
          <div>
            <strong style="color: #FF3B30;">Bug Fixes & Polish:</strong>
            <ul class="ps-3 mt-1">
              <li>Fixed 404 on page refreshes via vercel.json.</li>
              <li>Resolved "View Pieces" state revert bug on tab switch.</li>
              <li>Specialized end-game alerts for 0 RR losses (Skill issue :().</li>
              <li>Cleaned up CSS and React hook dependencies.</li>
            </ul>
          </div>
        </div>
      `,
      confirmButtonText: 'Great!',
      confirmButtonColor: '#000',
      customClass: { popup: 'apple-swal', title: 'apple-swal-title', confirmButton: 'apple-swal-confirm' }
    });
  };

  return (
    <div className="d-flex flex-column align-items-center gap-3 mt-5 mb-4 pb-3 opacity-70">
      <div className="d-flex align-items-center gap-3">
        <div className="d-flex align-items-center gap-2">
          <span style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', color: '#86868B' }}>Made by:</span>
          <a href="https://github.com/JOBIJEEEB" target="_blank" rel="noopener noreferrer" className="text-decoration-none d-flex align-items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="fw-bold" style={{ color: '#000', fontSize: '0.75rem' }}>JB Hernandez</span>
          </a>
        </div>

        <div style={{ width: 1, height: 12, background: 'rgba(0,0,0,0.1)' }} />

        <div className="d-flex align-items-center gap-2">
          <span className="badge rounded-pill fw-black"
            style={{ background: 'rgba(0,0,0,0.05)', color: '#000', fontSize: '0.65rem', padding: '4px 10px' }}>
            1.2.2
          </span>
          <button onClick={showChangelog} className="badge rounded-pill border-0 px-2 py-1 transition-all hover-scale"
            style={{ background: 'var(--system-blue)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}>
            Dev Notes
          </button>
        </div>
      </div>
    </div>
  );
}
