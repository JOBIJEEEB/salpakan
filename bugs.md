# Salpakan: Bug Tracker & UI/UX Revisions

## 🛑 1. Lobbies & Matchmaking
- [ ] **Host State Sync:** When a guest joins a lobby, the host is stuck on "Waiting for opponent" despite the opponent successfully entering the room.
- [ ] **Unintended Page Reloads:** Swapping tabs causes the page to reload entirely. State should persist without refreshing.
- [ ] **Rejoin Logic:** Players are currently unable to rejoin their own active lobbies if they disconnect or refresh.
- [ ] **Private Match Validation:** Entering a valid lobby code for a private match erroneously returns: "Lobby not found or already started."
- [ ] **Dynamic Username Display:** When joining a lobby, the UI statically says "Playing as guest". This must be updated dynamically to display the joining user's actual username.
- [ ] **Comprehensive QA Pass:** The overall lobby and game state is highly unstable. A comprehensive end-to-end test of all components is required before marking this phase complete.

## ⚔️ 2. Battlefield & Active Game UI
- [ ] **Graveyard/Captured Pieces Logic:** The current piece tab incorrectly shows the enemy's available pieces. Redesign this tab to act as a "Graveyard" that **only shows the pieces the user has lost**. Do not show enemy piece information here.
- [ ] **Chain of Command Guide:** The Piece Guide / Chain of Command reference is missing. Implement this on the **left side** of the screen.
- [ ] **Terminal Battle Log:** Relocate the battle logs to be displayed **under** the battlefield grid. Apply a "terminal/console" aesthetic to this log.
- [ ] **Dynamic Player POV (Board Rotation):** The board perspective must always anchor the active player to the bottom of the screen, regardless of their color. 
    * **If User is Blue:** Enemy pieces (Red) are at the top, User pieces (Blue) are at the bottom.
    * **If User is Red:** Enemy pieces (Blue) are at the top, User pieces (Red) are at the bottom.