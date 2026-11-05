export type UserRole = 'assigner' | 'executor'

export type TaskStatus =
  | 'new'
  | 'in_progress'
  | 'review'
  | 'accepted'
  | 'rework'

export type Profile = {
  id: string
  full_name: string
  role: UserRole
}

export type SiteObject = {
  id: string
  name: string
  address: string
  created_by: string
  created_at: string
}

export type Task = {
  id: string
  object_id: string
  title: string
  description: string
  assignee_id: string
  author_id: string
  status: TaskStatus
  created_at: string
}

export type TaskHistoryRow = {
  id: string
  task_id: string
  from_status: TaskStatus | null
  to_status: TaskStatus
  changed_by: string
  comment: string | null
  created_at: string
  changed_by_profile?: Profile | null
}

export type TaskWithRelations = Task & {
  object?: SiteObject | null
  assignee?: Profile | null
  author?: Profile | null
}
