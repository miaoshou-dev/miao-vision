/**
 * Vercel API Route - LLM Proxy (Catch-all)
 *
 * Proxies requests to DeepSeek API to bypass CORS in production.
 * Handles all paths under /api/llm/* and forwards to api.deepseek.com/*
 *
 * Example: /api/llm/v1/chat/completions → https://api.deepseek.com/v1/chat/completions
 */

export const config = {
  runtime: 'edge',
}

export default async function handler(request: Request) {
  // Only allow POST
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Extract path from URL: /api/llm/v1/chat/completions → /v1/chat/completions
    const url = new URL(request.url)
    const pathMatch = url.pathname.match(/^\/api\/llm(.*)$/)
    const targetPath = pathMatch ? pathMatch[1] : '/v1/chat/completions'

    // Build target URL
    const targetUrl = `https://api.deepseek.com${targetPath}`

    // Parse request body
    const body = await request.json()

    console.log('[LLM Proxy] Forwarding to:', targetUrl)

    // Forward to DeepSeek API
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    })

    // Check if streaming
    if (body.stream) {
      // Return streaming response
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Return JSON response
    const data = await response.json()
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('[LLM Proxy] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Proxy error', message: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
