import React, { useState, useEffect } from 'react'
import { Globe, Eye, CheckCircle, Tag, Dumbbell, X, Play } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getPublicTemplates, getProgramSubscriptions, subscribeToProgram } from '../../lib/db'
import { CATEGORY_COLORS } from '../Workout/ExercisePicker'

function TagChip({ label }) {
  return (
    <span className="flex items-center gap-1 text-xs text-dark-400 bg-dark-700 border border-dark-600 rounded-full px-2 py-0.5">
      <Tag className="w-2.5 h-2.5" />{label}
    </span>
  )
}

function PreviewModal({ template, onClose, subscribed, onSubscribe }) {
  const days = template.days || []
  return (
    <>
      <div className="fixed inset-0 z-40 bg-dark-950/70" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between p-5 border-b border-dark-700 shrink-0">
            <div>
              <h3 className="text-white font-semibold">{template.title}</h3>
              {template.description && <p className="text-dark-400 text-xs mt-0.5">{template.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              {!subscribed && (
                <button onClick={onSubscribe}
                  className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
                  <Play className="w-3.5 h-3.5" />Follow plan
                </button>
              )}
              <button onClick={onClose} className="text-dark-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="overflow-y-auto p-5 space-y-4">
            {days.map((day, idx) => (
              <div key={day.id || idx} className="bg-dark-900 rounded-xl border border-dark-700">
                <div className="px-4 py-3 border-b border-dark-700">
                  <span className="text-white font-medium text-sm">{day.day_label || `Day ${idx + 1}`}</span>
                  <span className="text-dark-500 text-xs ml-2">· {(day.exercises || []).length} exercises</span>
                </div>
                <div className="px-4 divide-y divide-dark-700">
                  {(day.exercises || []).map((ex, ei) => {
                    const cc = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.other
                    return (
                      <div key={ex.id || ei} className="flex items-center gap-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-lg border text-xs shrink-0 ${cc}`}>{ex.category}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm">{ex.name}</div>
                          <div className="text-dark-400 text-xs mt-0.5">
                            {ex.sets} sets × {ex.target_reps || '—'} reps
                            {ex.target_weight ? <span className="text-dark-500"> @ {ex.target_weight}</span> : ''}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function ProgramCard({ template, subscribed, onPreview, onSubscribe }) {
  const days    = template.days || []
  const exCount = days.reduce((n, d) => n + (d.exercises || []).length, 0)
  const cats    = [...new Set(days.flatMap((d) => (d.exercises || []).map((e) => e.category)))]

  return (
    <div className={`bg-dark-800 border rounded-2xl p-4 flex flex-col gap-3 transition-colors ${
      subscribed ? 'border-green-500/30 hover:border-green-500/50' : 'border-dark-700 hover:border-dark-600'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">{template.title}</h3>
          {template.description && <p className="text-dark-400 text-xs mt-0.5 line-clamp-2">{template.description}</p>}
          {template.coach?.name && <p className="text-dark-500 text-xs mt-0.5">by {template.coach.name}</p>}
        </div>
        {subscribed && (
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
        )}
      </div>

      <div className="flex items-center gap-3 text-dark-400 text-xs">
        <span><Dumbbell className="w-3 h-3 inline mr-1" />{days.length} day{days.length !== 1 ? 's' : ''}</span>
        <span>{exCount} exercises</span>
        <div className="flex gap-1 ml-auto">
          {cats.slice(0, 3).map((cat) => (
            <span key={cat} className={`px-1.5 py-0.5 rounded border text-xs ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.other}`}>{cat}</span>
          ))}
        </div>
      </div>

      {(template.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1">{template.tags.map((t) => <TagChip key={t} label={t} />)}</div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={() => onPreview(template)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-dark-300 hover:text-white bg-dark-700 hover:bg-dark-600 border border-dark-600 py-2 rounded-xl transition-colors">
          <Eye className="w-3.5 h-3.5" />Preview
        </button>
        <button
          onClick={() => !subscribed && onSubscribe(template)}
          disabled={subscribed}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl transition-colors font-semibold ${
            subscribed
              ? 'bg-green-500/10 border border-green-500/30 text-green-400 cursor-default'
              : 'bg-brand-600 hover:bg-brand-500 text-white'
          }`}>
          <Play className="w-3.5 h-3.5" />{subscribed ? 'Following' : 'Follow plan'}
        </button>
      </div>
    </div>
  )
}

export default function ProgramBrowser() {
  const { currentUser } = useApp()
  const [templates,   setTemplates]   = useState([])
  const [subscribed,  setSubscribed]  = useState(new Set())
  const [loading,     setLoading]     = useState(true)
  const [preview,     setPreview]     = useState(null)
  const [subscribing, setSubscribing] = useState(null)

  useEffect(() => {
    Promise.all([
      getPublicTemplates(),
      getProgramSubscriptions(currentUser.id),
    ]).then(([tpls, subs]) => {
      setTemplates(tpls)
      setSubscribed(subs)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [currentUser.id])

  const handleSubscribe = async (template) => {
    setSubscribing(template.id)
    try {
      await subscribeToProgram(currentUser.id, template)
      setSubscribed((prev) => new Set([...prev, template.id]))
    } catch (err) {
      alert('Failed to subscribe: ' + err.message)
    } finally {
      setSubscribing(null)
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      {preview && (
        <PreviewModal
          template={preview}
          subscribed={subscribed.has(preview.id)}
          onClose={() => setPreview(null)}
          onSubscribe={() => { handleSubscribe(preview); setPreview(null) }}
        />
      )}

      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-brand-400" />Free Programs
        </h1>
        <p className="text-dark-400 text-sm mt-0.5">
          Follow a structured training program without a coach. Your workouts will appear on your dashboard.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 bg-dark-800 rounded-2xl border border-dark-700">
          <Globe className="w-10 h-10 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">No public programs available yet.</p>
        </div>
      ) : (
        <>
          {subscribed.size > 0 && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5 text-green-400 text-sm">
              You're following {subscribed.size} program{subscribed.size !== 1 ? 's' : ''}.
              Plans will appear on your Dashboard and Workout page.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <ProgramCard
                key={t.id}
                template={t}
                subscribed={subscribed.has(t.id)}
                onPreview={setPreview}
                onSubscribe={subscribing === t.id ? () => {} : handleSubscribe}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
