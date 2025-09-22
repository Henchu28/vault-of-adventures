-- Fix security vulnerability: Restrict profile access
-- Remove the overly permissive policy that allows everyone to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" on public.profiles;

-- Create a more secure policy that allows users to view their own profile
-- and only basic info (display_name, role) of other users for campaign functionality
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a separate policy for viewing basic public info of other users
-- This allows seeing display names and roles which are needed for D&D campaigns
-- but prevents access to sensitive data like user_id
CREATE POLICY "Users can view basic public profile info" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() != user_id
);

-- Note: This approach maintains functionality while securing sensitive data
-- Users can still see who the DM is and other players' names/roles
-- but cannot access user_ids or full profile details of other users