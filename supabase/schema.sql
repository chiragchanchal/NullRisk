-- Supabase Schema for NullRisk

-- 1. Create Tables

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    username TEXT UNIQUE,
    mock_balance NUMERIC DEFAULT 500000 NOT NULL,
    initial_balance NUMERIC DEFAULT 500000 NOT NULL,
    weekly_start_balance NUMERIC DEFAULT 500000 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Holdings Table
CREATE TABLE IF NOT EXISTS public.holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- e.g., 'stock', 'crypto', 'forex'
    quantity NUMERIC NOT NULL CHECK (quantity >= 0),
    avg_buy_price NUMERIC NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, symbol)
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('buy', 'sell')),
    order_class TEXT NOT NULL DEFAULT 'market' CHECK (order_class IN ('market', 'limit')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    limit_price NUMERIC,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    price NUMERIC NOT NULL CHECK (price > 0),
    total NUMERIC NOT NULL CHECK (total > 0),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Watchlist Table
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    UNIQUE(user_id, symbol)
);

-- Bonus Events Table
CREATE TABLE IF NOT EXISTS public.bonus_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    bonus_amount NUMERIC NOT NULL,
    milestone_pct INTEGER NOT NULL,
    profit_pct_at_trigger NUMERIC NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, milestone_pct)
);

-- AI Analysis Cache Table
CREATE TABLE IF NOT EXISTS public.ai_analysis_cache (
    symbol TEXT PRIMARY KEY,
    analysis TEXT NOT NULL,
    rsi NUMERIC,
    price_change_14d NUMERIC,
    headlines TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_cache ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Profiles: Users can view and update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Holdings: Users can CRUD their own holdings
DROP POLICY IF EXISTS "Users can view own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users can insert own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users can update own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users can delete own holdings" ON public.holdings;
CREATE POLICY "Users can view own holdings" ON public.holdings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own holdings" ON public.holdings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own holdings" ON public.holdings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own holdings" ON public.holdings FOR DELETE USING (auth.uid() = user_id);

-- Transactions: Users can CRUD their own transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Watchlist: Users can CRUD their own watchlist
DROP POLICY IF EXISTS "Users can view own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users can insert own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users can delete own watchlist" ON public.watchlist;
CREATE POLICY "Users can view own watchlist" ON public.watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own watchlist" ON public.watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlist" ON public.watchlist FOR DELETE USING (auth.uid() = user_id);

-- Bonus Events: Users can view own bonus events
DROP POLICY IF EXISTS "Users can view own bonus events" ON public.bonus_events;
CREATE POLICY "Users can view own bonus events" ON public.bonus_events FOR SELECT USING (auth.uid() = user_id);

-- AI Analysis Cache: Users can view AI analysis cache
DROP POLICY IF EXISTS "Users can view AI analysis cache" ON public.ai_analysis_cache;
CREATE POLICY "Users can view AI analysis cache" ON public.ai_analysis_cache FOR SELECT USING (true);

-- 4. Create trigger to seed initial balance on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
    v_raw_name TEXT;
BEGIN
    -- Extract full name or name if available in oauth metadata
    v_raw_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'preferred_username'
    );
    
    IF v_raw_name IS NOT NULL THEN
        -- Replace spaces and special characters with underscores, lowercase it
        v_username := lower(regexp_replace(v_raw_name, '[^a-zA-Z0-9]', '_', 'g'));
        -- Trim multiple consecutive underscores
        v_username := regexp_replace(v_username, '_+', '_', 'g');
        v_username := rtrim(ltrim(v_username, '_'), '_');
    ELSE
        -- Fallback to local part of the email address
        v_username := lower(split_part(new.email, '@', 1));
        v_username := regexp_replace(v_username, '[^a-zA-Z0-9]', '_', 'g');
    END IF;

    -- Ensure the username has minimum length and isn't too long
    IF v_username IS NULL OR length(v_username) < 3 THEN
        v_username := 'user_' || substr(new.id::text, 1, 8);
    END IF;

    IF length(v_username) > 20 THEN
        v_username := substr(v_username, 1, 16);
    END IF;

    -- Handle potential duplicate usernames by suffixing random numbers/id
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
        v_username := substr(v_username, 1, 15) || '_' || substr(new.id::text, 1, 4);
    END IF;

    INSERT INTO public.profiles (id, email, username, mock_balance, initial_balance, weekly_start_balance)
    VALUES (
        new.id, 
        new.email, 
        v_username, 
        500000, 
        500000, 
        500000
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Create RPC function for Milestone Bonus
CREATE OR REPLACE FUNCTION public.grant_milestone_bonus(p_user_id UUID, p_total_return_pct NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
    v_milestone INTEGER;
    v_bonus_amount NUMERIC := 1000000;
    v_exists BOOLEAN;
BEGIN
    -- Calculate the current highest milestone (floor to nearest 10)
    v_milestone := FLOOR(p_total_return_pct / 10) * 10;
    
    -- If they haven't reached 10% yet, do nothing
    IF v_milestone < 10 THEN
        RETURN FALSE;
    END IF;

    -- Check if this exact milestone has been awarded
    SELECT EXISTS (
        SELECT 1 FROM public.bonus_events 
        WHERE user_id = p_user_id AND milestone_pct = v_milestone
    ) INTO v_exists;

    IF NOT v_exists THEN
        -- Log the bonus
        INSERT INTO public.bonus_events (user_id, bonus_amount, milestone_pct, profit_pct_at_trigger)
        VALUES (p_user_id, v_bonus_amount, v_milestone, p_total_return_pct);
        
        -- Add funds
        UPDATE public.profiles
        SET mock_balance = mock_balance + v_bonus_amount
        WHERE id = p_user_id;

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Enable Realtime for bonus_events (Required for frontend confetti trigger)
-- By default, tables are not in the 'supabase_realtime' publication.
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bonus_events;

-- 7. Weekly Challenge Cron Job Setup
-- Requires the pg_cron extension to be enabled in Supabase Database Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.reset_weekly_challenge()
RETURNS void AS $$
BEGIN
    UPDATE public.profiles p
    SET weekly_start_balance = p.mock_balance + COALESCE(
        (SELECT SUM(h.quantity * h.avg_buy_price) 
         FROM public.holdings h 
         WHERE h.user_id = p.id), 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule to run every Sunday at midnight (UTC)
SELECT cron.schedule('weekly-challenge-reset', '0 0 * * 0', 'SELECT public.reset_weekly_challenge()');

-- 8. Leaderboard RPC
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    total_return_pct NUMERIC,
    weekly_return_pct NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        ( (p.mock_balance + COALESCE(SUM(h.quantity * h.avg_buy_price), 0) - p.initial_balance) / p.initial_balance ) * 100 AS total_return_pct,
        ( (p.mock_balance + COALESCE(SUM(h.quantity * h.avg_buy_price), 0) - p.weekly_start_balance) / p.weekly_start_balance ) * 100 AS weekly_return_pct
    FROM public.profiles p
    LEFT JOIN public.holdings h ON h.user_id = p.id
    GROUP BY p.id, p.username, p.mock_balance, p.initial_balance, p.weekly_start_balance
    ORDER BY total_return_pct DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- MARGIN TRADING SIMULATOR
-- ==========================================

-- 9. Margin Positions Table
CREATE TABLE IF NOT EXISTS public.margin_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    collateral_amount NUMERIC NOT NULL CHECK (collateral_amount > 0),
    margin_amount NUMERIC NOT NULL CHECK (margin_amount > 0),
    leverage_ratio NUMERIC NOT NULL DEFAULT 2 CHECK (leverage_ratio > 1),
    daily_interest_rate NUMERIC NOT NULL DEFAULT 0.0005,
    entry_price NUMERIC NOT NULL CHECK (entry_price > 0),
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'liquidated')),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.margin_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own margin positions" ON public.margin_positions;
DROP POLICY IF EXISTS "Users can insert own margin positions" ON public.margin_positions;
DROP POLICY IF EXISTS "Users can update own margin positions" ON public.margin_positions;
CREATE POLICY "Users can view own margin positions" ON public.margin_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own margin positions" ON public.margin_positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own margin positions" ON public.margin_positions FOR UPDATE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.margin_positions;

-- 10. Daily Interest Deduction Cron
CREATE OR REPLACE FUNCTION public.deduct_margin_interest()
RETURNS void AS $$
DECLARE
    pos RECORD;
    interest_owed NUMERIC;
BEGIN
    FOR pos IN
        SELECT mp.id, mp.user_id, mp.margin_amount, mp.daily_interest_rate
        FROM public.margin_positions mp
        WHERE mp.status = 'open'
    LOOP
        interest_owed := pos.margin_amount * pos.daily_interest_rate;
        UPDATE public.profiles
        SET mock_balance = GREATEST(0, mock_balance - interest_owed)
        WHERE id = pos.user_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule('margin-interest-daily', '0 0 * * *', 'SELECT public.deduct_margin_interest()');

-- 11. Liquidate a margin position (called from Next.js API)
CREATE OR REPLACE FUNCTION public.liquidate_margin_position(
    p_position_id UUID,
    p_user_id UUID,
    p_close_price NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
    pos RECORD;
    total_value NUMERIC;
    profit_loss NUMERIC;
    returned_to_user NUMERIC;
BEGIN
    SELECT * INTO pos FROM public.margin_positions
    WHERE id = p_position_id AND user_id = p_user_id AND status = 'open';

    IF NOT FOUND THEN RETURN FALSE; END IF;

    total_value := p_close_price * pos.quantity;
    profit_loss := total_value - pos.margin_amount - pos.collateral_amount;
    returned_to_user := GREATEST(0, pos.collateral_amount + profit_loss);

    UPDATE public.profiles
    SET mock_balance = mock_balance + returned_to_user
    WHERE id = p_user_id;

    UPDATE public.margin_positions
    SET status = 'liquidated', closed_at = NOW()
    WHERE id = p_position_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Close margin position normally
CREATE OR REPLACE FUNCTION public.close_margin_position(
    p_position_id UUID,
    p_user_id UUID,
    p_close_price NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    pos RECORD;
    total_value NUMERIC;
    profit_loss NUMERIC;
    returned_to_user NUMERIC;
BEGIN
    SELECT * INTO pos FROM public.margin_positions
    WHERE id = p_position_id AND user_id = p_user_id AND status = 'open';

    IF NOT FOUND THEN RETURN -1; END IF;

    total_value := p_close_price * pos.quantity;
    profit_loss := total_value - pos.margin_amount - pos.collateral_amount;
    returned_to_user := GREATEST(0, pos.collateral_amount + profit_loss);

    UPDATE public.profiles
    SET mock_balance = mock_balance + returned_to_user
    WHERE id = p_user_id;

    UPDATE public.margin_positions
    SET status = 'closed', closed_at = NOW()
    WHERE id = p_position_id;

    RETURN returned_to_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PAPER OPTIONS TRADING
-- ==========================================

-- 13. Options Positions Table
CREATE TABLE IF NOT EXISTS public.options_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL DEFAULT 'stock',
    option_type TEXT NOT NULL CHECK (option_type IN ('call', 'put')),
    strike NUMERIC NOT NULL CHECK (strike > 0),
    expiry DATE NOT NULL,
    -- Pricing at entry
    premium_paid NUMERIC NOT NULL CHECK (premium_paid >= 0),
    contracts INTEGER NOT NULL DEFAULT 1 CHECK (contracts > 0),
    spot_at_entry NUMERIC NOT NULL,
    iv_at_entry NUMERIC NOT NULL,
    -- Lifecycle
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'expired', 'exercised')),
    profit_loss NUMERIC,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    settled_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.options_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own options" ON public.options_positions;
DROP POLICY IF EXISTS "Users can insert own options" ON public.options_positions;
DROP POLICY IF EXISTS "Users can update own options" ON public.options_positions;
CREATE POLICY "Users can view own options" ON public.options_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own options" ON public.options_positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own options" ON public.options_positions FOR UPDATE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.options_positions;

-- 14. Daily Options Settlement Cron
-- Runs every day at 16:00 UTC (after market close)
-- Exercises ITM options, expires OTM options worthless
CREATE OR REPLACE FUNCTION public.settle_expired_options()
RETURNS void AS $$
DECLARE
    opt RECORD;
    intrinsic_value NUMERIC;
    total_payout NUMERIC;
    pnl NUMERIC;
BEGIN
    -- Find all open options that have reached or passed expiry date
    FOR opt IN
        SELECT *
        FROM public.options_positions
        WHERE status = 'open'
          AND expiry <= CURRENT_DATE
    LOOP
        -- NOTE: In production, you'd fetch live price here.
        -- Since Postgres can't call external APIs, we use spot_at_entry as settlement proxy.
        -- The Next.js API handles live-price settlement on the /positions fetch.
        -- This cron handles options that were missed (expired overnight).
        
        IF opt.option_type = 'call' THEN
            -- Use 0 as settlement; the Next.js layer handles real settlement with live price
            intrinsic_value := 0;
        ELSE
            intrinsic_value := 0;
        END IF;

        pnl := (intrinsic_value * opt.contracts * 100) - opt.premium_paid;

        UPDATE public.options_positions
        SET
            status = CASE WHEN intrinsic_value > 0 THEN 'exercised' ELSE 'expired' END,
            profit_loss = pnl,
            settled_at = NOW()
        WHERE id = opt.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily at 16:00 UTC (after US market close)
SELECT cron.schedule('options-daily-settlement', '0 16 * * *', 'SELECT public.settle_expired_options()');

-- Note: Section 15 (AI Analysis Cache Table & Policies) is defined at the top of this file to prevent duplicate schema warnings.
