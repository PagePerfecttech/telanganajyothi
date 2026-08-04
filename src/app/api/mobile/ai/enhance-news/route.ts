import { NextRequest, NextResponse } from 'next/server'
import { generateAINewsRewrite } from '@/lib/openai-service'

export async function POST(request: NextRequest) {
  let title = '', content = ''
  try {
    const body = await request.json()
    title = body.title || ''
    content = body.content || ''

    if (!title && !content) {
      return NextResponse.json({ error: 'Title or Content is required' }, { status: 400 })
    }

    const aiResult = await generateAINewsRewrite(title, content)

    if (!aiResult) {
      // Fallback formatting if OPENAI_API_KEY is not configured
      const formattedTitle = (title || '').trim()
      const formattedDesc = (content || title || '').trim()
      return NextResponse.json({
        enhancedTitle: formattedTitle,
        enhancedDesc: formattedDesc,
        note: 'AI enhancement running in offline mode.'
      })
    }

    return NextResponse.json({
      enhancedTitle: aiResult.aiTitle,
      enhancedDesc: aiResult.aiContent || aiResult.aiShortDesc,
    })
  } catch (error) {
    console.error('ChatGPT AI enhance news error:', error)
    return NextResponse.json({
      enhancedTitle: title,
      enhancedDesc: content,
      error: 'AI enhancement temporarily unavailable.'
    })
  }
}
