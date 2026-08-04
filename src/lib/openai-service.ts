import { db } from './db'

interface AIRewriteResult {
  aiTitle: string
  aiShortDesc: string
  aiContent: string
}

/**
 * Rewrites news submission into professional press-quality Telugu news using OpenAI ChatGPT (gpt-4o-mini).
 */
export async function generateAINewsRewrite(
  title: string,
  content: string,
  shortDesc?: string
): Promise<AIRewriteResult | null> {
  try {
    // Fetch OpenAI API key from database setting or environment variable
    const setting = await db.setting.findUnique({ where: { key: 'openai_api_key' } })
    const apiKey = (setting && setting.value && setting.value.trim()) ? setting.value.trim() : process.env.OPENAI_API_KEY

    if (!apiKey) {
      console.warn('OpenAI API Key is not configured. Skipping ChatGPT news rewrite.')
      return null
    }

    const systemPrompt = `You are a senior Telugu news chief editor for 'Telangana Jyothi Spot News'.
Your objective is to rewrite the following raw news submission into a highly professional, grammatically flawless, engaging, and clear Telugu news article.
Maintain complete factual accuracy, names, figures, and geographical/location context.

Respond ONLY with a valid JSON object matching this exact structure without markdown formatting or code fences:
{
  "aiTitle": "Rewritten professional Telugu headline",
  "aiShortDesc": "Rewritten concise 2-sentence Telugu summary",
  "aiContent": "Rewritten full professional Telugu news text"
}`

    const userPrompt = `RAW SUBMISSION:
Title: ${title}
Summary: ${shortDesc || ''}
Content: ${content || shortDesc || title}`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('OpenAI API request failed:', res.status, errText)
      return null
    }

    const data = await res.json()
    const responseText = data?.choices?.[0]?.message?.content || ''

    if (!responseText) {
      console.error('No content received from OpenAI ChatGPT API')
      return null
    }

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
    console.error('ChatGPT AI News Rewrite Error:', error)
  }
  return null
}
