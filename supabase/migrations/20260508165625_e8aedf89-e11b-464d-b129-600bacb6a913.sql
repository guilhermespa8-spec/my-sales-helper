CREATE TABLE public.gpro_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.gpro_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gpro settings" 
ON public.gpro_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gpro settings" 
ON public.gpro_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gpro settings" 
ON public.gpro_settings FOR DELETE 
USING (auth.uid() = user_id);