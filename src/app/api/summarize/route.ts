import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

interface DraftArticle {
  id: string
  newsletterSummary?: { what?: string } | null
}

function getAlreadySummarized(draftPath: string): Set<string> {
  try {
    const raw = fs.readFileSync(draftPath, 'utf-8')
    const draft: { articles?: DraftArticle[] } = JSON.parse(raw)
    return new Set(
      draft.articles?.filter((a) => a.newsletterSummary?.what).map((a) => a.id) ?? []
    )
  } catch {
    return new Set()
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ids } = (await req.json()) as { ids: string[] }
    if (!ids?.length) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
    }

    const draftPath = path.join(process.cwd(), 'public', 'data', 'newsletter-draft.json')
    const alreadySummarized = getAlreadySummarized(draftPath)
    const missingIds = ids.filter((id) => !alreadySummarized.has(id))

    if (missingIds.length === 0) {
      const draft = JSON.parse(fs.readFileSync(draftPath, 'utf-8'))
      return NextResponse.json(draft)
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'summarize-newsletter.js')

    await new Promise<void>((resolve, reject) => {
      execFile(
        process.execPath,
        [scriptPath, `--ids=${missingIds.join(',')}`],
        { cwd: process.cwd(), timeout: 600_000 },
        (error) => {
          if (error) reject(error)
          else resolve()
        }
      )
    })

    const draft = JSON.parse(fs.readFileSync(draftPath, 'utf-8'))
    return NextResponse.json(draft)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/summarize]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
