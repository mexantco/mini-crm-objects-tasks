import type { TaskStatus } from '@/types'
import { STATUS_LABELS } from '@/lib/tasks'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const tone: Record<TaskStatus, string> = {
  new: 'bg-slate-100 text-slate-800 border-slate-200',
  in_progress: 'bg-sky-100 text-sky-900 border-sky-200',
  review: 'bg-amber-100 text-amber-900 border-amber-200',
  accepted: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  rework: 'bg-orange-100 text-orange-900 border-orange-200',
}

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn('font-medium', tone[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
