DELETE FROM public.quote_items WHERE product_id IN (SELECT id FROM public.products);
DELETE FROM public.products;