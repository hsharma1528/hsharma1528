import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronRight } from 'lucide-react'
import { getMentees, applyTemplate } from '../../lib/db'
import { useApp } from '../../context/AppContext'

const inputCls = "w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors text-sm"

export default function ApplyTemplateModal({ template, onClose }) {
  const { currentUser } = useApp()
  const navigate = useNavigate()

  const [mentees,    setMentees]    = useState([])
  const [athleteId,  setAthleteId]  = useState('')
  const [weekStart,  setWeekStart]  = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1)
    return d.toISOString().split('T')[0]
  })
  const [applying,   setApplying]   = useState(false)
  const [preview,    setPreview]    = useState([])

  useEffect(() => {
    getMentees(currentUser.id).then(setMentees).catch(console.error)
  }, [currentUser.id])

  // Compute resolved weight preview when athlete changes
  useEffect(() => {
    if (!athleteId) { setPreview([]); return }
    const m = mentees.find((m) => m.athlete_id === athleteId)
    const ap = m?.athlete
    if (!ap) { setPreview([]); return }

    const maxMap = {
      squat:    parseFloat(ap.squat_max)    || 0,
      bench:    parseFloat(ap.bench_max)    || 0,
      deadlift: parseFloat(ap.deadlift_max) || 0,
    }
    const rows = []
    ;(template.days || []).forEach((day) => {
      ;(day.exercises || []).forEach((ex) => {
        const match = /^(\d+(?:\.\d+)?)%$/.exec((ex.target_weight || '').trim())
        if (!match) return
        const pct  = parseFloat(match[1])
        const onerm = maxMap[ex.category] || 0
        if (!onerm) return
        const resolved = Math.round((onerm * pct) / 100 / 2.5) * 2.5
        rows.push({ name: ex.name, pct, onerm, resolved, unit: ap.weight_unit || 'kg' })
      })
    })
    setPreview(rows)
  }, [athleteId, mentees, template])

  const handleApply = async () => {
    if (!athleteId) return
    const m = mentees.find((me) => me.athlete_id === athleteId)
    const ap = m?.athlete
    setApplying(true)
    try {
      const plan = await applyTemplate(template, {
        coachId:        currentUser.id,
        athleteId,
        weekStart,
        athleteProfile: ap,
      })
      onClose()
      navigate(`/mentee/${athleteId}/plan/${plan.id}`)
    } catch (err) {
      alert('Failed to apply template: ' + err.message)
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-dark-950/70" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">Apply template</h3>
              <p className="text-dark-400 text-xs mt-0.5">{template.title}</p>
            </div>
            <button onClick={onClose} className="text-dark-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
          </div>

          <div>
            <label className="block text-dark-400 text-xs mb-1">Athlete <span className="text-red-400">*</span></label>
            <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)} className={inputCls + ' cursor-pointer'}>
              <option value="">Select athlete…</option>
              {mentees.map((m) => (
                <option key={m.athlete_id} value={m.athlete_id}>
                  {m.athlete?.name || m.athlete?.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-dark-400 text-xs mb-1">Week starting</label>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className={inputCls} />
          </div>

          {/* % weight preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-dark-400 text-xs mb-2">Percentage weights will be resolved:</p>
              <div className="bg-dark-900 rounded-xl border border-dark-700 divide-y divide-dark-700">
                {preview.map((row, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2">
                    <span className="text-white text-xs">{row.name}</span>
                    <span className="text-dark-400 text-xs">
                      {row.pct}% of {row.onerm} = <span className="text-brand-400 font-medium">{row.resolved} {row.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
            <button onClick={handleApply} disabled={!athleteId || applying}
              className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {applying ? 'Creating…' : <><span>Create plan</span><ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
