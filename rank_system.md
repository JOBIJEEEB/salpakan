# Salpakan: Leaderboard & Rank System Specification

## 1. Overview
To foster healthy competition and provide a sense of progression, Salpakan utilizes an Elo-based matchmaking and ranking system. Players earn or lose **Command Rating (CR)** points based on the outcome of their public matches. Their CR determines their official military rank displayed on the Leaderboard and their user profile.

---

## 2. The Rank Tiers
Every new player starts with a base Command Rating of **1000**. As their CR fluctuates, they move through the following thematic rank tiers:

| Rank Title | Command Rating (CR) Requirement | Visual Representation (iOS Minimalist) |
| :--- | :--- | :--- |
| **Cadet** | 0 - 799 | Single muted gray chevron. |
| **Private** | 800 - 1099 | Single light blue chevron. |
| **Sergeant** | 1100 - 1399 | Three stacked system blue chevrons. |
| **Lieutenant** | 1400 - 1699 | Single silver bar. |
| **Captain** | 1700 - 1999 | Two parallel silver bars. |
| **Major** | 2000 - 2299 | Gold oak leaf. |
| **Colonel** | 2300 - 2599 | Silver eagle. |
| **General** | 2600+ | Single gold star. |
| **Five-Star General** | Top 10 Players Globally | Five gold stars arranged in a pentagon. |

---

## 3. Elo Rating Calculation Logic
The system uses a standard Elo algorithm to ensure fair point distribution:
* **Defeating a higher-ranked player** yields a significantly higher CR gain.
* **Defeating a lower-ranked player** yields a minimal CR gain.
* **Losing to a lower-ranked player** results in a heavy CR penalty.
* **Losing to a higher-ranked player** results in a minimal CR penalty.
* **Draw/Tie:** Minor adjustments are made; if there is a vast rank difference, the lower-ranked player might gain a slight amount of CR.

---

## 4. Database Schema Update (Supabase)
To support the Leaderboard, the following updates are required for the Supabase schema:

**Table:** `user_profiles` (or a dedicated `leaderboard_stats` table)
* `command_rating` (Integer) - Default: 1000. Tracks current Elo.
* `peak_rating` (Integer) - Default: 1000. Tracks the highest Elo achieved by the player.
* `wins` (Integer) - Default: 0.
* `losses` (Integer) - Default: 0.
* `draws` (Integer) - Default: 0.

**Edge Function: `calculate_elo`**
A secure Supabase Edge Function must be triggered at the end of every `public` match to calculate the new CR for both the winner and the loser, updating their profiles simultaneously to prevent tampering.

---

## 5. UI/UX Implementation (Leaderboard Page)
Following the Apple/iOS minimalist aesthetic:
* **The View:** A clean, frosted-glass list view. 
* **Top 3 Podium:** The top 3 players (Five-Star Generals) should be highlighted at the top of the page with subtle gold, silver, and bronze glowing drop shadows behind their pristine white user cards.
* **Player Rows:** Each row in the leaderboard should cleanly display:
  1. Rank Number (e.g., #4, #12)
  2. The Player's Rank Icon (Minimalist vector badge)
  3. Username
  4. Win Rate Percentage (Muted gray text)
  5. Total Command Rating (Bold, system blue text)
* **Current Player Focus:** A sticky banner at the very bottom of the screen showing the active user's current exact rank and CR, along with a progress bar showing points needed to reach the next rank tier.