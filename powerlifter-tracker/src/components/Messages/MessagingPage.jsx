import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, User } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getMentees, getMyEnrollments, getMessages, sendMessage, markMessagesRead } from '../../lib/db'
import { supabase } from '../../lib/supabase'
import { format, parseISO } from 'date-fns'

function Avatar({ profile, size = 'w-9 h-9' }) {
  const name = profile?.name || profile?.username || '?'
  return profile?.avatar_url
    ? <img src={profile.avatar_url} alt="" className={`${size} rounded-full object-cover shrink-0`} />
    : (
      <div className={`${size} rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center shrink-0`}>
        <span className="text-dark-300 text-sm font-semibold">{name[0].toUpperCase()}</span>
      </div>
    )
}

export default function MessagingPage() {
  const { currentUser } = useApp()
  const isCoach = currentUser.role === 'coach'

  const [contacts,  setContacts]  = useState([])
  const [selected,  setSelected]  = useState(null)
  const [messages,  setMessages]  = useState([])
  const [body,      setBody]      = useState('')
  const [sending,   setSending]   = useState(false)
  const [loading,   setLoading]   = useState(true)
  const bottomRef = useRef(null)

  // Load contact list
  useEffect(() => {
    const load = async () => {
      if (isCoach) {
        const mentees = await getMentees(currentUser.id)
        setContacts(mentees.map((m) => ({ id: m.athlete_id, profile: m.athlete })))
      } else {
        const enrollments = await getMyEnrollments(currentUser.id)
        const accepted = enrollments.filter((e) => e.status === 'accepted')
        setContacts(accepted.map((e) => ({ id: e.coach_id, profile: e.coach })))
      }
      setLoading(false)
    }
    load().catch(console.error)
  }, [currentUser.id, isCoach])

  // Load messages when contact changes
  useEffect(() => {
    if (!selected) { setMessages([]); return }
    getMessages(currentUser.id, selected.id)
      .then(setMessages)
      .catch(console.error)
    markMessagesRead(currentUser.id, selected.id).catch(console.error)
  }, [selected, currentUser.id])

  // Realtime subscription
  useEffect(() => {
    if (!selected) return
    const channel = supabase
      .channel(`messages-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${currentUser.id}`,
      }, (payload) => {
        const msg = payload.new
        if (msg.sender_id === selected.id) {
          setMessages((prev) => [...prev, { ...msg, sender: selected.profile }])
          markMessagesRead(currentUser.id, selected.id).catch(console.error)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected, currentUser.id])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!body.trim() || !selected || sending) return
    setSending(true)
    const text = body.trim()
    setBody('')
    try {
      const msg = await sendMessage(currentUser.id, selected.id, text)
      setMessages((prev) => [...prev, msg])
    } catch (err) {
      alert('Failed to send: ' + err.message)
      setBody(text)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)] max-w-5xl mx-auto">
      {/* Contact list */}
      <div className="w-64 shrink-0 bg-dark-800 border-r border-dark-700 flex flex-col">
        <div className="p-4 border-b border-dark-700">
          <h1 className="text-white font-semibold flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-brand-400" />Messages
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-4 text-center">
              <User className="w-8 h-8 text-dark-600 mx-auto mb-2" />
              <p className="text-dark-400 text-xs">
                {isCoach ? 'No mentees yet.' : 'No coach connected yet.'}
              </p>
            </div>
          ) : contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-dark-700 ${
                selected?.id === c.id ? 'bg-dark-700 border-r-2 border-brand-500' : ''
              }`}
            >
              <Avatar profile={c.profile} />
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{c.profile?.name || c.profile?.username}</div>
                <div className="text-dark-500 text-xs truncate">@{c.profile?.username}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400 text-sm">Select a conversation to start messaging</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-dark-700 bg-dark-800">
              <Avatar profile={selected.profile} />
              <div>
                <div className="text-white font-medium text-sm">{selected.profile?.name || selected.profile?.username}</div>
                <div className="text-dark-500 text-xs">@{selected.profile?.username}</div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const mine = msg.sender_id === currentUser.id
                return (
                  <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} gap-2`}>
                    {!mine && <Avatar profile={msg.sender} size="w-7 h-7" />}
                    <div className={`max-w-xs lg:max-w-sm xl:max-w-md rounded-2xl px-4 py-2.5 ${
                      mine
                        ? 'bg-brand-600 text-white rounded-br-sm'
                        : 'bg-dark-800 border border-dark-700 text-white rounded-bl-sm'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                      <p className={`text-xs mt-1 ${mine ? 'text-brand-300' : 'text-dark-500'}`}>
                        {msg.created_at ? format(parseISO(msg.created_at), 'h:mm a') : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-dark-700 bg-dark-800">
              <div className="flex gap-2">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="flex-1 bg-dark-900 border border-dark-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-brand-500 resize-none transition-colors"
                  placeholder="Type a message… (Enter to send)"
                />
                <button
                  onClick={handleSend}
                  disabled={!body.trim() || sending}
                  className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
