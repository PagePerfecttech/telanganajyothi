import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let title = '', content = ''
  try {
    const body = await request.json()
    title = body.title || ''
    content = body.content || ''

    if (!title && !content) {
      return NextResponse.json({ error: 'Title or Content is required' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Fallback formatting if GEMINI_API_KEY is not configured
      const formattedTitle = (title || '').trim();
      const formattedDesc = (content || title || '').trim();
      return NextResponse.json({
        enhancedTitle: formattedTitle,
        enhancedDesc: formattedDesc,
        note: 'AI enhancement running in offline mode.'
      })
    }

    const prompt = `You are a professional Telugu news editor for Telangana Jyothi SPOT NEWS.
Format and improve the following reporter submission into clear, accurate, press-quality Telugu news with high readability:

Raw Title: ${title || ''}
Raw Content: ${content || ''}

Respond ONLY in JSON format with two keys:
1. "enhancedTitle": A compelling, grammatically correct headline in Telugu (max 15 words).
2. "enhancedDesc": Clear, well-structured summary and detailed news content in Telugu.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    })

    if (!res.ok) {
      throw new Error(`Gemini API returned status ${res.status}`);
    }

    const aiData = await res.json()
    const textResponse = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const parsed = JSON.parse(textResponse)

    return NextResponse.json({
      enhancedTitle: parsed.enhancedTitle || title,
      enhancedDesc: parsed.enhancedDesc || content,
    })
  } catch (error) {
    console.error('AI enhance news error:', error)
    return NextResponse.json({
      enhancedTitle: title,
      enhancedDesc: content,
      error: 'AI enhancement temporarily unavailable.'
    })
  }
}
