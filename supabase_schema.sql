-- ============================================================
-- Salpakan: Supabase Schema — Phase 4–8
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── 1. Extend user_profiles ──────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS command_rating  INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS peak_rating     INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS wins            INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS draws           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_completed_tutorial BOOLEAN DEFAULT FALSE;

-- ── 2. Matches table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  guest_id    UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','in_progress','completed','cancelled')),
  privacy     TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public','private')),
  lobby_code  TEXT UNIQUE NOT NULL,
  game_state  JSONB,
  winner_id   UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Players can read matches they are part of, or any public waiting match
CREATE POLICY "Read own or public waiting matches" ON public.matches FOR SELECT
  USING (privacy = 'public' OR host_id = auth.uid() OR guest_id = auth.uid());

-- Only authenticated users can create matches
CREATE POLICY "Create match" ON public.matches FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Host or guest can update the match state
CREATE POLICY "Update own match" ON public.matches FOR UPDATE
  USING (host_id = auth.uid() OR guest_id = auth.uid());

-- ── 3. Chat messages table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          BIGSERIAL PRIMARY KEY,
  username    TEXT NOT NULL,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 200),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chat"   ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated can chat" ON public.chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── 4. Elo Edge Function (calculate_elo) ─────────────────────
-- Deploy this as a Supabase Edge Function (supabase/functions/calculate_elo/index.ts)
-- It is called server-side after a match completes to prevent tampering.
-- Formula: R_new = R_old + K * (S - E)   where E = 1/(1+10^((Rb-Ra)/400))
-- K = 40 if CR < 1100 | K = 32 if CR < 2300 | K = 16 otherwise

-- Alternatively, use this Postgres function for RPC calls:
CREATE OR REPLACE FUNCTION public.finish_match(
  p_match_id  UUID,
  p_winner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_host_id    UUID;
  v_guest_id   UUID;
  v_ra         INTEGER;
  v_rb         INTEGER;
  v_ea         FLOAT;
  v_ka         INTEGER;
  v_kb         INTEGER;
  v_sa         FLOAT;
  v_new_a      INTEGER;
  v_new_b      INTEGER;
BEGIN
  SELECT host_id, guest_id INTO v_host_id, v_guest_id
  FROM public.matches WHERE id = p_match_id;

  SELECT command_rating INTO v_ra FROM public.user_profiles WHERE id = v_host_id;
  SELECT command_rating INTO v_rb FROM public.user_profiles WHERE id = v_guest_id;

  v_ea := 1.0 / (1.0 + POWER(10.0, (v_rb - v_ra) / 400.0));
  v_ka := CASE WHEN v_ra < 1100 THEN 40 WHEN v_ra < 2300 THEN 32 ELSE 16 END;
  v_kb := CASE WHEN v_rb < 1100 THEN 40 WHEN v_rb < 2300 THEN 32 ELSE 16 END;
  v_sa := CASE WHEN p_winner_id = v_host_id THEN 1.0 WHEN p_winner_id IS NULL THEN 0.5 ELSE 0.0 END;

  v_new_a := ROUND(v_ra + v_ka * (v_sa - v_ea));
  v_new_b := ROUND(v_rb + v_kb * ((1.0 - v_sa) - (1.0 - v_ea)));

  -- Update host
  UPDATE public.user_profiles SET
    command_rating = v_new_a,
    peak_rating    = GREATEST(peak_rating, v_new_a),
    wins           = wins   + CASE WHEN p_winner_id = v_host_id  THEN 1 ELSE 0 END,
    losses         = losses + CASE WHEN p_winner_id = v_guest_id THEN 1 ELSE 0 END,
    draws          = draws  + CASE WHEN p_winner_id IS NULL      THEN 1 ELSE 0 END
  WHERE id = v_host_id;

  -- Update guest
  UPDATE public.user_profiles SET
    command_rating = v_new_b,
    peak_rating    = GREATEST(peak_rating, v_new_b),
    wins           = wins   + CASE WHEN p_winner_id = v_guest_id THEN 1 ELSE 0 END,
    losses         = losses + CASE WHEN p_winner_id = v_host_id  THEN 1 ELSE 0 END,
    draws          = draws  + CASE WHEN p_winner_id IS NULL      THEN 1 ELSE 0 END
  WHERE id = v_guest_id;

  -- Mark match complete
  UPDATE public.matches SET status = 'completed', winner_id = p_winner_id, updated_at = NOW()
  WHERE id = p_match_id;
END;
$$;

-- ── 5. Enable Realtime on matches & chat_messages ─────────────
-- Run in Supabase Dashboard → Database → Replication → add both tables to the replication set
-- Or via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
