import { Link, NavLink, Outlet } from 'react-router-dom'
import { Building2, ClipboardList, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AppShell() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-svh flex flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/objects" className="flex items-center gap-2 font-semibold text-foreground">
            <Building2 className="size-5 text-accent" aria-hidden />
            Объекты и задачи
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/objects"
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
                  isActive && 'bg-muted text-foreground',
                )
              }
            >
              Объекты
            </NavLink>
            {profile?.role === 'executor' && (
              <NavLink
                to="/my-tasks"
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
                    isActive && 'bg-muted text-foreground',
                  )
                }
              >
                <ClipboardList className="size-4" aria-hidden />
                Мои задачи
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium">{profile?.full_name}</p>
              <p className="text-muted-foreground">
                {profile?.role === 'assigner' ? 'Постановщик' : 'Исполнитель'}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
              <LogOut className="size-4" aria-hidden />
              Выйти
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
