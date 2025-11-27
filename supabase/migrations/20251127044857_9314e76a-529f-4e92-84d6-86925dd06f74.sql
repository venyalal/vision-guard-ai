-- Delete existing test records that don't have user associations
DELETE FROM public.retinal_analyses;

-- Add user_id column to retinal_analyses table (NOT NULL)
ALTER TABLE public.retinal_analyses
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow all to view analyses" ON public.retinal_analyses;
DROP POLICY IF EXISTS "Allow all to insert analyses" ON public.retinal_analyses;

-- Create secure RLS policies that restrict access to authenticated users and their own records
CREATE POLICY "Users can view their own analyses"
ON public.retinal_analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
ON public.retinal_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
ON public.retinal_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index on user_id for better query performance
CREATE INDEX idx_retinal_analyses_user_id ON public.retinal_analyses(user_id);