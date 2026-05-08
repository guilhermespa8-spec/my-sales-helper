ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_user_name_key;
ALTER TABLE public.products ADD CONSTRAINT products_user_name_key UNIQUE (user_id, name);