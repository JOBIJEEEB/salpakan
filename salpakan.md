# Salpakan: Technical Specification & Development Roadmap

## Project Context
The goal is to build an online version of the Game of the Generals, officially named **Salpakan**. The game rules follow the factual mechanics of the original board game invented by Sofronio H. Pasola Jr. in 1970. 

The application is deployed on Vercel, utilizing Supabase for backend infrastructure. A core pillar of the design is **accessibility for new players**, ensuring the notoriously steep learning curve of the physical game is smoothed out through intuitive UI, contextual tips, and interactive tutorials.

## Design System & UI Reference
The design should closely mimic native iOS and Apple software applications, focusing on minimalism, clarity, and premium aesthetics.
* **Colors:** A clean palette featuring a stark white or very light gray background (or a deep, pure black for dark mode). Accents should use standard "System Blue" (like iOS `#007AFF`) for primary buttons and active states.
* **Typography:** Use a clean, modern sans-serif font like Inter, San Francisco (SF Pro), or Helvetica Neue. Emphasize visual hierarchy using font weights (e.g., bold for headers, regular for body text, muted gray for subtitles).
* **Components:** Utilize Apple's signature "frosted glass" (acrylic) effect for navigation bars and floating containers. This means a light, translucent background with heavy background blur, soft rounded corners (squircles), and very subtle, diffuse drop shadows to create depth.
* **Forms:** Inputs should be clean with soft rounded edges, light gray backgrounds, and clear, accessible placeholder text.
* **Help Elements:** Subtle info icons (`i` in a circle) that reveal clean, floating popovers/tooltips containing bite-sized tips.

## Technology Stack
* **Frontend:** React with Vite
* **Styling:** Bootstrap (customized heavily with CSS to achieve the Apple/iOS minimalist look)
* **Backend/BaaS:** Supabase (Auth, Postgres, Realtime, Edge Functions)
* **Deployment:** Vercel

## Project Structure Overview
The file architecture will be organized as follows:
* `src/assets/` - Image files including `salpakan_LOGO.png`, `salpakan_text.png`, and `salpakan_banner.png`.
* `src/components/` - Reusable UI (Top Navigation, Frosted Glass Containers, Rounded Buttons, Game Board, Tooltips).
* `src/pages/` - Main screens (Onboarding/Login, Lobbies, VS AI, Leaderboard, News, About, Rules, Active Match, Tutorial).
* `src/context/` - Global state management (e.g., `AuthContext`, `GameContext`, `TutorialContext`).
* `src/lib/` - Helper files and integrations (e.g., `supabaseClient.js`).

---

## Development Phases

### Phase 1: Backend & Authentication Infrastructure (Completed)
* **Database Initialization:** Set up the Supabase project.
* **Auth Providers:** Enable Email/Password authentication and Google OAuth.
* **Schema Creation:** Create the `user_profiles` table. Add a boolean column `has_completed_tutorial` (default: false). Add ranking columns: `command_rating` (Integer, default 1000), `peak_rating`, `wins`, `losses`, `draws`.
* **Security:** Configure Row Level Security (RLS) policies.

### Phase 2: Client Routing & State Management (Completed)
* **State Management:** Build `AuthContext`.
* **Router Setup:** Implement React Router for Public and Protected routes.
* **Access Control:** Create protected route wrappers.

### Phase 3: UI/UX Implementation & Onboarding (Completed)
* **Top Navigation Bar:** Implement frosted glass navigation.
* **Onboarding View:** Clean, minimalist iOS-style login and registration forms.
* **Contextual Help:** Build a reusable Tooltip component to wrap around confusing terminology (e.g., hovering over "VS AI" explains it's a practice mode).

### Phase 4: Matchmaking & Lobby System (Next Steps)
* **Lobby Database Schema:** Create a `matches` table tracking `host_id`, `guest_id`, `status` (waiting, in_progress, completed), and `privacy` (public/private).
* **Supabase Realtime:** Implement Supabase Realtime subscriptions so the Lobbies page updates instantly when a new match is created or joined.
* **Match Initialization:** Create the UI for hosts to generate a lobby code (for private matches) and for guests to join. Once a guest joins, route both players to the Active Match view.

### Phase 5: First-Time User Experience (FTUE) & Tutorial
* **Tutorial Intercept:** When a new user clicks "Lobbies" or "VS AI" for the first time, intercept the routing and prompt them with an optional "Commander's Briefing" (Interactive Tutorial).
* **Interactive Guide:** Build a guided, scripted VS AI scenario. Highlight specific UI elements using a dark overlay with spotlights.
* **Rank Hierarchy Tool:** Create an always-accessible, collapsible slide-out drawer or modal showing the "Chain of Command" (which piece defeats which), so players don't have to memorize it immediately.

### Phase 6: Core Game Board & Piece Deployment
* **Board UI:** Build a 9x8 grid (72 squares) representing the board using React. Implement clean, minimalist board cells.
* **Piece Management:** Create draggable/clickable game pieces representing the 21 officers per player.
* **Deployment Phase Logic:** Allow players to place their pieces secretly on the first 3 rows closest to them. Include "Recommended Formations" (Quick Deploy presets) for new players. The opponent's pieces must appear as generic backs.

### Phase 7: Combat Logic & Secure Arbiter (Critical Phase)
* **Movement:** A piece can move exactly one square at a time: forward, backward, left, or right (no diagonal moves).
* **The Arbiter Problem:** Game of the Generals requires a neutral arbiter to compare piece ranks without revealing them to the players. 
* **Secure Server Arbitration:** Write Supabase Postgres Functions (RPC) or Edge Functions to handle combat ("Salpakan").
    * Higher Rank Wins: Lower-ranking piece is removed.
    * Tie: Both destroyed.
    * Spy: Defeats ALL officers (5-Star down to Corporal). Defeated by Private.
* **Combat Feedback:** Provide clear, simple text in a "Battle Log" (e.g., "Your 1-Star General defeated an unknown enemy piece").
* **Win Conditions:** Implement logic to detect when the Flag is captured, or when a Flag successfully reaches the opposite end of the board (and survives for one full turn).

### Phase 8: Leaderboards, AI, & Polish
* **Leaderboard View:** Implement a clean, frosted-glass list view for the Leaderboard. Display Top 3 on a podium. Show Rank Number, Icon, Username, Win Rate, and Command Rating.
* **Rank Tiers:** Implement visual progression based on CR (Cadet [0-799], Private, Sergeant, Lieutenant, Captain, Major, Colonel, General, Five-Star General [Top 10 Globally]).
* **Elo Algorithm Edge Function:** Implement a secure Edge Function triggered after public matches to calculate the new CR using standard Elo rating logic: $R_{A, new} = R_{A, old} + K \times (S_A - E_A)$. Ensure K-factor scales based on tier (K=40 for beginners, K=16 for Generals).
* **VS AI Mode:** Implement a basic computer opponent. Add difficulty levels (Recruit, Veteran, General).
* **Global Chat:** Implement a floating global chat utilizing Supabase Realtime messaging.

### Phase 9: Production Deployment & QA
* **Vercel Integration:** Connect the GitHub repository to Vercel for continuous deployment.
* **Environment Variables:** Securely map production Supabase keys in Vercel settings.
* **Final QA:** Conduct end-to-end testing of full match lifecycles.