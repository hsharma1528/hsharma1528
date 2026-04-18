import React, { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { getUnreadCount } from '../../lib/db'
import NotificationPanel from './NotificationPanel'

export default function NotificationBell({ userId }) {
  const [unread,    setUnread]    = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)

  const fetchCount = async () => {
    try { setUnread(await getUnreadCount(userId)) } catch {}
  }

  useEffect(() => {
    fetchCount()
    const id = setInterval(fetchCount, 60_000)
    return () => clearInterval(id)
  }, [userId])

  return (
    <div className="relative">
      <button
        onClick={() => setPanelOpen((o) => !o)}
        className="relative p-2 text-dark-400 hover:text-white transition-colors rounded-xl hover:bg-dark-700"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {panelOpen && (
        <NotificationPanel
          userId={userId}
          onClose={() => { setPanelOpen(false); fetchCount() }}
        />
      )}
    </div>
  )
}
