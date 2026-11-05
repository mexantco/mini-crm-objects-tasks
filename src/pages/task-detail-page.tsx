import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { requireSupabase } from '@/lib/supabase'
import {
  formatDateTime,
  getAvailableActions,
  STATUS_LABELS,
  type StatusAction,
} from '@/lib/tasks'
import type { TaskHistoryRow, TaskStatus, TaskWithRelations } from '@/types'
import { relationOne } from '@/lib/relation'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [history, setHistory] = useState<TaskHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<StatusAction | null>(null)
  const [comment, setComment] = useState('')
  const [pending, setPending] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    const supabase = requireSupabase()
    const [taskRes, historyRes] = await Promise.all([
      supabase
        .from('tasks')
        .select(
          `
          id, object_id, title, description, assignee_id, author_id, status, created_at,
          object:objects(id, name, address),
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, role),
          author:profiles!tasks_author_id_fkey(id, full_name, role)
        `,
        )
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('task_status_history')
        .select(
          `
          id, task_id, from_status, to_status, changed_by, comment, created_at,
          changed_by_profile:profiles!task_status_history_changed_by_fkey(id, full_name, role)
        `,
        )
        .eq('task_id', id)
        .order('created_at', { ascending: true }),
    ])
    if (taskRes.error) setError(taskRes.error.message)
    else {
      const row = taskRes.data
      setTask(
        row
          ? ({
              ...row,
              object: relationOne(row.object),
              assignee: relationOne(row.assignee),
              author: relationOne(row.author),
            } as TaskWithRelations)
          : null,
      )
    }
    if (historyRes.error) setError(historyRes.error.message)
    else
      setHistory(
        (historyRes.data ?? []).map((row) => ({
          ...row,
          changed_by_profile: relationOne(row.changed_by_profile),
        })) as TaskHistoryRow[],
      )
  }, [id])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  const actions =
    task && profile
      ? getAvailableActions(
          task.status,
          profile.role,
          task.assignee_id === profile.id,
        )
      : []

  async function applyAction() {
    if (!id || !action) return
    setPending(true)
    setError(null)
    const supabase = requireSupabase()
    const { error: rpcError } = await supabase.rpc('change_task_status', {
      p_task_id: id,
      p_to_status: action.toStatus,
      p_comment: action.requiresComment ? comment : null,
    })
    setPending(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setAction(null)
    setComment('')
    await load()
  }

  async function deleteTask() {
    if (!id || profile?.role !== 'assigner' || !task) return
    if (!window.confirm('Удалить задачу?')) return
    const supabase = requireSupabase()
    const { error: delError } = await supabase.from('tasks').delete().eq('id', id)
    if (delError) {
      setError(delError.message)
      return
    }
    window.location.href = `/objects/${task.object_id}`
  }

  function statusLabel(status: TaskStatus | null) {
    if (!status) return '—'
    return STATUS_LABELS[status]
  }

  if (!id) return null
  if (loading) return <p className="text-muted-foreground">Загрузка…</p>
  if (!task) return <p>Задача не найдена</p>

  return (
    <div className="space-y-6">
      {task.object && (
        <Link
          to={`/objects/${task.object_id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {task.object.name}
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{task.title}</h1>
          <p className="mt-2 max-w-2xl whitespace-pre-wrap text-muted-foreground">{task.description}</p>
        </div>
        <StatusBadge status={task.status} className="text-sm" />
        {profile?.role === 'assigner' && (
          <Button type="button" variant="destructive" size="sm" onClick={() => void deleteTask()}>
            <Trash2 className="size-4" aria-hidden />
            Удалить
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Детали</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Исполнитель: </span>
            {task.assignee?.full_name ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Автор: </span>
            {task.author?.full_name ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Создана: </span>
            {formatDateTime(task.created_at)}
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Доступные действия</CardTitle>
            <CardDescription>Только разрешённые переходы для вашей роли</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {actions.map((item) => (
              <Button
                key={item.toStatus}
                type="button"
                variant={item.toStatus === 'rework' ? 'outline' : 'default'}
                className={
                  item.toStatus !== 'rework'
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                    : undefined
                }
                onClick={() => {
                  setAction(item)
                  setComment('')
                }}
              >
                {item.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">История статусов</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">История пуста.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Когда</TableHead>
                  <TableHead>Кто</TableHead>
                  <TableHead>Переход</TableHead>
                  <TableHead>Комментарий</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(row.created_at)}</TableCell>
                    <TableCell>{row.changed_by_profile?.full_name ?? row.changed_by}</TableCell>
                    <TableCell>
                      {statusLabel(row.from_status)} → {statusLabel(row.to_status)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.comment ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(action)} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action?.label}</DialogTitle>
          </DialogHeader>
          {action?.requiresComment && (
            <div className="space-y-2">
              <Label htmlFor="status-comment">Комментарий (обязательно)</Label>
              <Textarea
                id="status-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>
          )}
          {!action?.requiresComment && (
            <>
              <p className="text-sm text-muted-foreground">Подтвердите смену статуса задачи.</p>
              <Separator />
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAction(null)}>
              Отмена
            </Button>
            <Button
              type="button"
              disabled={pending || (action?.requiresComment && !comment.trim())}
              onClick={() => void applyAction()}
            >
              {pending ? 'Сохранение…' : 'Подтвердить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
