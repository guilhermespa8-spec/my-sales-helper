CREATE TABLE public.mechanics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mechanics" ON public.mechanics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mechanics" ON public.mechanics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own mechanics" ON public.mechanics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own mechanics" ON public.mechanics FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER mechanics_updated_at
BEFORE UPDATE ON public.mechanics
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();