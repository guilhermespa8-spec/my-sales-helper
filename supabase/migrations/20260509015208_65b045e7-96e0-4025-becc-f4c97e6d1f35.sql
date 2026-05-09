-- Adiciona a coluna para armazenar o ID do usuário no Venda Fácil
ALTER TABLE public.sellers 
ADD COLUMN venda_facil_user_id UUID;

-- Comentário para documentação
COMMENT ON COLUMN public.sellers.venda_facil_user_id IS 'ID do usuário correspondente no sistema Venda Fácil para fins de integração de vendas.';