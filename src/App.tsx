import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/auth-context'
import { AppShell } from '@/components/layout/app-shell'
import { ProtectedRoute } from '@/components/protected-route'
import { LoginPage } from '@/pages/login-page'
import { ObjectsPage } from '@/pages/objects-page'
import { ObjectDetailPage } from '@/pages/object-detail-page'
import { TaskDetailPage } from '@/pages/task-detail-page'
import { MyTasksPage } from '@/pages/my-tasks-page'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/objects" replace />} />
            <Route path="/objects" element={<ObjectsPage />} />
            <Route path="/objects/:id" element={<ObjectDetailPage />} />
            <Route path="/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/my-tasks" element={<MyTasksPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/objects" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
