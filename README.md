# Мини-CRM «Объекты и задачи»

React + TypeScript + Supabase. Две роли (постановщик / исполнитель), объекты, задачи со статусами, история и **RLS** в базе.

## Локальный запуск (уже настроено)

```bash
npm install
npm run dev
```

Откройте http://localhost:5173

Тестовые аккаунты (облачный Supabase):

| Роль | Email | Пароль |
|---|---|---|
| Постановщик | `assigner@crm.test` | `Assigner123!` |
| Исполнитель | `executor1@crm.test` | `Executor123!` |
| Исполнитель | `executor2@crm.test` | `Executor123!` |

Переменные `VITE_SUPABASE_*` лежат в `.env` (файл не коммитится).

## Быстрый старт

1. Создайте проект в [Supabase](https://supabase.com), отключите **Sign up** в Authentication → Providers → Email.
2. В SQL Editor выполните миграцию из [`supabase/migrations/20260305000000_initial.sql`](supabase/migrations/20260305000000_initial.sql).
3. Создайте пользователей в Authentication → Users (минимум 1 постановщик и 2 исполнителя).
4. Для каждого user id добавьте строку в `profiles` (см. [`supabase/seed.sql`](supabase/seed.sql)).
5. Скопируйте `.env.example` в `.env` и укажите `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` (только anon, не service_role).

```bash
npm install
npm run dev
```

Сборка: `npm run build`.

## Деплой (Vercel)

- Root: репозиторий, framework Vite.
- Environment: те же `VITE_*` переменные.
- `service_role` **не** добавлять во фронт.

## Экраны

- `/login` — вход
- `/objects` — список объектов
- `/objects/:id` — объект и задачи
- `/tasks/:id` — карточка задачи, действия, история
- `/my-tasks` — задачи исполнителя

## Безопасность

- Права в **RLS**, не только в UI.
- Смена статуса только через RPC `change_task_status` (проверка переходов в БД).
- `task_status_history` — только чтение для клиента; записи создаёт БД.
- Исполнитель видит только свои задачи и связанные объекты.

Подробнее для заказчика: [`docs/HANDOFF.md`](docs/HANDOFF.md).  
Допущения: [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md).
