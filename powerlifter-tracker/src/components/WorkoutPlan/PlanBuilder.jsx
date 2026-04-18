import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import {
  Plus, Trash2, Save, X, ChevronDown, ChevronUp, ArrowLeft, GripVertical
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { createWorkoutPlan, updateWorkoutPlan, getPlan, getMenteeProfile, createNotification } from '../../lib/db'
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

function PlanDayCard({ day, dayIndex, onChange, onDelete }) {
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
      {showPicker && <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} />}
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

export default function PlanBuilder() {
  const { athleteId, planId } = useParams()
  const { currentUser } = useApp()
  const navigate = useNavigate()

  const [athlete, setAthlete] = useState(null)
  const [title,      setTitle]      = useState('Weekly Training Plan')
  const [weekStart,  setWeekStart]  = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1) // Monday
    return d.toISOString().split('T')[0]
  })
  const [isActive,   setIsActive]   = useState(true)
  const [days,       setDays]       = useState([newDay()])
  const [saving,     setSaving]     = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(!!planId)

  useEffect(() => {
    async function load() {
      const [prof, plan] = await Promise.all([
        getMenteeProfile(athleteId),
        planId ? getPlan(planId) : Promise.resolve(null),
      ])
      setAthlete(prof)
      if (plan) {
        setTitle(plan.title)
        setWeekStart(plan.week_start)
        setIsActive(plan.is_active)
        setDays(plan.days?.length ? plan.days : [newDay()])
      }
      setLoadingPlan(false)
    }
    load().catch(console.error)
  }, [athleteId, planId])

  const updateDay = (idx, updated) => setDays((ds) => ds.map((d, i) => i === idx ? updated : d))
  const removeDay = (idx) => setDays((ds) => ds.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (!title.trim() || days.length === 0) return
    setSaving(true)
    try {
      const payload = { title, week_start: weekStart, is_active: isActive, days }
      if (planId) {
        await updateWorkoutPlan(planId, payload)
        createNotification(athleteId, 'plan_updated', `Your training plan was updated: ${title}`, null, '/workout').catch(() => {})
      } else {
        await createWorkoutPlan({ ...payload, coach_id: currentUser.id, athlete_id: athleteId })
        createNotification(athleteId, 'plan_created', `New training plan assigned: ${title}`, null, '/workout').catch(() => {})
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

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
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
        <button onClick={handleSave} disabled={saving || !title.trim() || days.length === 0}
          className="ml-auto flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 text-sm">
          <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save plan'}
        </button>
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
      </div>

      {/* Days */}
      <div className="space-y-4">
        {days.map((day, idx) => (
          <PlanDayCard key={day.id} day={day} dayIndex={idx}
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
