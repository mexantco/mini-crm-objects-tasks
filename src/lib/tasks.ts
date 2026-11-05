import type { TaskStatus, UserRole } from '@/types'

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  accepted: 'Принята',
  rework: 'На доработке',
}

export type StatusAction = {
  toStatus: TaskStatus
  label: string
  requiresComment?: boolean
}

export function getAvailableActions(
  status: TaskStatus,
  role: UserRole,
  isAssignee: boolean,
): StatusAction[] {
  if (role === 'assigner') {
    if (status === 'review') {
      return [
        { toStatus: 'accepted', label: 'Принять' },
        { toStatus: 'rework', label: 'На доработку', requiresComment: true },
      ]
    }
    return []
  }

  if (!isAssignee) return []

  if (status === 'new') {
    return [{ toStatus: 'in_progress', label: 'Взять в работу' }]
  }
  if (status === 'in_progress') {
    return [{ toStatus: 'review', label: 'Отправить на проверку' }]
  }
  if (status === 'rework') {
    return [{ toStatus: 'in_progress', label: 'Вернуть в работу' }]
  }
  return []
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
