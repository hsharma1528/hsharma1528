import React, { useState, useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Save, X, Edit2,
  Dumbbell, Clock, Search, ChevronRight
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getWorkouts, addWorkout, updateWorkout, deleteWorkout } from '../../lib/db'
import { calc1RM, calcRPE1RM } from '../../utils/calculations'

const PRESET_EXERCISES = [
  { name: 'Squat',               category: 'squat' },
  { name: 'Bench Press',         category: 'bench' },
  { name: 'Deadlift',            category: 'deadlift' },
  { name: 'Romanian Deadlift',   category: 'deadlift' },
  { name: 'Pause Squat',         category: 'squat' },
  { name: 'Close-Grip Bench',    category: 'bench' },
  { name: 'Sumo Deadlift',       category: 'deadlift' },
  { name: 'Front Squat',         category: 'squat' },
  { name: 'Incline Bench Press', category: 'bench' },
  { name: 'Stiff-Leg Deadlift',  category: 'deadlift' },
  { name: 'Overhead Press',      category: 'other' },
  { name: 'Barbell Row',         category: 'other' },
  { name: 'Pull-ups',            category: 'other' },
  { name: 'Dips',                category: 'other' },
  { name: 'Lat Pulldown',        category: 'other' },
  { name: 'Leg Press',           category: 'other' },
  { name: 'Hip Thrust',          category: 'other' },
  { name: 'Cable Row',           category: 'other' },
  { name: 'DB Curl',             category: 'other' },
  { name: 'Tricep Pushdown',     category: 'other' },
]

const CATEGORY_COLORS = {
  squat:    'text-blue-400 bg-blue-500/10 border-blue-500/30',
  bench:    'text-green-400 bg-green-500/10 border-green-500/30',
  deadlift: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  other:    'text-purple-400 bg-purple-500/10 border-purple-500/30',
}

function SetRow({ set, onChange, onDelete, unit }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-dark-500 text-sm w-5 text-center">{set.setNumber}</span>
      <input type="number" value={set.weight} onChange={(e) => onChange('weight', e.target.value)}
        className="w-20 bg-dark-900 border border-dark-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-brand-500"
        placeholder={unit} step="2.5" min="0" />
      <span className="text-dark-500 text-xs">{unit}</span>
      <span className="text-dark-600">×</span>
      <input type="number" value={set.reps} onChange={(e) => onChange('reps', e.target.value)}
        className="w-14 bg-dark-900 border border-dark-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-brand-500"
        placeholder="reps" min="1" />
      <select value={set.rpe || ''} onChange={(e) => onChange('rpe', e.target.value)}
        className="w-20 bg-dark-900 border border-dark-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-brand-500">
        <option value="">RPE?</option>
        {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((r) => <option key={r} value={r}>@ {r}</option>)}
      </select>
      {set.weight > 0 && set.reps > 0 && (
        <span className="text-dark-400 text-xs whitespace-nowrap">
          ~{set.rpe
            ? calcRPE1RM(parseFloat(set.weight), parseInt(set.reps), parseFloat(set.rpe))
            : calc1RM(parseFloat(set.weight), parseInt(set.reps))} {unit} e1RM
        </span>
      )}
      <button onClick={onDelete} className="ml-auto text-dark-500 hover:text-red-400 transition-colors p-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function ExerciseCard({ exercise, onChange, onDelete, unit }) {
  const [expanded, setExpanded] = useState(true)
  const cc = CATEGORY_COLORS[exercise.category] || CATEGORY_COLORS.other

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1]
    onChange({ ...exercise, sets: [...exercise.sets, { id: uuidv4(), setNumber: exercise.sets.length + 1, weight: last?.weight || '', reps: last?.reps || '', rpe: last?.rpe || '' }] })
  }
  const updateSet = (id, field, value) =>
    onChange({ ...exercise, sets: exercise.sets.map((s) => s.id === id ? { ...s, [field]: value } : s) })
  const deleteSet = (id) =>
    onChange({ ...exercise, sets: exercise.sets.filter((s) => s.id !== id).map((s, i) => ({ ...s, setNumber: i + 1 })) })

  const bestSet = exercise.sets.reduce((best, s) => {
    if (!s.weight || !s.reps) return best
    const e1rm = s.rpe
      ? calcRPE1RM(parseFloat(s.weight), parseInt(s.reps), parseFloat(s.rpe))
      : calc1RM(parseFloat(s.weight), parseInt(s.reps))
    return e1rm > best ? e1rm : best
  }, 0)

  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded-lg border text-xs font-medium ${cc}`}>{exercise.category}</span>
          <span className="text-white font-medium">{exercise.name}</span>
          {bestSet > 0 && !expanded && <span className="text-dark-400 text-xs">e1RM: {bestSet} {unit}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded(!expanded)} className="text-dark-400 hover:text-white transition-colors p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onDelete} className="text-dark-500 hover:text-red-400 transition-colors p-1">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-dark-500 mb-1 px-5">
            <span className="w-5">#</span><span className="w-20">Weight</span>
            <span className="w-8" /><span className="w-14">Reps</span>
            <span className="w-8" /><span className="w-20">RPE</span>
          </div>
          {exercise.sets.map((set) => (
            <SetRow key={set.id} set={set} unit={unit}
              onChange={(field, value) => updateSet(set.id, field, value)}
              onDelete={() => deleteSet(set.id)} />
          ))}
          <button onClick={addSet} className="flex items-center gap-2 text-dark-400 hover:text-white text-sm transition-colors mt-2 pl-2">
            <Plus className="w-4 h-4" />Add set
          </button>
          {bestSet > 0 && (
            <div className="mt-2 pt-2 border-t border-dark-700 text-xs text-dark-400">
              Best e1RM: <span className="text-white font-medium">{bestSet} {unit}</span>
            </div>
          )}
          <input value={exercise.notes || ''} onChange={(e) => onChange({ ...exercise, notes: e.target.value })}
            className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-dark-300 text-sm placeholder-dark-600 focus:outline-none focus:border-dark-500 mt-2"
            placeholder="Notes…" />
        </div>
      )}
    </div>
  )
}

function ExercisePicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [custom, setCustom] = useState('')
  const filtered = PRESET_EXERCISES.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-dark-950/80 backdrop-blur-sm px-4 pb-4">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h3 className="text-white font-semibold">Select exercise</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-3 border-b border-dark-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-900 border border-dark-600 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-brand-500"
              placeholder="Search exercises…" autoFocus />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-2 scrollbar-thin">
          {filtered.map((ex) => {
            const cc = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.other
            return (
              <button key={ex.name} onClick={() => { onSelect(ex); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-dark-700 transition-colors text-left">
                <span className={`px-2 py-0.5 rounded-lg border text-xs ${cc}`}>{ex.category}</span>
                <span className="text-white text-sm">{ex.name}</span>
                <ChevronRight className="w-4 h-4 text-dark-500 ml-auto" />
              </button>
            )
          })}
          {search && (
            <div className="p-3 border-t border-dark-700 mt-2">
              <p className="text-dark-400 text-xs mb-2">Or add custom:</p>
              <div className="flex gap-2">
                <input value={custom || search} onChange={(e) => setCustom(e.target.value)}
                  className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                  placeholder="Custom exercise name" />
                <button onClick={() => { if ((custom || search).trim()) { onSelect({ name: (custom || search).trim(), category: 'other' }); onClose() } }}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const emptyForm = () => ({ date: format(new Date(), 'yyyy-MM-dd'), exercises: [], notes: '', duration: '' })

export default function WorkoutLog() {
  const { currentUser } = useApp()
  const unit = currentUser.weight_unit || 'lbs'

  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())

  const loadWorkouts = async () => {
    setLoading(true)
    try { setWorkouts(await getWorkouts(currentUser.id)) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadWorkouts() }, [currentUser.id])

  const resetForm = () => { setForm(emptyForm()); setEditing(null) }
  const openNew   = () => { resetForm(); setShowForm(true) }
  const openEdit  = (w) => { setForm({ date: w.date, exercises: w.exercises || [], notes: w.notes || '', duration: w.duration || '' }); setEditing(w.id); setShowForm(true) }

  const addExercise = (ex) =>
    setForm((f) => ({ ...f, exercises: [...f.exercises, { id: uuidv4(), name: ex.name, category: ex.category, sets: [{ id: uuidv4(), setNumber: 1, weight: '', reps: '', rpe: '' }], notes: '' }] }))
  const updateExercise = (id, updated) =>
    setForm((f) => ({ ...f, exercises: f.exercises.map((e) => e.id === id ? updated : e) }))
  const removeExercise = (id) =>
    setForm((f) => ({ ...f, exercises: f.exercises.filter((e) => e.id !== id) }))

  const saveWorkoutData = async () => {
    if (form.exercises.length === 0) return
    setSaving(true)
    try {
      if (editing) {
        await updateWorkout(editing, { ...form, updated_at: new Date().toISOString() })
      } else {
        await addWorkout({ user_id: currentUser.id, date: form.date, exercises: form.exercises, notes: form.notes, duration: form.duration ? parseInt(form.duration) : null })
      }
      await loadWorkouts()
      setShowForm(false)
      resetForm()
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this workout?')) return
    await deleteWorkout(id)
    setWorkouts((ws) => ws.filter((w) => w.id !== id))
  }

  const grouped = useMemo(() => {
    const map = {}
    workouts.forEach((w) => {
      const month = format(parseISO(w.date), 'MMMM yyyy')
      if (!map[month]) map[month] = []
      map[month].push(w)
    })
    return Object.entries(map)
  }, [workouts])

  if (showForm) {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto">
        {showPicker && <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} />}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">{editing ? 'Edit workout' : 'Log workout'}</h1>
            <p className="text-dark-400 text-sm">Add exercises, sets, and RPE</p>
          </div>
          <button onClick={() => { setShowForm(false); resetForm() }} className="text-dark-400 hover:text-white p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500" />
          </div>
          <div className="w-36">
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              <Clock className="w-4 h-4 inline mr-1" />Duration (min)
            </label>
            <input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
              placeholder="60" min="1" />
          </div>
        </div>

        <div className="space-y-4 mb-4">
          {form.exercises.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} unit={unit}
              onChange={(updated) => updateExercise(ex.id, updated)}
              onDelete={() => removeExercise(ex.id)} />
          ))}
        </div>

        <button onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 w-full border-2 border-dashed border-dark-600 hover:border-brand-600 rounded-2xl py-4 text-dark-400 hover:text-brand-400 transition-all justify-center mb-6">
          <Plus className="w-5 h-5" />Add exercise
        </button>

        <div className="mb-6">
          <label className="block text-sm font-medium text-dark-300 mb-1.5">Session notes</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 resize-none"
            rows={3} placeholder="How did it feel? Any notes…" />
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setShowForm(false); resetForm() }}
            className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 font-semibold py-3 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={saveWorkoutData} disabled={form.exercises.length === 0 || saving}
            className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : editing ? 'Update' : 'Save workout'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Workout log</h1>
          <p className="text-dark-400 text-sm">{workouts.length} sessions logged</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="w-4 h-4" />Log workout
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grouped.length > 0 ? (
        <div className="space-y-6">
          {grouped.map(([month, ws]) => (
            <div key={month}>
              <h2 className="text-dark-400 text-xs font-semibold uppercase tracking-wider mb-3">{month}</h2>
              <div className="space-y-3">
                {ws.map((w) => {
                  const totalVolume = w.exercises?.reduce((vol, ex) =>
                    vol + ex.sets.reduce((sv, s) => sv + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0) || 0
                  return (
                    <div key={w.id} className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-white font-medium">{format(parseISO(w.date), 'EEEE, MMM d')}</div>
                          <div className="text-dark-400 text-xs mt-0.5 flex items-center gap-3">
                            {w.exercises?.length} exercises
                            {w.duration && <span>{w.duration} min</span>}
                            {totalVolume > 0 && <span>{Math.round(totalVolume).toLocaleString()} {unit} volume</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(w)} className="text-dark-400 hover:text-white p-1.5 transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(w.id)} className="text-dark-400 hover:text-red-400 p-1.5 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {w.exercises?.map((ex) => {
                          const cc = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.other
                          const topSet = ex.sets.reduce((best, s) => parseFloat(s.weight) > parseFloat(best.weight || 0) ? s : best, {})
                          return (
                            <div key={ex.id} className={`px-2.5 py-1 rounded-lg border text-xs ${cc}`}>
                              {ex.name}
                              {topSet.weight && <span className="text-dark-400 ml-1">{topSet.weight}×{topSet.reps}</span>}
                            </div>
                          )
                        })}
                      </div>
                      {w.notes && <p className="text-dark-400 text-xs mt-3 italic">"{w.notes}"</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-dark-500" />
          </div>
          <h2 className="text-white font-semibold text-lg mb-2">No workouts yet</h2>
          <p className="text-dark-400 text-sm mb-6">Start logging your training sessions</p>
          <button onClick={openNew} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />Log first workout
          </button>
        </div>
      )}
    </div>
  )
}
