# Salpakan: Elo Algorithm & Mathematical Formulas

## 1. Overview
The Salpakan matchmaking system uses a standard Elo rating algorithm to dynamically calculate Command Rating (CR) gains and losses. This ensures that rank progression remains fair and heavily factors in the skill difference between opposing players.

## 2. The Core Formulas

### A. Expected Score (Win Probability)
Before a match concludes, the system calculates the "Expected Score" (probability of winning) for both players based on their current Command Ratings.

For Player A against Player B, the expected score $E_A$ is calculated as:

$$E_A = \frac{1}{1 + 10^{(R_B - R_A) / 400}}$$

Where:
* $R_A$ = Player A's current Command Rating
* $R_B$ = Player B's current Command Rating

*Note: The Expected Score is a value between 0.0 and 1.0. If $E_A = 0.75$, the system expects Player A has a 75% chance to win.*

### B. Command Rating Update (The Adjustment)
Once the match finishes, the system compares the actual outcome against the Expected Score to determine the new Command Rating.

$$R_{A, new} = R_{A, old} + K \times (S_A - E_A)$$

Where:
* $R_{A, new}$ = Player A's new Command Rating
* $R_{A, old}$ = Player A's Command Rating before the match
* $K$ = The K-Factor (determines the maximum possible CR change, see Section 3)
* $S_A$ = The actual match score for Player A:
  * **1.0** for a Win
  * **0.5** for a Draw
  * **0.0** for a Loss
* $E_A$ = The Expected Score calculated in Step A

## 3. The K-Factor (Volatility Scale)
The $K$ value dictates how drastically ratings swing after a single game. To prevent rank inflation at higher tiers and allow new players to find their true rank faster, the K-Factor scales based on the player's current rank tier:

* **K = 40 (Volatile):** For players under 1100 CR (Cadets and Privates). Helps new players climb quickly if they win.
* **K = 32 (Standard):** For players between 1100 and 2299 CR (Sergeants up to Majors). Standard progression.
* **K = 16 (Stable):** For players at 2300 CR and above (Colonels and Generals). Makes climbing to the highest echelons much harder and protects top players from massive point losses due to a single bad game.

## 4. Edge Function Implementation Logic (Supabase)
When a match ends, the Supabase Edge Function (`calculate_elo`) should execute the following steps within a secure database transaction:

1. Fetch $R_A$, $R_B$, and their respective K-Factors from `user_profiles`.
2. Calculate Expected Scores $E_A$ and $E_B$. (Note: $E_A + E_B$ must always equal 1).
3. Apply the actual scores ($S_A$ and $S_B$).
4. Calculate $R_{A, new}$ and $R_{B, new}$ using the update formula.
5. Round the resulting values to the nearest integer.
6. Commit the updated ratings back to `user_profiles`.