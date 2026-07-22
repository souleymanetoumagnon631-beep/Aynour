-- Script de création de la table orders pour Supabase
-- Exécuter ce script dans l'éditeur SQL de votre Dashboard Supabase

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_reference TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'Argent',
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'XOF',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'cancelled'
    session_token TEXT,
    transaction_id TEXT,
    net_amount INTEGER,
    customer_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide par référence et par sessionToken
CREATE INDEX IF NOT EXISTS idx_orders_reference ON public.orders(order_reference);
CREATE INDEX IF NOT EXISTS idx_orders_session_token ON public.orders(session_token);

-- Activer Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Politique pour autoriser la lecture et l'insertion anonymes (ou via clé de service)
CREATE POLICY "Allow public insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read by order_reference" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow service role update" ON public.orders FOR UPDATE USING (true);
