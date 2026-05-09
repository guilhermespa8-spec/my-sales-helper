import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_PAYMENT_METHODS = [
  "Dinheiro",
  "Pix",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Fiado",
  "Transferência",
  "Boleto",
];

const ALLOWED_PIECE_TYPES = ["Peça", "Peça separada", "LED", "Vonixx"];

interface ItemInput {
  product_name: unknown;
  quantity: unknown;
  unit_price: unknown;
  subtotal: unknown;
}

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // --- Auth: apenas usuários logados deste app podem chamar ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return bad("Não autorizado", 401);
  }

  const localUrl = Deno.env.get("SUPABASE_URL")!;
  const localServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const localClient = createClient(localUrl, localServiceKey);
  
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await localClient.auth.getUser(token);
  
  if (authErr || !user) {
    console.error("Auth error:", authErr);
    return bad("Não autorizado", 401);
  }

  // --- Credenciais do Venda Fácil ---
  const vfUrl = Deno.env.get("VENDA_FACIL_URL");
  const vfKey = Deno.env.get("VENDA_FACIL_SERVICE_ROLE_KEY");
  const defaultVfUserId = Deno.env.get("VENDA_FACIL_USER_ID");
  
  if (!vfUrl || !vfKey || !defaultVfUserId) {
    return bad("Integração Venda Fácil não configurada nos segredos", 500);
  }

  // --- Parse + validação do corpo ---
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("JSON inválido");
  }

  const sellerName = String(body?.seller ?? "").trim();
  const payment_method = String(body?.payment_method ?? "").trim();
  const piece_type = String(body?.piece_type ?? "").trim();
  const customer_name = body?.customer_name ? String(body.customer_name).trim().slice(0, 200) : null;
  const notes = body?.notes ? String(body.notes).slice(0, 1000) : null;
  const quote_id = body?.quote_id ? String(body.quote_id) : null;
  const total = Number(body?.total);
  const items = body?.items;

  if (!sellerName || sellerName.length > 100) return bad("Vendedor inválido");
  if (!ALLOWED_PAYMENT_METHODS.includes(payment_method)) return bad("Forma de pagamento inválida");
  if (!ALLOWED_PIECE_TYPES.includes(piece_type)) return bad("Tipo de peça inválido");
  if (!Number.isFinite(total) || total < 0) return bad("Total inválido");
  if (!Array.isArray(items) || items.length === 0) return bad("Itens vazios");

  // --- Identificar o ID do Vendedor no Venda Fácil ---
  let vfUserId = defaultVfUserId;
  
  // Busca no banco local se o vendedor tem um ID específico configurado
  const { data: sellerData } = await localClient
    .from("sellers")
    .select("venda_facil_user_id")
    .eq("name", sellerName)
    .maybeSingle();

  if (sellerData?.venda_facil_user_id) {
    vfUserId = sellerData.venda_facil_user_id;
    console.log(`Usando ID específico para o vendedor ${sellerName}: ${vfUserId}`);
  } else {
    console.log(`Usando ID padrão para o vendedor ${sellerName}: ${vfUserId}`);
  }

  // --- Preparar itens ---
  const cleanItems = (items as ItemInput[]).map((it, idx) => {
    const product_name = String(it?.product_name ?? "").trim();
    const quantity = Number(it?.quantity);
    const unit_price = Number(it?.unit_price);
    const subtotal = Number(it?.subtotal);
    if (!product_name) throw new Error(`Item ${idx + 1}: nome inválido`);
    return { product_name, quantity, unit_price, subtotal };
  });

  // --- Inserir no Venda Fácil ---
  const vf = createClient(vfUrl, vfKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: sale, error: saleErr } = await vf
      .from("sales")
      .insert({
        user_id: vfUserId,
        total,
        payment_method,
        piece_type,
        customer_name: customer_name ?? "Consumidor Final",
        notes: notes ?? `Vendedor: ${sellerName}${quote_id ? ` | Orçamento: ${quote_id}` : ""}`,
      })
      .select()
      .single();

    if (saleErr) throw saleErr;

    const saleItems = cleanItems.map((it) => ({
      sale_id: sale.id,
      product_name: it.product_name,
      quantity: it.quantity,
      unit_price: it.unit_price,
      subtotal: it.subtotal,
    }));

    const { error: itemsErr } = await vf.from("sale_items").insert(saleItems);
    if (itemsErr) throw itemsErr;

    return new Response(
      JSON.stringify({ ok: true, sale_id: sale.id, vf_user_used: vfUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("VF insert error:", e);
    return bad(`Erro no Venda Fácil: ${e?.message ?? e}`, 500);
  }
});
