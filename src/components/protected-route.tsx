import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { supabaseConfigured } from '@/lib/supabase'
import type { ReactNode } from 'react'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, session, profile } = useAuth()

  if (!supabaseConfigured) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Нужна настройка Supabase</h1>
        <p className="mt-2 text-muted-foreground">
          Создайте файл <code className="rounded bg-muted px-1">.env</code> по образцу{' '}
          <code className="rounded bg-muted px-1">.env.example</code> и перезапустите dev-сервер.
        </p>
      </div>
    )
  }

  if (loading) {
    return <p className="p-8 text-center text-muted-foreground">Загрузка…</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Профиль не найден</h1>
        <p className="mt-2 text-muted-foreground">
          Для пользователя нет строки в таблице <strong>profiles</strong>. Добавьте профиль в
          Supabase вручную.
        </p>
      </div>
    )
  }

  return children
}
