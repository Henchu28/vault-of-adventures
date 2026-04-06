-- Drop the existing overly permissive UPDATE policy
DROP POLICY "Users can update their own profile" ON public.profiles;

-- Create a new UPDATE policy that prevents role changes
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid()));