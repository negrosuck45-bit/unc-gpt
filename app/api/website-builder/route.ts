import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface WebsiteResponse {
  html: string
  css: string
}

async function generateWebsiteWithGroq(prompt: string): Promise<WebsiteResponse> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  const systemPrompt = `You are an expert web designer and developer. Generate beautiful, modern, responsive HTML and CSS for websites based on user descriptions.

IMPORTANT: You must respond with ONLY valid JSON in this exact format, no other text:
{
  "html": "<html content here>",
  "css": "<css content here>"
}

Guidelines:
- Create semantic, accessible HTML
- Use modern CSS with flexbox/grid
- Include responsive design
- Make it visually appealing with good color schemes
- Add smooth animations and transitions
- Ensure good typography
- Mobile-first approach
- No external dependencies or CDNs
- Self-contained HTML and CSS only`

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mixtral-8x7b-32768',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Create a website with the following description: ${prompt}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Groq API error:', error)
    throw new Error(`Groq API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No content in Groq response')
  }

  // Parse the JSON response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Could not parse JSON from response')
  }

  const parsed = JSON.parse(jsonMatch[0])

  // Validate response structure
  if (!parsed.html || !parsed.css) {
    throw new Error('Invalid response structure: missing html or css')
  }

  return {
    html: parsed.html,
    css: parsed.css,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Invalid prompt' },
        { status: 400 }
      )
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: 'Prompt too long (max 1000 characters)' },
        { status: 400 }
      )
    }

    const website = await generateWebsiteWithGroq(prompt)

    return NextResponse.json(website, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Website builder error:', error)

    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      { error: `Failed to generate website: ${message}` },
      { status: 500 }
    )
  }
}
