import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { requireSupabase } from '@/lib/supabase'
import type { SiteObject } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Alert, AlertDescription } from '@/components/ui/alert'

export function ObjectsPage() {
  const { profile } = useAuth()
  const [objects, setObjects] = useState<SiteObject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')

  const load = useCallback(async () => {
    setError(null)
    const supabase = requireSupabase()
    const { data, error: fetchError } = await supabase
      .from('objects')
      .select('id, name, address, created_by, created_at')
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setObjects(data ?? [])
  }, [])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  async function createObject() {
    if (!profile) return
    setError(null)
    const supabase = requireSupabase()
    const { error: insertError } = await supabase.from('objects').insert({
      name: name.trim(),
      address: address.trim(),
      created_by: profile.id,
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setOpen(false)
    setName('')
    setAddress('')
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Объекты</h1>
          <p className="text-muted-foreground">Стройки и задачи по ним</p>
        </div>
        {profile?.role === 'assigner' && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button type="button" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="size-4" aria-hidden />
                Новый объект
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новый объект</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="obj-name">Название</Label>
                  <Input id="obj-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="obj-address">Адрес</Label>
                  <Input id="obj-address" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => void createObject()} disabled={!name.trim() || !address.trim()}>
                  Создать
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <p className="text-muted-foreground">Загрузка…</p>
      ) : objects.length === 0 ? (
        <p className="text-muted-foreground">Объектов пока нет.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {objects.map((obj) => (
            <li key={obj.id}>
              <Link to={`/objects/${obj.id}`} className="block h-full cursor-pointer">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">{obj.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{obj.address}</p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
