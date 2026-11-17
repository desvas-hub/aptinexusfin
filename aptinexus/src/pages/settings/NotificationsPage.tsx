import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bell, CheckCheck } from 'lucide-react'
import { notificationsApi } from '../../services/api'
import type { NotificationCategory, NotificationItem } from '../../types'
import { useToast } from '../../contexts/ToastContext'

const categories: ('All' | NotificationCategory)[] = [
  'All',
  'Skill recommendation',
  'Assessment result',
  'Roadmap milestone',
  'Learning reminder',
  'Profile update',
]

export default function NotificationsPage() {
  const toast = useToast()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const [cat, setCat] = useState<('All' | NotificationCategory)>('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([notificationsApi.list(), notificationsApi.getRead()])
      .then(([notifs, read]) => {
        setItems(Array.isArray(notifs) ? notifs : [])
        setReadIds(Array.isArray(read) ? read : [])
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Could not load notifications.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const toggleRead = async (id: string) => {
    const next = readIds.includes(id) ? readIds.filter(x => x !== id) : [...readIds, id]
    setReadIds(next)
    try {
      await notificationsApi.saveRead(next)
    } catch {
      toast.push('Could not save notification state.', 'error')
    }
  }

  const markAllRead = async () => {
    const allIds = Array.from(new Set([...readIds, ...items.map(i => i.id)]))
    setReadIds(allIds)
    try {
      await notificationsApi.saveRead(allIds)
      toast.push('All notifications marked as read')
    } catch {
      toast.push('Could not save notification state.', 'error')
    }
  }

  const filtered = items.filter(n => cat === 'All' || n.cat === cat)
  const unreadCount = items.filter(n => !readIds.includes(n.id)).length

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">Notifications</h1>
          <p className="text-sm text-[#6e6e73]">
            Live alerts generated from your claimed skills, quiz results, career gaps, and roadmap progress.
          </p>
        </div>
        {unreadCount > 0 && (
          <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={markAllRead}>
            <CheckCheck size={15} /> Mark all read ({unreadCount})
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter notifications">
        {categories.map(c => (
          <button
            key={c}
            type="button"
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
            className={`btn-ghost !py-1.5 text-xs ${cat === c ? 'bg-[#007AFF]/10 text-[#007AFF]' : ''}`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && <div className="glass p-5 text-sm text-[#6e6e73]">Loading your live notifications…</div>}
      {error && (
        <div role="alert" className="glass flex items-center justify-between p-5 text-sm text-[#d70015]">
          <span>{error}</span>
          <button type="button" className="btn-ghost !py-1 text-xs" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="glass flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
          <Bell size={18} className="text-[#007AFF]" />
          <span>You’re all caught up in this category.</span>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(item => {
          const isRead = readIds.includes(item.id)
          return (
            <article
              key={item.id}
              className={`glass p-5 transition-opacity ${isRead ? 'opacity-65' : 'border-l-4 border-l-[#007AFF]'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-black/[0.05] px-2 py-0.5 text-xs font-medium text-[#6e6e73]">
                    {item.cat}
                  </span>
                  <span className="text-xs text-[#86868b]">{item.when}</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleRead(item.id)}
                  className="text-xs text-[#007AFF] hover:underline"
                >
                  {isRead ? 'Mark unread' : 'Mark read'}
                </button>
              </div>
              <h2 className="mt-2 font-medium text-[#1d1d1f]">{item.title}</h2>
              <p className="mt-1 text-sm text-[#3a3a3c]">{item.body}</p>
              {item.actionPath && (
                <div className="mt-3">
                  <Link
                    to={item.actionPath}
                    onClick={() => {
                      if (!isRead) toggleRead(item.id)
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#007AFF] hover:underline"
                  >
                    {item.actionLabel || 'Open'} <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
