import React, { useState, useEffect } from 'react'
import { X, Layers, ChevronRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getMentees, applyBlockTemplate } from '../../lib/db'
import { format, addDays, nextMonday } from 'date-fns'

const inputCls = "w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors text-sm"

function nextMondayStr() {
  const d = nextMonday(new Date())
  return d.toISOString().split('T')[0]
}

export default function ApplyBlockTemplateModal({ template, onClose }) {
  const { currentUser } = useApp()
  const [mentees,    setMentees]    = useState([])
  const [athleteId,  setAthleteId]  = useState('')
  const [startDate,  setStartDate]  = useState(nextMondayStr)
  const [applying,   setApplying]   = useState(false)
  const [done,       setDone]       = useState(false)

  useEffect(() => {
    getMentees(currentUser.id).then(setMentees).catch(console.error)
  }, [currentUser.id])

  const weekDates = (template.plans || []).map((p, i) => {
    const d = addDays(new Date(startDate + 'T00:00:00'), (p.week_offset ?? i) * 7)
    return { label: p.title || `Week ${i + 1}`, date: format(d, 'MMM d, yyyy') }
  })

  const handleApply = async () => {
    if (!athleteId) return
    setApplying(true)
    try {
      await applyBlockTemplate(template, {
        coachId:        currentUser.id,
        athleteId,
        blockStartDate: startDate,
      })
      setDone(true)
      setTimeout(onClose, 1400)
    } catch (err) {
      alert('Failed to apply block: ' + err.message)
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
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-400" />Apply block template
              </h3>
              <p className="text-dark-400 text-xs mt-0.5">{template.title}</p>
            </div>
            <button onClick={onClose} className="text-dark-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
          </div>

          {done ? (
            <p className="text-green-400 text-sm text-center py-4">Block applied! Plans created.</p>
          ) : (
            <>
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
                <label className="block text-dark-400 text-xs mb-1">Block start date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </div>

              {weekDates.length > 0 && (
                <div>
                  <p className="text-dark-400 text-xs mb-2">Weekly plan schedule:</p>
                  <div className="bg-dark-900 rounded-xl border border-dark-700 divide-y divide-dark-700">
                    {weekDates.map((w, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2">
                        <span className="text-white text-xs">{w.label}</span>
                        <span className="text-dark-400 text-xs">{w.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={handleApply} disabled={!athleteId || applying}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {applying ? 'Creating…' : <><span>Apply block</span><ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
