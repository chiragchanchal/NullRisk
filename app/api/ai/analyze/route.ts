import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getMarketOHLC, getMarketNews } from '@/lib/api/market'
import { calculateRSI, calculate14dChange } from '@/lib/engine/rsi'

const CACHE_TTL_MINUTES = 30
const SYSTEM_PROMPT = `You are a paper trading analyst at TradeLab. You give concise, educational market commentary in exactly 3 bullet points:
• Sentiment: summarise news sentiment and market mood
• Technical Signal: RSI reading and price trend interpretation  
• Risk Rating: simulated risk score 1-10 with brief reason

Never give real financial advice. Keep the entire response under 80 words total. Be direct and use numbers.`

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { symbol, forceRefresh = false } = body

    if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

    // 2. Check cache (use service role to bypass RLS for upsert)
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (!forceRefresh) {
      const { data: cached } = await serviceSupabase
        .from('ai_analysis_cache')
        .select('*')
        .eq('symbol', symbol)
        .single()

      if (cached) {
        const ageMinutes = (Date.now() - new Date(cached.created_at).getTime()) / 60000
        if (ageMinutes < CACHE_TTL_MINUTES) {
          // Return cached as a streaming-compatible text response
          return new Response(cached.analysis, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'X-Cache': 'HIT',
              'X-Cache-Age': ageMinutes.toFixed(1),
            }
          })
        }
      }
    }

    // 3. Gather market context
    const [ohlcData, newsData] = await Promise.all([
      getMarketOHLC(symbol, '1day', 20),
      getMarketNews(symbol)
    ])

    const closes = ohlcData.map((d: any) => d.close)
    const rsi = calculateRSI(closes)
    const priceChange14d = calculate14dChange(closes)
    const headlines = newsData.slice(0, 5).map((n: any) => n.headline).filter(Boolean)

    // 4. Build user message
    const userMessage = `
Symbol: ${symbol}
14-day price change: ${priceChange14d > 0 ? '+' : ''}${priceChange14d}%
RSI (14): ${rsi}
Current price: ${closes[0] ? `$${closes[0].toFixed(2)}` : 'N/A'}

Recent headlines (last 5):
${headlines.length > 0 ? headlines.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'No recent headlines available.'}

Provide your 3-bullet analysis.`

    // 5. Call Anthropic with streaming
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    })

    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    })

    // 6. Collect full text for caching while streaming
    let fullText = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const text = chunk.delta.text
              fullText += text
              controller.enqueue(encoder.encode(text))
            }
          }
        } finally {
          controller.close()

          // 7. Save to cache after stream completes (fire-and-forget)
          void (async () => {
            try {
              await serviceSupabase
                .from('ai_analysis_cache')
                .upsert({
                  symbol,
                  analysis: fullText,
                  rsi,
                  price_change_14d: priceChange14d,
                  headlines,
                  created_at: new Date().toISOString()
                }, { onConflict: 'symbol' })
            } catch {}
          })()
        }
      }
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Cache': 'MISS',
        'Transfer-Encoding': 'chunked',
      }
    })
  } catch (error: any) {
    console.error('AI analyze error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
