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
          content: 'Você é um editor sênior de newsletter de geopolítica. Leia o conteúdo abaixo e escreva UMA manchete jornalística em português, objetiva e impactante, com no máximo 12 palavras. Escolha o fato mais importante. Responda APENAS com a manchete, sem aspas, sem ponto final, sem explicações.',
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
