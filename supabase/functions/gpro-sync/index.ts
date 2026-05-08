import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing API Key' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const apiKey = authHeader.replace('Bearer ', '')

    const { data: settings, error: settingsError } = await supabaseClient
      .from('gpro_settings')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive API Key' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { products } = await req.json()

    if (!Array.isArray(products) || products.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid products data' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Dedup by lower(name) within the batch
    const seen = new Map<string, any>()
    for (const p of products) {
      if (!p?.name) continue
      const key = String(p.name).toLowerCase().trim()
      seen.set(key, {
        user_id: settings.user_id,
        name: String(p.name).trim(),
        price: Number(p.price ?? 0),
        stock: Number(p.stock ?? 0),
        description: 'Importado via GPRO Auto',
        updated_at: new Date().toISOString(),
      })
    }
    const rows = Array.from(seen.values())

    // Upsert by (user_id, lower(name)) unique index
    const { error: upsertError, count } = await supabaseClient
      .from('products')
      .upsert(rows, { onConflict: 'user_id,name', ignoreDuplicates: false, count: 'exact' })

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    await supabaseClient
      .from('gpro_settings')
      .update({ last_sync: new Date().toISOString() })
      .eq('api_key', apiKey)

    return new Response(JSON.stringify({ status: 'success', processed: rows.length, count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
