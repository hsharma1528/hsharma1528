import React, { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Trophy, TrendingUp, Dumbbell } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getPersonalRecords } from '../../lib/db'
import { CATEGORY_COLORS } from '../Workout/ExercisePicker'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

const REP_ORDER = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]

function RepBadge({ reps, weight, unit }) {
  return (
    <div className="flex flex-col items-center bg-dark-700 rounded-xl px-3 py-2 min-w-[60px]">
      <span className="text-dark-400 text-xs font-medium">{reps}RM</span>
      <span className="text-white font-bold text-sm">{weight}</span>
      <span className="text-dark-500 text-xs">{unit}</span>
    </div>
  )
}

export default function PRBoard() {
  const { currentUser } = useApp()
  const unit = currentUser.weight_unit || 'lbs'
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getPersonalRecords(currentUser.id)
      .then((data) => { setRecords(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [currentUser.id])

  // Group by exercise name
  const byExercise = records.reduce((acc, r) => {
    if (!acc[r.exercise_name]) acc[r.exercise_name] = []
    acc[r.exercise_name].push(r)
    return acc
  }, {})

  const exerciseNames = Object.keys(byExercise).sort()

  const topLifts = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press']
    .map((name) => {
      const match = exerciseNames.find((n) => n.toLowerCase().includes(name.toLowerCase()))
      if (!match) return null
      const best1rm = byExercise[match].find((r) => r.rep_count === 1)
      return best1rm ? { name: match, weight: best1rm.weight, date: best1rm.achieved_date } : null
    })
    .filter(Boolean)

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" /> Personal Records
        </h1>
        <p className="text-dark-400 text-sm mt-1">{records.length} records across {exerciseNames.length} exercises</p>
      </div>

      {/* Big 3 + OHP highlight */}
      {topLifts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {topLifts.map((lift) => (
            <div key={lift.name} className="bg-dark-800 border border-yellow-500/20 rounded-2xl p-4 text-center">
              <div className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-1 truncate">{lift.name}</div>
              <div className="text-white text-2xl font-bold">{lift.weight}</div>
              <div className="text-dark-400 text-xs mt-0.5">{unit} · 1RM</div>
              <div className="text-dark-500 text-xs mt-1">{format(parseISO(lift.date), 'MMM d, yyyy')}</div>
            </div>
          ))}
        </div>
      )}

      {exerciseNames.length === 0 ? (
        <div className="text-center py-16 bg-dark-800 rounded-2xl border border-dark-700">
          <Dumbbell className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No PRs yet. Log workouts to start tracking records.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exerciseNames.map((name) => {
            const recs = byExercise[name]
            const sorted = [...recs].sort((a, b) => a.rep_count - b.rep_count)
            const isSelected = selected === name
            return (
              <div key={name} className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-dark-700/50 transition-colors"
                  onClick={() => setSelected(isSelected ? null : name)}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    </div>
                    <span className="text-white font-medium">{name}</span>
                    <span className="text-dark-500 text-xs">{recs.length} record{recs.length !== 1 ? 's' : ''}</span>
                  </div>
                  <TrendingUp className={`w-4 h-4 transition-colors ${isSelected ? 'text-brand-400' : 'text-dark-600'}`} />
                </button>

                {isSelected && (
                  <div className="px-4 pb-4 border-t border-dark-700">
                    <div className="flex flex-wrap gap-2 mt-3">
                      {sorted.map((r) => (
                        <RepBadge key={r.id} reps={r.rep_count} weight={r.weight} unit={unit} />
                      ))}
                    </div>
                    <div className="mt-3 text-dark-400 text-xs">
                      Latest: {format(parseISO(sorted[sorted.length - 1]?.achieved_date || new Date().toISOString().slice(0, 10)), 'MMM d, yyyy')}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
