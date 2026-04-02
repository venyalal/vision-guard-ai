-- Add patient_id column for clinician-entered patient identifiers
ALTER TABLE public.retinal_analyses
ADD COLUMN IF NOT EXISTS patient_id TEXT;

-- Index for patient lookups
CREATE INDEX IF NOT EXISTS idx_retinal_analyses_patient_id
  ON public.retinal_analyses(patient_id);
