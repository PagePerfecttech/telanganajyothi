import { db } from './db'

interface AIRewriteResult {
  aiTitle: string
  aiShortDesc: string
  aiContent: string
}

export async function generateAINewsRewrite(
  title: string,
  content: string,
  shortDesc?: string
): Promise<AIRewriteResult | null> {
  try {
    // Fetch Gemini API key from database setting or environment
    const setting = await db.setting.findUnique({ where: { key: 'gemini_api_key' } })
    const apiKey = (setting && setting.value && setting.value.trim()) ? setting.value.trim() : process.env.GEMINI_API_KEY

    if (!apiKey) {
      console.warn('Gemini API Key is not configured. Skipping AI news rewrite.')
      return null
    }

    const promptText = `You are a senior Telugu news chief editor for 'Telangana Jyothi Spot News'.
Your objective is to rewrite the following raw news submission into a highly professional, grammatically flawless, engaging, and clear Telugu news article.
Maintain complete factual accuracy, names, figures, and geographical/location context.

RAW SUBMISSION:
Title: ${title}
Summary: ${shortDesc || ''}
Content: ${content || shortDesc || title}

Respond ONLY with a valid JSON object matching this exact structure without markdown formatting or code fences:
{
  "aiTitle": "Rewritten professional Telugu headline",
  "aiShortDesc": "Rewritten concise 2-sentence Telugu summary",
  "aiContent": "Rewritten full professional Telugu news text"
}`

    // Try primary gemini-1.5-flash endpoint, fallback to gemini-2.0-flash
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    ]

    let responseText = ''
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
          }),
        })

        if (res.ok) {
          const data = await res.json()
          responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (responseText) break
        }
      } catch (e) {
        console.error('Gemini endpoint request failed:', url, e)
      }
    }

    if (!responseText) {
      console.error('No response received from Gemini API')
      return null
    }

    // Clean markdown code blocks if present
    let cleanJson = responseText.trim()
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const parsed = JSON.parse(cleanJson) as AIRewriteResult

    if (parsed.aiTitle && (parsed.aiContent || parsed.aiShortDesc)) {
      return {
        aiTitle: parsed.aiTitle.trim(),
        aiShortDesc: (parsed.aiShortDesc || parsed.aiTitle).trim(),
        aiContent: (parsed.aiContent || parsed.aiShortDesc || parsed.aiTitle).trim(),
      }
    }
  } catch (error) {
    console.error('Gemini AI News Rewrite Error:', error)
  }
  return null
}
