import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { anthropic, getImageAnalysisPrompt } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const imageFile = formData.get('image') as File
    const contextRaw = formData.get('context') as string
    const context = contextRaw ? JSON.parse(contextRaw) : {}

    if (!imageFile) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    // Convert to buffer for Supabase upload
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const mediaType = (imageFile.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${imageFile.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chief-uploads')
      .upload(fileName, buffer, { contentType: imageFile.type })

    let publicUrl = ''
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('chief-uploads').getPublicUrl(fileName)
      publicUrl = urlData.publicUrl
    }

    // Analyze with Claude Vision
    const systemPrompt = getImageAnalysisPrompt(context)

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Analyze this setup image and give me your crew chief recommendations.',
            },
          ],
        },
      ],
    })

    const analysis = response.content[0].type === 'text' ? response.content[0].text : ''

    // Save upload record
    await supabase.from('uploads').insert({
      user_id: user.id,
      bucket_path: fileName,
      public_url: publicUrl,
      file_type: imageFile.type,
      file_size: imageFile.size,
      context_type: context.mode === 'sim_chief' ? 'setup_screenshot' : 'setup_screenshot',
      ai_analysis: analysis,
    })

    return NextResponse.json({ analysis, url: publicUrl })
  } catch (error: any) {
    console.error('Image analysis error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
