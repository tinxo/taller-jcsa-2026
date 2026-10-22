import { Link, Outlet } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Gate, UserMenu, useToken } from './auth'
import { createApi } from './api'

export function Layout() {
  return (
    <div className="app">
      <header>
        <Link to="/"><strong>Taller JCSA · Tareas</strong></Link>
        <nav>
          <Link to="/tareas">Mis tareas</Link>
          <UserMenu />
        </nav>
      </header>
      <main><Outlet /></main>
    </div>
  )
}

export function Home() {
  return (
    <section>
      <h1>Del código a producción</h1>
      <p>App de ejemplo del taller: React + TanStack, FastAPI en Cloudflare Workers, Neon y Clerk.</p>
      <Link to="/tareas" className="btn">Ir a mis tareas</Link>
    </section>
  )
}

export function Tasks() {
  return <Gate><TaskList /></Gate>
}

function TaskList() {
  const api = createApi(useToken())
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState('')
  const refresh = () => qc.invalidateQueries({ queryKey: ['tasks'] })

  const tasks = useQuery({ queryKey: ['tasks'], queryFn: api.list })
  const add = useMutation({ mutationFn: api.create, onSuccess: () => { setTitle(''); refresh() } })
  const toggle = useMutation({ mutationFn: api.toggle, onSuccess: refresh })
  const remove = useMutation({ mutationFn: api.remove, onSuccess: refresh })
  const welcome = useMutation({ mutationFn: api.welcome })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (title.trim()) add.mutate(title.trim())
  }

  return (
    <section>
      <h1>Mis tareas</h1>
      <form onSubmit={submit} className="row">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nueva tarea…" />
        <button className="btn" disabled={add.isPending}>Agregar</button>
      </form>

      {tasks.isLoading && <p>Cargando…</p>}
      {tasks.isError && <p className="error">No se pudo cargar: {tasks.error.message}</p>}
      <ul>
        {tasks.data?.map((t) => (
          <li key={t.id} className={t.done ? 'done' : ''}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => toggle.mutate(t.id)} />
              {t.title}
            </label>
            <button className="link" onClick={() => remove.mutate(t.id)}>Borrar</button>
          </li>
        ))}
        {tasks.data?.length === 0 && <li>No tenés tareas todavía.</li>}
      </ul>

      <h2>Mail de bienvenida (Resend)</h2>
      <div className="row">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@mail.com" />
        <button className="btn" disabled={!email || welcome.isPending} onClick={() => welcome.mutate(email)}>
          Enviar
        </button>
      </div>
      {welcome.isSuccess && <p>¡Enviado!</p>}
      {welcome.isError && <p className="error">{welcome.error.message}</p>}
    </section>
  )
}
