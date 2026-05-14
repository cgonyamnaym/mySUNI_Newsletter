import { TOPIC_MAP } from '@/lib/constants'
import type { TopicId } from '@/lib/types'

interface TopicBadgeProps {
  topic: TopicId
  small?: boolean
}

export function TopicBadge({ topic, small }: TopicBadgeProps) {
  const config = TOPIC_MAP[topic]
  if (!config) return null

  const sizeClass = small
    ? 'px-2 py-0.5 text-[11px] leading-none'
    : 'px-2.5 py-1 text-xs leading-none'

  return (
    <span
      style={{ backgroundColor: config.chipBg, color: config.chipText }}
      className={`inline-flex items-center gap-1 rounded-full font-semibold tracking-wider ${sizeClass}`}
    >
      <span
        style={{ backgroundColor: config.dotColor }}
        className="w-1.5 h-1.5 rounded-full shrink-0"
      />
      {config.label}
    </span>
  )
}
