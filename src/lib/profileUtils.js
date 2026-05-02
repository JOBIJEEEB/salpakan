import Swal from 'sweetalert2';
import { getRankTier } from './rankUtils';

export const showPlayerProfile = (player) => {
  const tier = getRankTier(player.command_rating);
  const winRate = (player.wins + player.losses) > 0 
    ? Math.round((player.wins / (player.wins + player.losses)) * 100) 
    : 0;

  Swal.fire({
    background: '#ffffff',
    showConfirmButton: false,
    showCloseButton: true,
    customClass: {
      popup: 'profile-card-popup',
    },
    html: `
      <div class="profile-preview-card text-center p-2">
        <div class="mb-4 d-flex justify-content-center">
          <div style="position: relative; width: 120px; height: 120px;">
            <div style="
              width: 100%; 
              height: 100%; 
              border-radius: 50%; 
              border: 4px solid #F2F2F7; 
              padding: 4px; 
              background: #fff;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              overflow: hidden;
            ">
              <img 
                src="https://api.dicebear.com/7.x/${player.avatar_style || 'notionists'}/svg?seed=${player.avatar_seed || player.username}&backgroundColor=b6e3f4,c0aede,d1d4f9" 
                style="width: 100%; height: 100%; border-radius: 50%;"
              />
            </div>
            <div style="
              position: absolute; 
              bottom: 0; 
              right: 0; 
              width: 44px; 
              height: 44px; 
              background: #fff; 
              border-radius: 12px; 
              padding: 4px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.2);
              z-index: 10;
            ">
              <img src="${tier.icon}" style="width: 100%; height: 100%;" />
            </div>
          </div>
        </div>

        <h2 style="font-weight: 900; letter-spacing: -1.5px; font-size: 1.8rem; margin-bottom: 4px; color: #000;">
          ${player.username}
        </h2>
        <div style="color: ${tier.color}; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-size: 0.8rem; margin-bottom: 24px;">
          ${tier.name} · ${player.command_rating} RR
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 16px; background: #F2F2F7; border-radius: 20px;">
          <div>
            <div style="font-size: 0.65rem; font-weight: 800; color: #8E8E93; text-transform: uppercase;">Wins</div>
            <div style="font-size: 1.1rem; font-weight: 900; color: #000;">${player.wins}</div>
          </div>
          <div style="border-left: 1px solid rgba(0,0,0,0.05); border-right: 1px solid rgba(0,0,0,0.05);">
            <div style="font-size: 0.65rem; font-weight: 800; color: #8E8E93; text-transform: uppercase;">Losses</div>
            <div style="font-size: 1.1rem; font-weight: 900; color: #000;">${player.losses}</div>
          </div>
          <div>
            <div style="font-size: 0.65rem; font-weight: 800; color: #8E8E93; text-transform: uppercase;">Winrate</div>
            <div style="font-size: 1.1rem; font-weight: 900; color: #007AFF;">${winRate}%</div>
          </div>
        </div>

        <div style="margin-top: 24px; padding: 12px; border-radius: 16px; border: 1px dashed #C7C7CC; font-size: 0.75rem; color: #8E8E93; font-weight: 600;">
          ${player.created_at 
            ? `Commanding since ${new Date(player.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` 
            : 'Elite Tactical Commander'}
        </div>
      </div>
    `
  });
};
