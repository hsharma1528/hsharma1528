import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Edit2, CheckCircle, Circle, TrendingUp } from 'lucide-react'
import { getPlan, getPlanWorkouts, getMenteeProfile } from '../../lib/db'
import { CATEGORY_COLORS } from '../Workout/ExercisePicker'

function ViewExerciseRow({ ex }) {
  const cc = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.other
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-dark-700 last:border-0">
      <span className={`px-2 py-0.5 rounded-lg border text-xs shrink-0 mt-0.5 ${cc}`}>
        {ex.category}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium">{ex.name}</div>
        <div className="text-dark-400 text-xs mt-0.5">
          {ex.sets} {parseInt(ex.sets) === 1 ? 'set' : 'sets'} × {ex.target_reps} reps
          {ex.target_weight ? <span className="text-dark-500"> @ {ex.target_weight}</span> : ''}
        </div>
        {ex.notes && (
          <div className="text-dark-500 text-xs mt-0.5 italic">{ex.notes}</div>
        )}
      </div>
    </div>
  )
}

function ViewDayCard({ day, dayIndex, isLogged }) {
  return (
    <div className={`bg-dark-800 rounded-2xl border overflow-hidden ${
      isLogged ? 'border-green-500/30' : 'border-dark-700'
    }`}>
      <div className={`flex items-center justify-between p-4 ${isLogged ? 'bg-green-500/5' : 'bg-dark-900'}`}>
        <div className="flex items-center gap-2">
          {isLogged
            ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            : <Circle      className="w-4 h-4 text-dark-600 shrink-0" />
          }
          <span className="text-white font-medium text-sm">
            {day.day_label || `Day ${dayIndex + 1}`}
          </span>
          <span className="text-dark-500 text-xs">
            · {(day.exercises || []).length} exercise{(day.exercises || []).length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${
          isLogged
            ? 'border-green-500/30 text-green-400'
            : 'border-dark-700 text-dark-500'
        }`}>
          {isLogged ? 'Logged' : 'Pending'}
        </span>
      </div>

      {(day.exercises || []).length > 0 && (
        <div className="px-4 pb-2">
          {day.exercises.map((ex, i) => (
            <ViewExerciseRow key={ex.id || i} ex={ex} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PlanView() {
  const { athleteId, planId } = useParams()
  const navigate = useNavigate()

  const [plan,     setPlan]     = useState(null)
  const [athlete,  setAthlete]  = useState(null)
  const [loggedDays, setLoggedDays] = useState(new Set())
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const [p, planWs, prof] = await Promise.all([
        getPlan(planId),
        getPlanWorkouts(planId),
        getMenteeProfile(athleteId),
      ])
      setPlan(p)
      setAthlete(prof)
      setLoggedDays(new Set(planWs.map((w) => w.plan_day_index).filter((i) => i != null)))
      setLoading(false)
    }
    load().catch(console.error)
  }, [planId, athleteId])

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!plan) return (
    <div className="p-8 text-center text-dark-400">Plan not found.</div>
  )

  const days        = plan.days || []
  const totalDays   = days.length
  const completePct = totalDays > 0 ? Math.round((loggedDays.size / totalDays) * 100) : 0

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/mentee/${athleteId}`)}
          className="text-dark-400 hover:text-white transition-colors p-1 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{plan.title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {athlete && <span className="text-dark-400 text-xs">For {athlete.name || athlete.username}</span>}
            {plan.week_start && (
              <span className="text-dark-500 text-xs">· Week of {format(parseISO(plan.week_start), 'MMM d, yyyy')}</span>
            )}
            {plan.is_active && (
              <span className="text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded px-1.5 py-0.5">Active</span>
            )}
          </div>
        </div>
        <Link to={`/mentee/${athleteId}/plan/${planId}`}
          className="flex items-center gap-1.5 text-xs bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white border border-dark-600 px-3 py-2 rounded-xl transition-colors shrink-0">
          <Edit2 className="w-3.5 h-3.5" />Edit
        </Link>
      </div>

      {/* Compliance summary */}
      {totalDays > 0 && (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-brand-400" />
          </div>
          <div className="flex-1">
            <div className="text-white text-sm font-medium">
              {loggedDays.size} / {totalDays} days logged
            </div>
            <div className="h-1.5 bg-dark-700 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${completePct}%` }}
              />
            </div>
          </div>
          <div className="text-white font-bold text-lg shrink-0">{completePct}%</div>
        </div>
      )}

      {/* Days */}
      {days.length === 0 ? (
        <div className="text-center py-12 bg-dark-800 rounded-2xl border border-dark-700">
          <p className="text-dark-400 text-sm">No days in this plan yet.</p>
          <Link to={`/mentee/${athleteId}/plan/${planId}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300">
            <Edit2 className="w-4 h-4" />Add days
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((day, idx) => (
            <ViewDayCard
              key={day.id || idx}
              day={day}
              dayIndex={idx}
              isLogged={loggedDays.has(idx)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
