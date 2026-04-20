import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import {
  Plus, Trash2, Save, X, ChevronDown, ChevronUp, ArrowLeft, GripVertical,
  BookMarked, ChevronRight, Layers
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  createWorkoutPlan, updateWorkoutPlan, getPlan, getMenteeProfile, createNotification,
  getTrainingBlocks, createTrainingBlock, createTemplate, sendPushNotification,
} from '../../lib/db'
import ExercisePicker, { CATEGORY_COLORS } from '../Workout/ExercisePicker'

const inputCls = "w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors text-sm"

function PlanExerciseRow({ ex, onChange, onDelete }) {
  const cc = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.other
  return (
    <div className="bg-dark-900 rounded-xl border border-dark-700 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-lg border text-xs ${cc}`}>{ex.category}</span>
          <span className="text-white text-sm font-medium">{ex.name}</span>
        </div>
        <button onClick={onDelete} className="text-dark-500 hover:text-red-400 transition-colors p-1">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-dark-500 text-xs mb-1 block">Sets</label>
          <input type="number" value={ex.sets} min="1" max="20"
            onChange={(e) => onChange({ ...ex, sets: e.target.value })}
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-brand-500"
            placeholder="3" />
        </div>
        <div>
          <label className="text-dark-500 text-xs mb-1 block">Target reps</label>
          <input type="text" value={ex.target_reps}
            onChange={(e) => onChange({ ...ex, target_reps: e.target.value })}
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-brand-500"
            placeholder="5 or 3-5" />
        </div>
        <div>
          <label className="text-dark-500 text-xs mb-1 block">Target weight</label>
          <input type="text" value={ex.target_weight}
            onChange={(e) => onChange({ ...ex, target_weight: e.target.value })}
            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-brand-500"
            placeholder="200 or 80%" />
        </div>
      </div>
      <input type="text" value={ex.notes}
        onChange={(e) => onChange({ ...ex, notes: e.target.value })}
        className="w-full bg-dark-800 border border-dark-600 rounded-lg px-2 py-1.5 text-dark-300 text-sm placeholder-dark-600 focus:outline-none focus:border-dark-500"
        placeholder="Notes (e.g. RPE 8, pause 1s at bottom)…" />
    </div>
  )
}

function PlanDayCard({ day, dayIndex, onChange, onDelete, coachId }) {
  const [expanded, setExpanded]   = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  const addExercise = (ex) => {
    onChange({
      ...day,
      exercises: [...day.exercises, { id: uuidv4(), name: ex.name, category: ex.category, sets: '3', target_reps: '', target_weight: '', notes: '' }],
    })
  }
  const updateExercise = (id, updated) =>
    onChange({ ...day, exercises: day.exercises.map((e) => e.id === id ? updated : e) })
  const removeExercise = (id) =>
    onChange({ ...day, exercises: day.exercises.filter((e) => e.id !== id) })

  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      {showPicker && <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} coachId={coachId} />}
      <div className="flex items-center gap-3 p-4">
        <GripVertical className="w-4 h-4 text-dark-600 shrink-0" />
        <input
          value={day.day_label}
          onChange={(e) => onChange({ ...day, day_label: e.target.value })}
          className="flex-1 bg-transparent text-white font-medium text-sm focus:outline-none border-b border-transparent focus:border-brand-500 pb-0.5 transition-colors"
          placeholder="Day label (e.g. Day 1 – Squat)" />
        <span className="text-dark-500 text-xs shrink-0">{day.exercises.length} exercises</span>
        <button onClick={() => setExpanded(!expanded)} className="text-dark-400 hover:text-white p-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button onClick={onDelete} className="text-dark-500 hover:text-red-400 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-dark-700">
          <div className="space-y-2 mt-3">
            {day.exercises.map((ex) => (
              <PlanExerciseRow key={ex.id} ex={ex}
                onChange={(updated) => updateExercise(ex.id, updated)}
                onDelete={() => removeExercise(ex.id)} />
            ))}
          </div>
          <button onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 w-full border border-dashed border-dark-600 hover:border-brand-600 rounded-xl py-2.5 text-dark-400 hover:text-brand-400 transition-all justify-center text-sm mt-2">
            <Plus className="w-4 h-4" />Add exercise
          </button>
        </div>
      )}
    </div>
  )
}

const newDay = () => ({
  id: uuidv4(),
  day_label: '',
  exercises: [],
})

// ── Save as Template modal ──────────────────────────────────────────
function SaveTemplateModal({ days, title, coachId, onClose }) {
  const [tTitle, setTTitle]   = useState(title)
  const [desc, setDesc]       = useState('')
  const [tags, setTags]       = useState('')
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)

  const handleSave = async () => {
    if (!tTitle.trim()) return
    setSaving(true)
    try {
      await createTemplate({
        coach_id:    coachId,
        title:       tTitle.trim(),
        description: desc.trim() || null,
        tags:        tags.split(',').map((t) => t.trim()).filter(Boolean),
        days,
        is_system:   false,
      })
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      alert('Failed to save template: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-dark-950/60" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-brand-400" />Save as template
            </h3>
            <button onClick={onClose} className="text-dark-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
          </div>
          {done ? (
            <p className="text-green-400 text-sm text-center py-4">Template saved!</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-dark-400 text-xs mb-1">Template name</label>
                <input value={tTitle} onChange={(e) => setTTitle(e.target.value)} className={inputCls} placeholder="e.g. Hypertrophy Block A" />
              </div>
              <div>
                <label className="block text-dark-400 text-xs mb-1">Description (optional)</label>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
                  className={inputCls + ' resize-none'} placeholder="Brief description…" />
              </div>
              <div>
                <label className="block text-dark-400 text-xs mb-1">Tags (comma-separated)</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="strength, 4-day, meet-prep" />
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving || !tTitle.trim()}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save template'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── New block inline form ───────────────────────────────────────────
function NewBlockForm({ onSave, onCancel, unit }) {
  const [label,   setLabel]   = useState('')
  const [startD,  setStartD]  = useState('')
  const [endD,    setEndD]    = useState('')
  const [gSq,     setGSq]     = useState('')
  const [gBn,     setGBn]     = useState('')
  const [gDl,     setGDl]     = useState('')
  const [gBw,     setGBw]     = useState('')
  const [notes,   setNotes]   = useState('')

  return (
    <div className="bg-dark-900 border border-brand-500/30 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-dark-400 text-xs mb-1">Block label <span className="text-red-400">*</span></label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} placeholder="e.g. Block 1 – Hypertrophy" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-dark-400 text-xs mb-1">Start date</label>
          <input type="date" value={startD} onChange={(e) => setStartD(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-dark-400 text-xs mb-1">End date</label>
          <input type="date" value={endD} onChange={(e) => setEndD(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-dark-400 text-xs mb-1">Lift goals ({unit})</label>
        <div className="grid grid-cols-3 gap-2">
          <input type="number" value={gSq} onChange={(e) => setGSq(e.target.value)} className={inputCls} placeholder="Squat" min="0" />
          <input type="number" value={gBn} onChange={(e) => setGBn(e.target.value)} className={inputCls} placeholder="Bench" min="0" />
          <input type="number" value={gDl} onChange={(e) => setGDl(e.target.value)} className={inputCls} placeholder="Deadlift" min="0" />
        </div>
      </div>
      <div>
        <label className="block text-dark-400 text-xs mb-1">Target body weight ({unit})</label>
        <input type="number" value={gBw} onChange={(e) => setGBw(e.target.value)} className={inputCls} placeholder="e.g. 83.5" min="0" step="0.1" />
      </div>
      <div>
        <label className="block text-dark-400 text-xs mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          className={inputCls + ' resize-none'} placeholder="Block goals, focus, notes…" />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 py-2 rounded-xl text-sm">Cancel</button>
        <button
          onClick={() => onSave({
            label: label.trim(),
            start_date:      startD || null,
            end_date:        endD   || null,
            goal_squat:      gSq   ? parseFloat(gSq)  : null,
            goal_bench:      gBn   ? parseFloat(gBn)  : null,
            goal_deadlift:   gDl   ? parseFloat(gDl)  : null,
            goal_bodyweight: gBw   ? parseFloat(gBw)  : null,
            goal_notes:      notes.trim() || null,
          })}
          disabled={!label.trim()}
          className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2 rounded-xl text-sm disabled:opacity-50">
          Create block
        </button>
      </div>
    </div>
  )
}

export default function PlanBuilder() {
  const { athleteId, planId } = useParams()
  const { currentUser } = useApp()
  const navigate = useNavigate()

  const [athlete, setAthlete] = useState(null)
  const [title,      setTitle]      = useState('Weekly Training Plan')
  const [weekStart,  setWeekStart]  = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1)
    return d.toISOString().split('T')[0]
  })
  const [isActive,   setIsActive]   = useState(true)
  const [days,       setDays]       = useState([newDay()])
  const [saving,     setSaving]     = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(!!planId)

  // Block state
  const [blocks,       setBlocks]       = useState([])
  const [selectedBlock, setSelectedBlock] = useState('none')
  const [showNewBlock,  setShowNewBlock]  = useState(false)
  const [creatingBlock, setCreatingBlock] = useState(false)

  // Save as template modal
  const [showTplModal, setShowTplModal] = useState(false)

  useEffect(() => {
    async function load() {
      const [prof, plan, blks] = await Promise.all([
        getMenteeProfile(athleteId),
        planId ? getPlan(planId) : Promise.resolve(null),
        getTrainingBlocks(currentUser.id, athleteId).catch(() => []),
      ])
      setAthlete(prof)
      setBlocks(blks)
      if (plan) {
        setTitle(plan.title)
        setWeekStart(plan.week_start)
        setIsActive(plan.is_active)
        setDays(plan.days?.length ? plan.days : [newDay()])
        if (plan.block_id) setSelectedBlock(plan.block_id)
      }
      setLoadingPlan(false)
    }
    load().catch(console.error)
  }, [athleteId, planId])

  const updateDay = (idx, updated) => setDays((ds) => ds.map((d, i) => i === idx ? updated : d))
  const removeDay = (idx) => setDays((ds) => ds.filter((_, i) => i !== idx))

  const handleCreateBlock = async (blockData) => {
    setCreatingBlock(true)
    try {
      const created = await createTrainingBlock({
        ...blockData,
        coach_id:   currentUser.id,
        athlete_id: athleteId,
      })
      setBlocks((prev) => [created, ...prev])
      setSelectedBlock(created.id)
      setShowNewBlock(false)
    } catch (err) {
      alert('Failed to create block: ' + err.message)
    } finally {
      setCreatingBlock(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim() || days.length === 0) return
    setSaving(true)
    try {
      const blockId = selectedBlock === 'none' ? null : selectedBlock
      const payload = { title, week_start: weekStart, is_active: isActive, days, block_id: blockId }
      if (planId) {
        await updateWorkoutPlan(planId, payload)
        createNotification(athleteId, 'plan_updated', `Your training plan was updated: ${title}`, null, '/workout').catch(() => {})
        sendPushNotification(athleteId, 'Plan updated', `Your training plan was updated: ${title}`, '/workout').catch(console.error)
      } else {
        await createWorkoutPlan({ ...payload, coach_id: currentUser.id, athlete_id: athleteId })
        createNotification(athleteId, 'plan_created', `New training plan assigned: ${title}`, null, '/workout').catch(() => {})
        sendPushNotification(athleteId, 'New plan assigned', `${title} is ready — tap to view`, '/workout').catch(console.error)
      }
      navigate(`/mentee/${athleteId}`)
    } catch (err) {
      alert('Failed to save plan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loadingPlan) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const unit = athlete?.weight_unit || 'kg'

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      {showTplModal && (
        <SaveTemplateModal
          days={days}
          title={title}
          coachId={currentUser.id}
          onClose={() => setShowTplModal(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/mentee/${athleteId}`)}
          className="text-dark-400 hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{planId ? 'Edit plan' : 'Create training plan'}</h1>
          {athlete && <p className="text-dark-400 text-xs mt-0.5">For {athlete.name || athlete.username}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowTplModal(true)}
            className="flex items-center gap-1.5 text-xs text-dark-300 hover:text-brand-400 border border-dark-600 hover:border-brand-500/30 px-3 py-2 rounded-xl transition-colors">
            <BookMarked className="w-3.5 h-3.5" />Save as template
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim() || days.length === 0}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 text-sm">
            <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save plan'}
          </button>
        </div>
      </div>

      {/* Plan meta */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1.5">Plan title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Week 1 – Base building" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Week starting</label>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className={inputCls} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer select-none pb-2.5">
              <div
                onClick={() => setIsActive(!isActive)}
                className={`w-10 h-6 rounded-full transition-colors relative ${isActive ? 'bg-brand-600' : 'bg-dark-600'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-dark-300 text-sm">Active plan</span>
            </label>
          </div>
        </div>

        {/* Block selector */}
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-brand-400" />Training block
          </label>
          {!showNewBlock ? (
            <div className="flex gap-2">
              <select
                value={selectedBlock}
                onChange={(e) => {
                  if (e.target.value === '__new__') { setShowNewBlock(true) }
                  else { setSelectedBlock(e.target.value) }
                }}
                className={inputCls + ' cursor-pointer'}>
                <option value="none">No block</option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
                <option value="__new__">＋ New block…</option>
              </select>
            </div>
          ) : (
            <NewBlockForm
              unit={unit}
              onSave={handleCreateBlock}
              onCancel={() => setShowNewBlock(false)}
            />
          )}
          {selectedBlock !== 'none' && !showNewBlock && (() => {
            const b = blocks.find((x) => x.id === selectedBlock)
            if (!b) return null
            return (
              <div className="mt-2 text-xs text-dark-400 flex items-center gap-2">
                <span className="text-brand-400 font-medium">{b.label}</span>
                {b.start_date && <span>· {b.start_date}{b.end_date ? ` → ${b.end_date}` : ''}</span>}
                {(b.goal_squat || b.goal_bench || b.goal_deadlift) && (
                  <span>· S{b.goal_squat || '—'} / B{b.goal_bench || '—'} / D{b.goal_deadlift || '—'} {unit}</span>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Days */}
      <div className="space-y-4">
        {days.map((day, idx) => (
          <PlanDayCard key={day.id} day={day} dayIndex={idx}
            coachId={currentUser.id}
            onChange={(updated) => updateDay(idx, updated)}
            onDelete={() => removeDay(idx)} />
        ))}
      </div>

      <button onClick={() => setDays((ds) => [...ds, newDay()])}
        className="flex items-center gap-2 w-full border-2 border-dashed border-dark-600 hover:border-brand-600 rounded-2xl py-4 text-dark-400 hover:text-brand-400 transition-all justify-center">
        <Plus className="w-5 h-5" />Add training day
      </button>
    </div>
  )
}
