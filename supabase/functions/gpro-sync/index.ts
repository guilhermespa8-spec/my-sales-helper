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
      Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing API Key' }), { status: 401, headers: corsHeaders })
    }

    const apiKey = authHeader.replace('Bearer ', '')

    // Validar a API Key
    const { data: settings, error: settingsError } = await supabaseClient
      .from('gpro_settings')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive API Key' }), { status: 401, headers: corsHeaders })
    }

    const { products } = await req.json()

    if (!Array.isArray(products)) {
      return new Response(JSON.stringify({ error: 'Invalid products data' }), { status: 400, headers: corsHeaders })
    }

    const results = { updated: 0, created: 0, errors: 0 }

    for (const product of products) {
      const { name, price, stock } = product
      
      if (!name) continue

      // Buscar produto existente pelo nome para o usuário dono da API Key
      const { data: existingProduct, error: fetchError } = await supabaseClient
        .from('products')
        .select('id')
        .eq('user_id', settings.user_id)
        .eq('name', name)
        .single()

      if (existingProduct) {
        // Atualizar
        const { error: updateError } = await supabaseClient
          .from('products')
          .update({ price, stock, updated_at: new Date().toISOString() })
          .eq('id', existingProduct.id)
        
        if (updateError) results.errors++
        else results.updated++
      } else {
        // Criar novo
        const { error: insertError } = await supabaseClient
          .from('products')
          .insert({
            name,
            price,
            stock,
            user_id: settings.user_id,
            description: 'Importado via GPRO Auto'
          })

        if (insertError) results.errors++
        else results.created++
      }
    }

    // Atualizar último sync
    await supabaseClient
      .from('gpro_settings')
      .update({ last_sync: new Date().toISOString() })
      .eq('api_key', apiKey)

    return new Response(JSON.stringify({ status: 'success', results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
