-- Create cars table
CREATE TABLE public.cars (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cars
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

-- Create policies for cars
CREATE POLICY "Users view own cars" ON public.cars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cars" ON public.cars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cars" ON public.cars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own cars" ON public.cars FOR DELETE USING (auth.uid() = user_id);

-- Add filter column to products
ALTER TABLE public.products ADD COLUMN car_filter TEXT;

-- Create trigger for cars updated_at
CREATE TRIGGER touch_cars_updated_at
BEFORE UPDATE ON public.cars
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();