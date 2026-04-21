export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let prompt
  try {
    const body = await req.json()
    prompt = body.prompt
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return new Response(
      JSON.stringify({ error: err.error?.message ?? `API error ${res.status}` }),
      { status: res.status, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const data = await res.json()
  const content = data.content?.[0]?.text ?? ''

  return new Response(JSON.stringify({ content }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
