import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../lib/cloud'
import type { CloudNotification } from '../types'

export default function NotificationsBell({ uid }: { uid: string }) {
  const [items, setItems] = useState<CloudNotification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const refresh = async () => setItems(await listNotifications())

  useEffect(() => {
    refresh()
    // Real-time, RLS-scoped inserts (e.g. saved-search matches).
    const channel = supabase
      ?.channel('notifications-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, refresh)
      .subscribe()
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('mousedown', onClick); channel?.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  const unread = items.filter(n => !n.read).length

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} aria-label="Notifications"
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
        <Bell size={18} />
        {unread > 0 && <span className="absolute top-1 right-1 text-[10px] bg-red-500 text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="font-bold text-sm">Notifications</p>
            {unread > 0 && (
              <button onClick={() => { markAllNotificationsRead(uid); setItems(p => p.map(n => ({ ...n, read: true }))) }}
                className="text-xs text-teal-600 font-semibold flex items-center gap-1"><CheckCheck size={13} /> Mark all read</button>
            )}
          </div>
          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10 flex flex-col items-center gap-2"><BellOff size={22} /> No notifications yet</p>
            ) : items.map(n => (
              <button key={n.id} onClick={() => { if (!n.read) { markNotificationRead(n.id); setItems(p => p.map(x => x.id === n.id ? { ...x, read: true } : x)) } }}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${n.read ? '' : 'bg-teal-50/60 dark:bg-teal-950/30'}`}>
                <p className="text-sm font-semibold flex items-center gap-2">{!n.read && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />}{n.title}</p>
                {n.body && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
