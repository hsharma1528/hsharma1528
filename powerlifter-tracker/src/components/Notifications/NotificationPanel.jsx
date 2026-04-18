import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  X, BellOff, UserPlus, CheckCircle, XCircle,
  ClipboardList, RefreshCw, Dumbbell, Check
} from 'lucide-react'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../lib/db'

const TYPE_CONFIG = {
  enrollment_request: { Icon: UserPlus,      color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  enrollment_accepted:{ Icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-500/10'  },
  enrollment_declined:{ Icon: XCircle,       color: 'text-dark-400',   bg: 'bg-dark-700'      },
  plan_created:       { Icon: ClipboardList, color: 'text-brand-400',  bg: 'bg-brand-500/10'  },
  plan_updated:       { Icon: RefreshCw,     color: 'text-brand-400',  bg: 'bg-brand-500/10'  },
  session_logged:     { Icon: Dumbbell,      color: 'text-purple-400', bg: 'bg-purple-500/10' },
}

const defaultConfig = { Icon: BellOff, color: 'text-dark-400', bg: 'bg-dark-700' }

export default function NotificationPanel({ userId, onClose }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getNotifications(userId)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  const handleClick = async (n) => {
    if (!n.read) {
      markNotificationRead(n.id).catch(() => {})
      setItems((prev) => prev.map((i) => i.id === n.id ? { ...i, read: true } : i))
    }
    onClose()
    if (n.link) navigate(n.link)
  }

  const handleMarkAll = async () => {
    markAllNotificationsRead(userId).catch(() => {})
    setItems((prev) => prev.map((i) => ({ ...i, read: true })))
  }

  const unreadCount = items.filter((i) => !i.read).length

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-700 rounded-2xl shadow-2xl shadow-dark-950/60 z-50 flex flex-col max-h-[480px]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-brand-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button onClick={handleMarkAll}
                className="text-dark-400 hover:text-white text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-dark-700 transition-colors">
                <Check className="w-3 h-3" />All read
              </button>
            )}
            <button onClick={onClose} className="text-dark-400 hover:text-white p-1 rounded-lg hover:bg-dark-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10">
              <BellOff className="w-8 h-8 text-dark-600 mx-auto mb-2" />
              <p className="text-dark-500 text-sm">No notifications yet</p>
            </div>
          ) : (
            items.map((n) => {
              const cfg = TYPE_CONFIG[n.type] || defaultConfig
              const { Icon } = cfg
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-dark-700/60 transition-colors text-left border-b border-dark-700/50 last:border-0 ${
                    !n.read ? 'bg-dark-750' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium leading-tight ${n.read ? 'text-dark-300' : 'text-white'}`}>
                      {n.title}
                    </div>
                    {n.body && (
                      <div className="text-dark-500 text-xs mt-0.5 leading-tight truncate">{n.body}</div>
                    )}
                    <div className="text-dark-600 text-[10px] mt-1">
                      {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
