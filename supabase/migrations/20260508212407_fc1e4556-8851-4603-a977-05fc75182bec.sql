-- Enable pg_trgm extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for name and description using gin_trgm_ops for ILIKE optimization
CREATE INDEX IF NOT EXISTS idx_products_search_trgm ON public.products USING GIN ((name || ' ' || COALESCE(description, '')) gin_trgm_ops);
