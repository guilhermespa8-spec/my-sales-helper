CREATE OR REPLACE FUNCTION public.search_products(search_term TEXT)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
AS $$
  SET LOCAL search_path = public, extensions;
  SELECT *
  FROM public.products
  WHERE (name || ' ' || COALESCE(description, ''))::text % search_term
  ORDER BY (name || ' ' || COALESCE(description, ''))::text <-> search_term
  LIMIT 100;
$$;