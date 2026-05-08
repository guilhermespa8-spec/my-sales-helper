-- Create the search function
CREATE OR REPLACE FUNCTION public.search_products(search_term TEXT)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT *
  FROM public.products
  WHERE (name || ' ' || COALESCE(description, '')) ILIKE '%' || search_term || '%'
  ORDER BY name
  LIMIT 100;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.search_products(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_products(TEXT) TO anon;
