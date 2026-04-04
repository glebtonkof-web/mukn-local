import { NextRequest, NextResponse } from 'next/server'
import hashtagService from '@/lib/hashtag-service'

// GET /api/hashtags
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const platform = searchParams.get('platform') as any
    const hashtag = searchParams.get('hashtag')

    if (action === 'analyze' && hashtag) {
      const analysis = await hashtagService.analyzeHashtag(hashtag)
      return NextResponse.json({ analysis })
    }

    if (action === 'trending') {
      const trending = hashtagService.getTrending(platform)
      return NextResponse.json({ trending })
    }

    if (action === 'sets') {
      const sets = hashtagService.getHashtagSets(platform)
      return NextResponse.json({ sets })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/hashtags
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.action === 'generate') {
      const hashtags = await hashtagService.generateHashtags(body.options)
      return NextResponse.json({ hashtags })
    }

    if (body.action === 'save_set') {
      const set = hashtagService.saveHashtagSet(
        body.name,
        body.platform,
        body.hashtags,
        body.category
      )
      return NextResponse.json({ set })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
