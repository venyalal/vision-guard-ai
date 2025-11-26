-- Create table for storing retinal analysis history
CREATE TABLE public.retinal_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  grade INTEGER NOT NULL,
  grade_name TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  recommendation TEXT NOT NULL,
  features TEXT[],
  reasoning TEXT,
  scan_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.retinal_analyses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to view all analyses (for demo purposes)
CREATE POLICY "Allow all to view analyses"
ON public.retinal_analyses
FOR SELECT
USING (true);

-- Create policy to allow anyone to insert analyses (for demo purposes)
CREATE POLICY "Allow all to insert analyses"
ON public.retinal_analyses
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_retinal_analyses_created_at ON public.retinal_analyses(created_at DESC);