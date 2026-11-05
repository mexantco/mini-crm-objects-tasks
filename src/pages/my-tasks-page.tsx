import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { requireSupabase } from '@/lib/supabase'
import { relationOne } from '@/lib/relation'
import type { TaskWithRelations } from '@/types'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const supabase = requireSupabase()
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select(
        `
        id, object_id, title, description, assignee_id, author_id, status, created_at,
        object:objects(id, name, address)
      `,
      )
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setTasks(
      (data ?? []).map((row) => ({
        ...row,
        object: relationOne(row.object),
      })) as TaskWithRelations[],
    )
  }, [])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Мои задачи</h1>
        <p className="text-muted-foreground">Только назначенные вам</p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <p className="text-muted-foreground">Загрузка…</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Список</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет задач.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Задача</TableHead>
                    <TableHead>Объект</TableHead>
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
                      <TableCell className="text-muted-foreground">
                        {task.object?.name ?? '—'}
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
      )}
    </div>
  )
}
