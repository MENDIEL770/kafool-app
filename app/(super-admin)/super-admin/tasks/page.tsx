'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface Task {
  id: string
  title: string
  description: string | null
  due_date: string | null
  completed: boolean
  completed_at: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
}

const PRIORITY_LABELS = { urgent: 'דחוף', high: 'גבוה', normal: 'רגיל', low: 'נמוך' }
const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function TasksPage() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'done' | 'urgent'>('all')
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({ title: '', description: '', due_date: '', priority: 'normal' })
  const [loading, setLoading] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('completed', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
    setTasks((data as Task[]) || [])
  }

  useEffect(() => { load() }, [])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').insert({
      title: form.title,
      description: form.description || null,
      due_date: form.due_date || null,
      priority: form.priority,
      created_by: user?.id,
    })
    setForm({ title: '', description: '', due_date: '', priority: 'normal' })
    setShowForm(false)
    setLoading(false)
    load()
  }

  async function toggleDone(task: Task) {
    await supabase.from('tasks').update({
      completed: !task.completed,
      completed_at: !task.completed ? new Date().toISOString() : null,
    }).eq('id', task.id)
    load()
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    load()
  }

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return !t.completed
    if (filter === 'done') return t.completed
    if (filter === 'urgent') return t.priority === 'urgent' && !t.completed
    return true
  })

  const isOverdue = (t: Task) => !t.completed && t.due_date && new Date(t.due_date) < new Date()

  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📝 יומן משימות</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          + משימה חדשה
        </button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={addTask} className="space-y-3">
              <input
                required
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="כותרת המשימה"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="תיאור (אופציונלי)"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">תאריך ושעה</label>
                  <input
                    type="datetime-local"
                    value={form.due_date}
                    onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">עדיפות</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                  >
                    <option value="urgent">🔴 דחוף</option>
                    <option value="high">🟠 גבוה</option>
                    <option value="normal">🔵 רגיל</option>
                    <option value="low">⚪ נמוך</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {loading ? '...' : 'הוסף'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                  ביטול
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'urgent', 'done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'הכל' : f === 'pending' ? 'ממתינות' : f === 'urgent' ? '🔴 דחוף' : 'הושלמו'}
          </button>
        ))}
        <span className="mr-auto text-sm text-gray-400 self-center">{filtered.length} משימות</span>
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <div className="text-3xl mb-2">✓</div>
            <p>אין משימות</p>
          </div>
        )}
        {filtered.map(task => (
          <div
            key={task.id}
            className={`bg-white border rounded-2xl p-4 space-y-2 transition-opacity ${
              task.completed ? 'opacity-60' : ''
            } ${isOverdue(task) ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleDone(task)}
                aria-label={task.completed ? 'סמן כלא הושלם' : 'סמן כהושלם'}
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                  task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'
                }`}
              >
                {task.completed && <span className="text-white text-xs flex items-center justify-center h-full">✓</span>}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {task.title}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                </div>
                {task.due_date && (
                  <div className={`text-xs mt-0.5 ${isOverdue(task) ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    ⏰ {new Date(task.due_date).toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {isOverdue(task) && ' — באיחור!'}
                  </div>
                )}
                {task.description && (
                  <button
                    onClick={() => setExpanded(prev => {
                      const next = new Set(prev)
                      next.has(task.id) ? next.delete(task.id) : next.add(task.id)
                      return next
                    })}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    {expanded.has(task.id) ? 'הסתר פרטים ▲' : 'הצג פרטים ▼'}
                  </button>
                )}
                {task.description && expanded.has(task.id) && (
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{task.description}</p>
                )}
              </div>

              <button
                onClick={() => deleteTask(task.id)}
                aria-label="מחק משימה"
                className="text-gray-300 hover:text-red-400 text-sm shrink-0 transition-colors"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
