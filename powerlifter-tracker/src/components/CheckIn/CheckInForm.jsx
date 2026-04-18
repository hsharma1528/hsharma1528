import React, { useEffect, useState } from 'react'
import { format, startOfWeek } from 'date-fns'
import { ClipboardCheck, Send, CheckCircle, MessageCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { upsertCheckIn, getCheckIns } from '../../lib/db'

const METRICS = [
  { key: 'energy',       label: 'Energy levels',  emoji: '⚡', desc: 'How energetic do you feel overall?' },
  { key: 'sleep_quality', label: 'Sleep quality',  emoji: '😴', desc: 'How well did you sleep this week?' },
  { key: 'soreness',     label: 'Muscle soreness', emoji: '💪', desc: 'How sore are your muscles?' },
  { key: 'motivation',   label: 'Motivation',      emoji: '🔥', desc: 'How motivated are you to train?' },
]

function ScoreButton({ value, selected, onClick }) {
  const colors = value <= 3
    ? 'border-red-500/40 text-red-400 bg-red-500/10'
    : value <= 6
    ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10'
    : 'border-green-500/40 text-green-400 bg-green-500/10'

  return (
    <button
      onClick={() => onClick(value)}
      className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all ${
        selected
          ? colors + ' ring-2 ring-offset-1 ring-offset-dark-800 scale-110'
          : 'border-dark-600 text-dark-400 hover:border-dark-400 hover:text-white'
      }`}>
      {value}
    </button>
  )
}

function CheckInHistoryCard({ ci }) {
  const metrics = [
    { label: 'Energy', val: ci.energy },
    { label: 'Sleep',  val: ci.sleep_quality },
    { label: 'Sore',   val: ci.soreness },
    { label: 'Motiv',  val: ci.motivation },
  ].filter((m) => m.val)

  const avg = metrics.length
    ? (metrics.reduce((s, m) => s + m.val, 0) / metrics.length).toFixed(1)
    : '—'

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white text-sm font-medium">
          Week of {format(new Date(ci.week_start + 'T00:00:00'), 'MMM d, yyyy')}
        </span>
        <span className={`text-xs font-bold ${
          parseFloat(avg) >= 7 ? 'text-green-400' : parseFloat(avg) >= 5 ? 'text-yellow-400' : 'text-red-400'
        }`}>avg {avg}/10</span>
      </div>
      <div className="flex gap-4 mb-2">
        {metrics.map((m) => (
          <div key={m.label} className="text-center">
            <div className="text-dark-500 text-xs">{m.label}</div>
            <div className={`font-bold text-sm ${
              m.val >= 7 ? 'text-green-400' : m.val >= 5 ? 'text-yellow-400' : 'text-red-400'
            }`}>{m.val}</div>
          </div>
        ))}
      </div>
      {ci.notes && <p className="text-dark-400 text-xs italic mb-2">"{ci.notes}"</p>}
      {ci.coach_reply && (
        <div className="flex items-start gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 mt-2">
          <MessageCircle className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
          <p className="text-dark-300 text-xs"><span className="text-purple-400 font-semibold">Coach: </span>{ci.coach_reply}</p>
        </div>
      )}
    </div>
  )
}

export default function CheckInForm() {
  const { currentUser } = useApp()
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const [form,      setForm]      = useState({ energy: null, sleep_quality: null, soreness: null, motivation: null, notes: '' })
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [thisWeek,  setThisWeek]  = useState(null)

  useEffect(() => {
    getCheckIns(currentUser.id, 8)
      .then((data) => {
        setHistory(data)
        const tw = data.find((ci) => ci.week_start === weekStart)
        if (tw) {
          setThisWeek(tw)
          setForm({
            energy:       tw.energy       ?? null,
            sleep_quality: tw.sleep_quality ?? null,
            soreness:     tw.soreness     ?? null,
            motivation:   tw.motivation   ?? null,
            notes:        tw.notes        ?? '',
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [currentUser.id, weekStart])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: f[key] === val ? null : val }))

  const handleSubmit = async () => {
    const scored = METRICS.filter((m) => form[m.key] !== null)
    if (scored.length === 0) return
    setSaving(true)
    try {
      const saved = await upsertCheckIn({
        user_id:      currentUser.id,
        week_start:   weekStart,
        energy:       form.energy,
        sleep_quality: form.sleep_quality,
        soreness:     form.soreness,
        motivation:   form.motivation,
        notes:        form.notes || null,
      })
      setThisWeek(saved)
      setHistory((prev) => {
        const without = prev.filter((ci) => ci.week_start !== weekStart)
        return [saved, ...without]
      })
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-purple-400" />
          Weekly check-in
        </h1>
        <p className="text-dark-400 text-sm mt-1">
          Week of {format(new Date(weekStart + 'T00:00:00'), 'MMMM d, yyyy')}
        </p>
      </div>

      {submitted && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400">
          <CheckCircle className="w-5 h-5 shrink-0" />
          Check-in submitted! Your coach will see this.
        </div>
      )}

      {/* Form */}
      <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5 space-y-5">
        {METRICS.map(({ key, label, emoji, desc }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white text-sm font-medium">
                {emoji} {label}
              </label>
              {form[key] && (
                <span className={`text-xs font-bold ${
                  form[key] >= 7 ? 'text-green-400' : form[key] >= 5 ? 'text-yellow-400' : 'text-red-400'
                }`}>{form[key]}/10</span>
              )}
            </div>
            <p className="text-dark-500 text-xs mb-2">{desc}</p>
            <div className="flex gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                <ScoreButton key={v} value={v} selected={form[key] === v} onClick={(val) => set(key, val)} />
              ))}
            </div>
          </div>
        ))}

        <div>
          <label className="text-white text-sm font-medium mb-2 block">📝 Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="How's your training going? Any injuries, life stress, or wins to share with your coach?"
            className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-brand-500 resize-none"
            rows={3}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || METRICS.every((m) => form[m.key] === null)}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
          <Send className="w-4 h-4" />
          {saving ? 'Submitting…' : thisWeek ? 'Update check-in' : 'Submit check-in'}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-3 text-sm">Previous check-ins</h2>
          <div className="space-y-3">
            {history.map((ci) => (
              <CheckInHistoryCard key={ci.id} ci={ci} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
