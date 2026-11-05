import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { requireSupabase } from '@/lib/supabase'
import type { Profile, SiteObject, Task } from '@/types'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function ObjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [siteObject, setSiteObject] = useState<SiteObject | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [executors, setExecutors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [taskOpen, setTaskOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    const supabase = requireSupabase()
    const [objRes, tasksRes, execRes] = await Promise.all([
      supabase.from('objects').select('id, name, address, created_by, created_at').eq('id', id).maybeSingle(),
      supabase
        .from('tasks')
        .select('id, object_id, title, description, assignee_id, author_id, status, created_at')
        .eq('object_id', id)
        .order('created_at', { ascending: false }),
      profile?.role === 'assigner'
        ? supabase.from('profiles').select('id, full_name, role').eq('role', 'executor')
        : Promise.resolve({ data: [], error: null }),
    ])
    if (objRes.error) setError(objRes.error.message)
    else setSiteObject(objRes.data)
    if (tasksRes.error) setError(tasksRes.error.message)
    else setTasks(tasksRes.data ?? [])
    if (execRes.error) setError(execRes.error.message)
    else setExecutors((execRes.data as Profile[]) ?? [])
  }, [id, profile?.role])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  async function createTask() {
    if (!profile || !id) return
    setError(null)
    const supabase = requireSupabase()
    const { error: insertError } = await supabase.from('tasks').insert({
      object_id: id,
      title: title.trim(),
      description: description.trim(),
      assignee_id: assigneeId,
      author_id: profile.id,
      status: 'new',
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setTaskOpen(false)
    setTitle('')
    setDescription('')
    setAssigneeId('')
    await load()
  }

  async function deleteObject() {
    if (!id || !window.confirm('Удалить объект?')) return
    const supabase = requireSupabase()
    const { error: delError } = await supabase.from('objects').delete().eq('id', id)
    if (delError) {
      setError(delError.message)
      return
    }
    window.location.href = '/objects'
  }

  if (!id) return null

  if (loading) return <p className="text-muted-foreground">Загрузка…</p>
  if (!siteObject) return <p>Объект не найден</p>

  return (
    <div className="space-y-6">
      <Link to="/objects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        К списку объектов
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{siteObject.name}</h1>
          <p className="text-muted-foreground">{siteObject.address}</p>
        </div>
        {profile?.role === 'assigner' && (
          <Button type="button" variant="destructive" size="sm" onClick={() => void deleteObject()}>
            <Trash2 className="size-4" aria-hidden />
            Удалить объект
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Задачи объекта</CardTitle>
            <CardDescription>Статусы и переходы по ролям</CardDescription>
          </div>
          {profile?.role === 'assigner' && (
            <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">
                  <Plus className="size-4" aria-hidden />
                  Новая задача
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Новая задача</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">Название</Label>
                    <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-desc">Описание</Label>
                    <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Исполнитель</Label>
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите исполнителя" />
                      </SelectTrigger>
                      <SelectContent>
                        {executors.map((ex) => (
                          <SelectItem key={ex.id} value={ex.id}>
                            {ex.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    onClick={() => void createTask()}
                    disabled={!title.trim() || !assigneeId}
                  >
                    Создать
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Задач пока нет.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Link to={`/tasks/${task.id}`} className="font-medium hover:underline">
                        {task.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
