import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Dumbbell, Search } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getCoachExercises, createCoachExercise, deleteCoachExercise } from '../../lib/db'
import { CATEGORY_COLORS } from '../Workout/ExercisePicker'

const inputCls = "w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors text-sm"

const CATEGORIES = ['squat', 'bench', 'deadlift', 'other']

export default function ExerciseLibrary() {
  const { currentUser } = useApp()
  const [exercises, setExercises] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [form,      setForm]      = useState({ name: '', category: 'other', notes: '' })
  const [adding,    setAdding]    = useState(false)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    getCoachExercises(currentUser.id)
      .then(setExercises)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [currentUser.id])

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const created = await createCoachExercise({
        coach_id: currentUser.id,
        name:     form.name.trim(),
        category: form.category,
        notes:    form.notes.trim() || null,
      })
      setExercises((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setForm({ name: '', category: 'other', notes: '' })
      setAdding(false)
    } catch (err) {
      alert('Failed to add exercise: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this exercise?')) return
    await deleteCoachExercise(id).catch(console.error)
    setExercises((prev) => prev.filter((e) => e.id !== id))
  }

  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-brand-400" />Exercise Library
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">Custom exercises appear in your plan builder alongside the preset list.</p>
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
          <Plus className="w-4 h-4" />Add exercise
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-dark-800 border border-brand-500/30 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-semibold text-sm">New exercise</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-dark-400 text-xs mb-1">Name <span className="text-red-400">*</span></label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls} placeholder="e.g. Belt Squat" autoFocus />
            </div>
            <div>
              <label className="block text-dark-400 text-xs mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-dark-400 text-xs mb-1">Notes (optional)</label>
              <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className={inputCls} placeholder="Coaching cue, tips…" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setAdding(false)} className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 py-2.5 rounded-xl text-sm">Cancel</button>
            <button onClick={handleAdd} disabled={saving || !form.name.trim()}
              className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Add exercise'}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          className={inputCls + ' pl-9'} placeholder="Search your exercises…" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-dark-800 rounded-2xl border border-dark-700">
          <Dumbbell className="w-10 h-10 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">
            {exercises.length === 0 ? 'No custom exercises yet. Add your first one above.' : 'No exercises match your search.'}
          </p>
        </div>
      ) : (
        <div className="bg-dark-800 rounded-2xl border border-dark-700 divide-y divide-dark-700">
          {filtered.map((ex) => {
            const cc = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.other
            return (
              <div key={ex.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`px-2 py-0.5 rounded-lg border text-xs shrink-0 ${cc}`}>{ex.category}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{ex.name}</div>
                  {ex.notes && <div className="text-dark-400 text-xs mt-0.5">{ex.notes}</div>}
                </div>
                <button onClick={() => handleDelete(ex.id)}
                  className="text-dark-500 hover:text-red-400 p-1 transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
      {filtered.length > 0 && (
        <p className="text-dark-500 text-xs text-center">{filtered.length} custom exercise{filtered.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
