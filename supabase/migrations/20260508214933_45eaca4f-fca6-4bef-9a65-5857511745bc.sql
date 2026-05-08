CREATE OR REPLACE FUNCTION public.search_products(search_term TEXT)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.products
  WHERE (name || ' ' || COALESCE(description, '')) % search_term
  ORDER BY (name || ' ' || COALESCE(description, '')) <-> search_term
  LIMIT 100;
$$;