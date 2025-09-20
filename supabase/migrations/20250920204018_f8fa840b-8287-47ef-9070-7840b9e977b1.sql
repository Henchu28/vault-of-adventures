-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('master', 'player');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'player',
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, display_name)
  VALUES (
    NEW.id, 
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'player'),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to check if user has role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create notes table for master's campaign notes
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  folder_path TEXT DEFAULT '/',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notes (only masters can access)
CREATE POLICY "Only masters can access notes" 
ON public.notes 
FOR ALL
USING (public.has_role(auth.uid(), 'master') AND auth.uid() = user_id);

-- Create trigger for notes timestamp updates
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on existing tables and add policies
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaigns (everyone can view, only masters can modify)
CREATE POLICY "Everyone can view campaigns" 
ON public.campaigns 
FOR SELECT 
USING (true);

CREATE POLICY "Masters can modify campaigns" 
ON public.campaigns 
FOR ALL
USING (public.has_role(auth.uid(), 'master'));

-- RLS policies for characters (everyone can view, only masters can modify)
CREATE POLICY "Everyone can view characters" 
ON public.characters 
FOR SELECT 
USING (true);

CREATE POLICY "Masters can modify characters" 
ON public.characters 
FOR ALL
USING (public.has_role(auth.uid(), 'master'));

-- RLS policies for maps (everyone can view, only masters can modify)
CREATE POLICY "Everyone can view maps" 
ON public.maps 
FOR SELECT 
USING (true);

CREATE POLICY "Masters can modify maps" 
ON public.maps 
FOR ALL
USING (public.has_role(auth.uid(), 'master'));

-- RLS policies for npcs (everyone can view, only masters can modify)
CREATE POLICY "Everyone can view npcs" 
ON public.npcs 
FOR SELECT 
USING (true);

CREATE POLICY "Masters can modify npcs" 
ON public.npcs 
FOR ALL
USING (public.has_role(auth.uid(), 'master'));

-- RLS policies for songs (everyone can view and modify)
CREATE POLICY "Everyone can access songs" 
ON public.songs 
FOR ALL
USING (true);