import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const { record } = await req.json()

  const geopolitica = record.geopolitica || ''
  const brasil = record.brasil || ''

  if (!geopolitica && !brasil) {
    return new Response('Sem conteúdo', { status: 200 })
  }

  const conteudo = [geopolitica, brasil]
    .filter(Boolean)
    .join('\n\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000)

  const resp = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('PERPLEXITY_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a senior geopolitics newsletter editor. Read the content below and write ONE headline in English, objective and impactful, maximum 12 words. Choose the single most important fact. Reply ONLY with the headline, no quotes, no period, no explanation.',
        },
        {
          role: 'user',
          content: conteudo,
        },
      ],
      max_tokens: 60,
    }),
  })

  const data = await resp.json()
  const titulo = data.choices?.[0]?.message?.content?.trim()

  if (!titulo) return new Response('Sem manchete gerada', { status: 200 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error } = await supabase
    .from('artigos')
    .update({ titulo })
    .eq('id', record.id)

  if (error) return new Response(JSON.stringify(error), { status: 500 })

  return new Response(JSON.stringify({ titulo }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
