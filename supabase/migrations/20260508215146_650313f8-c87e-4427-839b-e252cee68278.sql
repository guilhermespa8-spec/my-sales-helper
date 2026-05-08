CREATE OR REPLACE FUNCTION public.search_products(search_term TEXT)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.products
  WHERE (name || ' ' || COALESCE(description, ''))::text ILIKE '%' || search_term || '%'
  ORDER BY (name || ' ' || COALESCE(description, ''))::text <-> search_term
  LIMIT 100;
$$ SET search_path = public, extensions;