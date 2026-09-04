CREATE TABLE public.quote_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  car_name text NOT NULL,
  car_year text,
  car_engine text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_templates TO authenticated;
GRANT ALL ON public.quote_templates TO service_role;
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quote_templates" ON public.quote_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.quote_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.quote_templates(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_code text,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qti_template_id ON public.quote_template_items(template_id);
CREATE INDEX idx_qti_product_id ON public.quote_template_items(product_id);
CREATE INDEX idx_qt_user_id ON public.quote_templates(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_template_items TO authenticated;
GRANT ALL ON public.quote_template_items TO service_role;
ALTER TABLE public.quote_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quote_template_items" ON public.quote_template_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.quote_templates t WHERE t.id = template_id AND t.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.quote_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));

CREATE TRIGGER touch_quote_templates_updated_at BEFORE UPDATE ON public.quote_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();