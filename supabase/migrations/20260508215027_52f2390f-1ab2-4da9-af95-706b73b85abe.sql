CREATE OR REPLACE FUNCTION public.search_products(search_term TEXT)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.products
  WHERE extensions.similarity((name || ' ' || COALESCE(description, ''))::text, search_term) > 0.15
  ORDER BY extensions.similarity((name || ' ' || COALESCE(description, ''))::text, search_term) DESC
  LIMIT 100;
$$ SET search_path = public, extensions;