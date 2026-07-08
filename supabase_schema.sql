-- ==========================================
-- SUPABASE DATABASE SCHEMA & RLS POLICIES
-- ==========================================

-- 1. Create Profile Roles type
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- 2. Create Profiles Table (Linked to auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'user'::user_role,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Ebooks Table
CREATE TABLE public.ebooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  prix NUMERIC NOT NULL CHECK (prix >= 0),
  url_couverture TEXT NOT NULL,
  url_fichier_storage TEXT NOT NULL, -- PDF file name or Storage Path
  categorie TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Achats (Purchases) Table
CREATE TABLE public.achats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  ebook_id UUID REFERENCES public.ebooks ON DELETE CASCADE NOT NULL,
  token_pay TEXT UNIQUE NOT NULL, -- MoneyFusion unique identifier
  statut TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failure, no paid
  montant NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achats ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );

-- Ebooks policies
CREATE POLICY "Anyone can view ebooks" ON public.ebooks
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert ebooks" ON public.ebooks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );

CREATE POLICY "Only admins can update ebooks" ON public.ebooks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );

CREATE POLICY "Only admins can delete ebooks" ON public.ebooks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );

-- Achats policies
CREATE POLICY "Users can view their own purchases" ON public.achats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases" ON public.achats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );

-- Note: Webhooks will run server-side using the SUPABASE_SERVICE_ROLE_KEY (Service Role bypasses RLS).
-- This allows the Express server to create and update payment history and transactions safely.


-- ==========================================
-- AUTOMATION & TRIGGERS
-- ==========================================

-- Automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'user'::user_role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Automatically update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ==========================================
-- STORAGE BUCKETS
-- ==========================================
-- You should create two buckets in Supabase Storage:
-- 1. "couvertures" (Public) - For book cover images.
-- 2. "ebooks-fichiers" (Private) - For the actual ebook PDF files.
--
-- Secure download access is implemented via our server-side API which validates the purchase
-- and generates an URL-signed download link expiring after 60 seconds.
