import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format, differenceInDays, parseISO, subDays, startOfWeek } from 'date-fns'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Dumbbell, Apple, TrendingUp, Target, Flame, Droplets, Calendar, ChevronRight, Scale, ClipboardCheck } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getWorkouts, getNutritionByDate, getWeightLog, getLatestCheckIn } from '../../lib/db'
import { phaseColors, phaseLabels, calcDOTS } from '../../utils/calculations'
import CoachDashboard from './CoachDashboard'

function Spinner() {
  return (
    <div className="flex items-center justify-center h-36">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, accent = 'brand' }) {
  const colors = {
    brand:  'text-brand-400 bg-brand-500/10',
    green:  'text-green-400 bg-green-500/10',
    blue:   'text-blue-400 bg-blue-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  }
  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-dark-400 text-sm">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-dark-400 text-xs mt-1">{sub}</div>}
    </div>
  )
}

function MacroBar({ label, current, target, color }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-dark-400">{label}</span>
        <span className="text-dark-300">{current}g / {target}g</span>
      </div>
      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-sm">
      <div className="text-dark-400 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="text-white font-medium">{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { currentUser } = useApp()

  if (currentUser.role === 'coach') return <CoachDashboard />

  const today = format(new Date(), 'yyyy-MM-dd')

  const [workouts,       setWorkouts]       = useState([])
  const [todayNutrition, setTodayNutrition] = useState(null)
  const [weightLog,      setWeightLog]      = useState([])
  const [loading,        setLoading]        = useState(true)
  const [checkInMissing, setCheckInMissing] = useState(false)

  const thisWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [w, n, wl, lastCI] = await Promise.all([
          getWorkouts(currentUser.id),
          getNutritionByDate(currentUser.id, today),
          getWeightLog(currentUser.id),
          getLatestCheckIn(currentUser.id),
        ])
        if (!active) return
        setWorkouts(w)
        setTodayNutrition(n)
        setWeightLog(wl)
        setCheckInMissing(!lastCI || lastCI.week_start < thisWeekStart)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [currentUser.id, today])

  const phase = currentUser?.phase || 'offseason'
  const pc = phaseColors[phase]

  // Today's nutrition totals
  const todayMacros = useMemo(() => {
    if (!todayNutrition) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    return (todayNutrition.meals || []).reduce(
      (acc, meal) => {
        ;(meal.foods || []).forEach((f) => {
          acc.calories += f.calories || 0
          acc.protein  += f.protein  || 0
          acc.carbs    += f.carbs    || 0
          acc.fat      += f.fat      || 0
        })
        return acc
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }, [todayNutrition])

  const todayWorkout = workouts.find((w) => w.date === today)

  // Weight chart – last 14 days
  const weightChartData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
      const entry = weightLog.find((e) => e.date === d)
      return { date: format(parseISO(d), 'MMM d'), weight: entry?.weight ?? null }
    })
  }, [weightLog])

  // Meet countdown
  const meetDays = useMemo(() => {
    if (phase !== 'meet_prep' || !currentUser.meet_date) return null
    return differenceInDays(parseISO(currentUser.meet_date), new Date())
  }, [phase, currentUser.meet_date])

  // SBD total + DOTS
  const sbd = { squat: currentUser.squat_max || 0, bench: currentUser.bench_max || 0, dead: currentUser.deadlift_max || 0 }
  const total = sbd.squat + sbd.bench + sbd.dead
  const weightKg = currentUser.weight_unit === 'lbs' ? currentUser.weight * 0.453592 : currentUser.weight
  const totalKg  = currentUser.weight_unit === 'lbs' ? total * 0.453592 : total
  const dotsScore = calcDOTS(totalKg, weightKg, currentUser.gender === 'male')

  // Goal progress
  const goalPct = useMemo(() => {
    const { weight, goal_weight: goalWeight, weight_unit: weightUnit } = currentUser
    if (!weight || !goalWeight) return null
    const latest = weightLog[0]?.weight || weight
    if (phase === 'cut') {
      const diff = weight - goalWeight
      if (diff <= 0) return 100
      return Math.max(0, Math.min(100, Math.round(((weight - latest) / diff) * 100)))
    }
    if (phase === 'bulk') {
      const diff = goalWeight - weight
      if (diff <= 0) return 100
      return Math.max(0, Math.min(100, Math.round(((latest - weight) / diff) * 100)))
    }
    return null
  }, [currentUser, weightLog, phase])

  const targets = {
    calories: currentUser.target_calories || 2500,
    protein:  currentUser.target_protein  || 180,
    carbs:    currentUser.target_carbs    || 300,
    fat:      currentUser.target_fat      || 80,
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Hey, {(currentUser.name || currentUser.username || 'Athlete').split(' ')[0]} 👋
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${pc.bg} ${pc.border}`}>
          <div className={`w-2 h-2 rounded-full ${pc.text.replace('text-', 'bg-')}`} />
          <span className={`text-sm font-semibold ${pc.text}`}>{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Check-in reminder */}
      {!loading && checkInMissing && (
        <Link to="/checkin"
          className="flex items-center gap-4 bg-purple-600/10 border border-purple-500/30 rounded-2xl p-4 hover:border-purple-500/50 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold text-sm">Weekly check-in due</div>
            <div className="text-purple-400/70 text-xs">Let your coach know how you're feeling this week</div>
          </div>
          <ChevronRight className="w-5 h-5 text-purple-400 shrink-0" />
        </Link>
      )}

      {/* Meet countdown */}
      {meetDays !== null && (
        <div className="bg-gradient-to-r from-brand-600/20 to-brand-800/10 border border-brand-600/30 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <div className="text-white font-semibold">
              {meetDays > 0 ? `${meetDays} days until your meet` : meetDays === 0 ? 'Meet day – good luck!' : 'Meet has passed'}
            </div>
            <div className="text-brand-400/70 text-sm">
              {currentUser.meet_date && format(parseISO(currentUser.meet_date), 'MMMM d, yyyy')}
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Flame} label="Calories today" accent="orange"
          value={loading ? '…' : todayMacros.calories > 0 ? Math.round(todayMacros.calories) : '—'}
          sub={`Target: ${targets.calories} kcal`} />
        <StatCard icon={Dumbbell} label="Today's workout" accent="brand"
          value={loading ? '…' : todayWorkout ? `${todayWorkout.exercises?.length || 0} exercises` : '—'}
          sub={loading ? '' : todayWorkout ? 'Logged' : 'Not logged yet'} />
        <StatCard icon={Scale} label="Current weight" accent="blue"
          value={loading ? '…' : weightLog[0] ? `${weightLog[0].weight} ${currentUser.weight_unit}` : `${currentUser.weight || '—'} ${currentUser.weight_unit}`}
          sub={currentUser.goal_weight ? `Goal: ${currentUser.goal_weight} ${currentUser.weight_unit}` : ''} />
        <StatCard icon={TrendingUp} label="DOTS score" accent="purple"
          value={dotsScore > 0 ? dotsScore : '—'}
          sub={total > 0 ? `Total: ${total} ${currentUser.weight_unit}` : 'Add 1RMs in profile'} />
      </div>

      {/* Two column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's nutrition */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Apple className="w-5 h-5 text-green-400" />Today's nutrition
            </h2>
            <Link to="/nutrition" className="text-dark-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
              Log <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? <Spinner /> : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#1e2028" strokeWidth="8" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#e60000" strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - Math.min(todayMacros.calories / targets.calories, 1))}`}
                      strokeLinecap="round" className="transition-all duration-500" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-white text-sm font-bold leading-none">{Math.round(todayMacros.calories)}</span>
                    <span className="text-dark-400 text-xs">kcal</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <MacroBar label="Protein" current={Math.round(todayMacros.protein)} target={targets.protein} color="bg-brand-500" />
                  <MacroBar label="Carbs"   current={Math.round(todayMacros.carbs)}   target={targets.carbs}   color="bg-yellow-500" />
                  <MacroBar label="Fat"     current={Math.round(todayMacros.fat)}      target={targets.fat}     color="bg-blue-500" />
                </div>
              </div>
              {todayNutrition?.water > 0 && (
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <Droplets className="w-4 h-4" />{todayNutrition.water} oz water today
                </div>
              )}
            </>
          )}
        </div>

        {/* Body weight chart */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />Body weight (14 days)
            </h2>
            <Link to="/progress" className="text-dark-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
              Details <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? <Spinner /> : weightLog.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={weightChartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#5d606e', fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fill: '#5d606e', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="weight" name={`Weight (${currentUser.weight_unit})`}
                  stroke="#3b82f6" strokeWidth={2} fill="url(#weightGrad)" connectNulls dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-36 flex items-center justify-center text-dark-400 text-sm">
              No weight entries yet — log your weight in Progress
            </div>
          )}
        </div>
      </div>

      {/* Goal progress */}
      {!loading && goalPct !== null && (
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-400" />
              {phase === 'cut' ? 'Cut progress' : 'Bulk progress'}
            </h2>
            <span className="text-dark-400 text-sm">
              {weightLog[0]?.weight || currentUser.weight} → {currentUser.goal_weight} {currentUser.weight_unit}
            </span>
          </div>
          <div className="h-3 bg-dark-700 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ${phase === 'cut' ? 'bg-orange-500' : 'bg-green-500'}`}
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-dark-400">
            <span>Start: {currentUser.weight} {currentUser.weight_unit}</span>
            <span className={`font-medium ${phase === 'cut' ? 'text-orange-400' : 'text-green-400'}`}>{goalPct}% complete</span>
            <span>Goal: {currentUser.goal_weight} {currentUser.weight_unit}</span>
          </div>
        </div>
      )}

      {/* Recent workouts */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-brand-400" />Recent workouts
          </h2>
          <Link to="/workout" className="text-dark-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
            Log workout <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? <Spinner /> : workouts.length > 0 ? (
          <div className="space-y-3">
            {workouts.slice(0, 3).map((w) => (
              <div key={w.id} className="flex items-center justify-between bg-dark-900 rounded-xl p-3 border border-dark-700">
                <div>
                  <div className="text-white text-sm font-medium">
                    {w.exercises?.map((e) => e.name).join(', ') || 'Workout'}
                  </div>
                  <div className="text-dark-400 text-xs mt-0.5">
                    {format(parseISO(w.date), 'EEE, MMM d')} · {w.exercises?.length || 0} exercises
                  </div>
                </div>
                {w.duration && <span className="text-dark-400 text-xs">{w.duration} min</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-dark-400 text-sm">
            No workouts logged yet.{' '}
            <Link to="/workout" className="text-brand-400 hover:text-brand-300">Log your first session</Link>
          </div>
        )}
      </div>
    </div>
  )
}
