import { getRedis } from '@/lib/redis'
import { NewsletterContent } from '@/components/NewsletterContent'
import type { PublishedNewsletter } from '@/app/api/newsletter/publish/route'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const redis = getRedis()
  if (!redis) return {}
  const newsletter = await redis.get<Pick<PublishedNewsletter, 'title'>>(`newsletter:${params.id}`)
  if (!newsletter) return {}
  return { title: newsletter.title }
}

export default async function PublicNewsletterPage({ params }: Props) {
  const redis = getRedis()

  if (!redis) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: '#F0F2F5' }}>
        <p className="text-[14px]" style={{ color: 'rgba(55,56,60,0.6)' }}>서비스를 이용할 수 없습니다.</p>
      </div>
    )
  }

  const newsletter = await redis.get<PublishedNewsletter>(`newsletter:${params.id}`)

  if (!newsletter) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: '#F0F2F5' }}>
        <div className="text-center">
          <p className="text-[18px] font-bold" style={{ color: '#37383c' }}>뉴스레터를 찾을 수 없습니다.</p>
          <p className="text-[13px] mt-2" style={{ color: 'rgba(55,56,60,0.5)' }}>링크가 만료되었거나 존재하지 않습니다.</p>
        </div>
      </div>
    )
  }

  const dateLabel = new Date(newsletter.confirmedAt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="flex flex-col min-h-full" style={{ background: '#F0F2F5' }}>
      <main className="flex-1 py-4 sm:py-8 px-0">
        <NewsletterContent articles={newsletter.articles} dateLabel={dateLabel} responsive />
      </main>
    </div>
  )
}