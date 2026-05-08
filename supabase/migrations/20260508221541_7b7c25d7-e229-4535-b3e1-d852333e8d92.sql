-- Create sellers table
CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on sellers
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sellers"
    ON public.sellers FOR ALL
    USING (auth.uid() = user_id);

-- Add columns to quotes for payment and piece type
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS piece_type TEXT;

-- Create sales table (confirmed purchases)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
    customer_name TEXT,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    piece_type TEXT NOT NULL, -- e.g., 'Nova', 'Usada', 'Recondicionada'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sales_items table (snapshot of products sold)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Enable RLS on sales and sale_items
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sales"
    ON public.sales FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sale items"
    ON public.sale_items FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.sales
        WHERE sales.id = sale_items.sale_id
        AND sales.user_id = auth.uid()
    ));

-- Insert some default sellers if not exists (André, João Victor, Mateus as mentioned in the code)
-- This is a bit tricky without knowing the current user_id, so we'll skip the insert here and handle it in the UI or via a function if needed.
