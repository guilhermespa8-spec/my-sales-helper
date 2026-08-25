# Refatoração completa — Sistema de Auto Peças com PDV

## Resumo
Reconstruir o aplicativo como um sistema de gestão para auto peças, mantendo **apenas os produtos cadastrados no banco de dados**. Tudo o mais (telas, rotas, fluxos) será refeito. A prioridade inicial é a interface; as funcionalidades serão entregues em fases.

## Fase 1 — Design system e estrutura base (interface primeiro)
- Redefinir paleta, tipografia, espaçamento e tokens semânticos em `src/index.css` e `tailwind.config.ts`.
- Criar componentes base reutilizáveis: `PageHeader`, `StatCard`, `DataTable`, `SearchInput`, `EmptyState`.
- Reformular `AppLayout.tsx` com navegação lateral desktop, navegação inferior mobile e header limpo.
- Definir as rotas principais do novo sistema:
  - `/` — Dashboard
  - `/pdv` — Ponto de venda
  - `/produtos` — Cadastro de produtos
  - `/estoque` — Movimentação de estoque
  - `/vendas` — Histórico de vendas
  - `/financeiro` — Contas a pagar/receber
  - `/relatorios` — Relatórios
  - `/ordens` — Ordens de serviço
  - `/configuracoes` — Configurações

## Fase 2 — Dashboard
- Cards de resumo: vendas do dia, total em estoque, produtos com estoque baixo, ordens pendentes.
- Gráficos simplificados de vendas (últimos 7 dias) e produtos mais vendidos.
- Atalhos rápidos para PDV, novo produto e ordem de serviço.

## Fase 3 — PDV (Ponto de Venda)
- Tela de venda rápida com busca de produtos.
- Carrinho com quantidade, desconto, subtotal e total.
- Seleção de vendedor, forma de pagamento e tipo de peça.
- Finalização de venda com baixa automática no estoque.
- Suporte a leitor de código de barras (campo de entrada contínua).
- Impressão de cupom térmico.

## Fase 4 — Cadastro de produtos e controle de estoque
- Reformular `Products.tsx` com tabela responsiva, filtros e busca.
- Campos: nome, descrição, preço de custo, preço de venda, estoque, estoque mínimo, código de barras, marca, categoria.
- Tela de movimentação de estoque: entrada, saída, ajuste e histórico.
- Alerta de produtos abaixo do estoque mínimo.

## Fase 5 — Vendas e orçamentos
- Tela de histórico de vendas com filtros por data, vendedor e forma de pagamento.
- Detalhamento da venda com reimpressão de cupom.
- Manter orçamentos como rascunho de venda, com conversão em venda.

## Fase 6 — Financeiro
- Tabela de contas a pagar e a receber.
- Lançamento manual de despesas/receitas.
- Resumo diário e mensal (entradas, saídas, saldo).

## Fase 7 — Relatórios
- Relatório de vendas por período.
- Relatório de produtos mais vendidos.
- Relatório de estoque.
- Relatório financeiro simplificado.

## Fase 8 — Ordens de serviço
- Cadastro de OS com cliente/veículo, produtos utilizados e serviços.
- Status: aberta, em andamento, finalizada, paga.
- Vinculação de produtos da OS à baixa de estoque.

## Fase 9 — Ajustes finais, testes e publicação
- Revisão de responsividade em mobile.
- Verificação de RLS e permissões.
- Build e publicação.

## Notas importantes
- Os dados existentes de orçamentos, vendas, vendedores, mecânicos e carros não serão apagados, mas as telas antigas serão removidas/substituídas. Se for necessário limpar esses dados, isso será feito em etapa separada com confirmação.
- A tabela `products` será expandida com novas colunas via migration (código de barras, estoque mínimo, preço de custo, categoria, marca).
- O tema seguirá tokens semânticos e suporte a modo escuro.
