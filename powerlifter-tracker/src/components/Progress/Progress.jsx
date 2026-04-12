import React, { useState, useEffect, useMemo } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { Scale, TrendingUp, Dumbbell, Plus, Flame } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getWeightLog, addWeightEntry, getWorkouts, getNutritionLogs } from '../../lib/db'
import { calc1RM, calcRPE1RM } from '../../utils/calculations'

const RANGES = [
  { label: '2W', days: 14 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-sm">
      <div className="text-dark-400 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  )
}

function ChartCard({ title, icon: Icon, accentClass, children }) {
  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5">
      <h2 className="font-semibold text-white flex items-center gap-2 mb-5">
        <Icon className={`w-5 h-5 ${accentClass}`} />{title}
      </h2>
      {children}
    </div>
  )
}

function Spinner() {
  return <div className="flex items-center justify-center h-36"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
}

export default function Progress() {
  const { currentUser } = useApp()
  const unit = currentUser.weight_unit || 'lbs'
  const [range, setRange] = useState(30)
  const [newWeight, setNewWeight] = useState('')
  const [weightDate, setWeightDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [weightLog, setWeightLog] = useState([])
  const [workouts,  setWorkouts]  = useState([])
  const [nutritionLogs, setNutritionLogs] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [wl, ws, nl] = await Promise.all([
          getWeightLog(currentUser.id),
          getWorkouts(currentUser.id),
          getNutritionLogs(currentUser.id),
        ])
        if (!active) return
        setWeightLog(wl)
        setWorkouts(ws)
        setNutritionLogs(nl)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [currentUser.id])

  // Build date array for the selected range
  const dates = useMemo(() =>
    Array.from({ length: range }, (_, i) => format(subDays(new Date(), range - 1 - i), 'yyyy-MM-dd'))
  , [range])

  const fmt = (d) => format(parseISO(d), range <= 30 ? 'MMM d' : 'MMM d')

  // Weight chart
  const weightData = useMemo(() =>
    dates.map((d) => ({ date: fmt(d), weight: weightLog.find((e) => e.date === d)?.weight ?? null }))
  , [dates, weightLog])

  // Calorie chart
  const calorieData = useMemo(() =>
    dates.map((d) => {
      const log = nutritionLogs.find((n) => n.date === d)
      const cals = log ? (log.meals || []).reduce((s, m) => s + m.foods.reduce((fs, f) => fs + (f.calories || 0), 0), 0) : null
      return { date: fmt(d), calories: cals !== null ? Math.round(cals) : null }
    })
  , [dates, nutritionLogs])

  // Lift e1RM trend
  const liftData = useMemo(() => {
    const cutoff = subDays(new Date(), range)
    const map = {}
    workouts
      .filter((w) => parseISO(w.date) >= cutoff)
      .forEach((w) => {
        const key = fmt(w.date)
        if (!map[key]) map[key] = { date: key, squat: null, bench: null, deadlift: null }
        w.exercises?.forEach((ex) => {
          const cat = ex.category
          if (!['squat', 'bench', 'deadlift'].includes(cat)) return
          const best = ex.sets.reduce((b, s) => {
            if (!s.weight || !s.reps) return b
            const e1rm = s.rpe
              ? calcRPE1RM(parseFloat(s.weight), parseInt(s.reps), parseFloat(s.rpe))
              : calc1RM(parseFloat(s.weight), parseInt(s.reps))
            return e1rm > b ? e1rm : b
          }, 0)
          if (best > 0) map[key][cat] = Math.max(map[key][cat] || 0, best)
        })
      })
    return Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [workouts, range])

  // Weekly volume
  const volumeData = useMemo(() => {
    const weeks = Math.ceil(range / 7)
    return Array.from({ length: weeks }, (_, i) => {
      const end   = subDays(new Date(), (weeks - 1 - i) * 7)
      const start = subDays(new Date(), (weeks - 1 - i) * 7 + 6)
      const vol = workouts
        .filter((w) => { const d = parseISO(w.date); return d >= start && d <= end })
        .reduce((s, w) => s + (w.exercises || []).reduce((ev, ex) =>
          ev + ex.sets.reduce((sv, s2) => sv + (parseFloat(s2.weight) || 0) * (parseInt(s2.reps) || 0), 0), 0), 0)
      return { week: format(end, 'MMM d'), volume: Math.round(vol), sessions: workouts.filter((w) => { const d = parseISO(w.date); return d >= start && d <= end }).length }
    })
  }, [workouts, range])

  // Weight stats
  const weightStats = useMemo(() => {
    const inRange = weightLog.filter((e) => parseISO(e.date) >= subDays(new Date(), range))
    if (inRange.length < 2) return null
    const sorted = [...inRange].sort((a, b) => a.date.localeCompare(b.date))
    return {
      first: sorted[0].weight, last: sorted[sorted.length - 1].weight,
      change: sorted[sorted.length - 1].weight - sorted[0].weight,
      avg: Math.round(sorted.reduce((s, e) => s + e.weight, 0) / sorted.length * 10) / 10,
    }
  }, [weightLog, range])

  const logWeight = async () => {
    if (!newWeight) return
    try {
      const entry = { user_id: currentUser.id, date: weightDate, weight: parseFloat(newWeight) }
      await addWeightEntry(entry)
      const updated = await getWeightLog(currentUser.id)
      setWeightLog(updated)
      setNewWeight('')
    } catch (err) {
      alert('Failed to save: ' + err.message)
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Progress</h1>
        <div className="flex items-center gap-1 bg-dark-800 border border-dark-700 rounded-xl p-1">
          {RANGES.map((r) => (
            <button key={r.days} onClick={() => setRange(r.days)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${range === r.days ? 'bg-brand-600 text-white' : 'text-dark-400 hover:text-white'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log weight */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-blue-400" />Log body weight
        </h2>
        <div className="flex gap-3">
          <input type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)}
            className="bg-dark-900 border border-dark-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 text-sm" />
          <input type="number" value={newWeight} onChange={(e) => setNewWeight(e.target.value)}
            className="flex-1 bg-dark-900 border border-dark-600 rounded-xl px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 text-sm"
            placeholder={`Weight (${unit})`} step="0.1" />
          <button onClick={logWeight} disabled={!newWeight}
            className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />Log
          </button>
        </div>
        {weightStats && (
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[['Start', `${weightStats.first} ${unit}`], ['Current', `${weightStats.last} ${unit}`], ['Change', `${weightStats.change > 0 ? '+' : ''}${weightStats.change.toFixed(1)} ${unit}`], ['Avg', `${weightStats.avg} ${unit}`]].map(([label, val]) => (
              <div key={label} className="bg-dark-900 rounded-xl p-3 text-center border border-dark-700">
                <div className="text-dark-400 text-xs">{label}</div>
                <div className="text-white font-semibold text-sm mt-0.5">{val}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Body weight chart */}
          <ChartCard title="Body weight trend" icon={TrendingUp} accentClass="text-blue-400">
            {weightLog.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weightData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="wtGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2028" />
                  <XAxis dataKey="date" tick={{ fill: '#5d606e', fontSize: 11 }} tickLine={false} axisLine={false} interval={Math.floor(range / 7)} />
                  <YAxis tick={{ fill: '#5d606e', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  {currentUser.goal_weight && (
                    <ReferenceLine y={currentUser.goal_weight} stroke="#f97316" strokeDasharray="4 4"
                      label={{ value: `Goal: ${currentUser.goal_weight}`, fill: '#f97316', fontSize: 11 }} />
                  )}
                  <Area type="monotone" dataKey="weight" name={`Weight (${unit})`} stroke="#3b82f6" strokeWidth={2} fill="url(#wtGrad)" connectNulls dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-dark-400 text-sm">No weight entries yet — use the form above</div>
            )}
          </ChartCard>

          {/* Lift e1RM */}
          <ChartCard title="Estimated 1RM progress" icon={Dumbbell} accentClass="text-brand-400">
            {liftData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={liftData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2028" />
                    <XAxis dataKey="date" tick={{ fill: '#5d606e', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#5d606e', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="squat"    name={`Squat (${unit})`}    stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="bench"    name={`Bench (${unit})`}    stroke="#22c55e" strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="deadlift" name={`Deadlift (${unit})`} stroke="#f97316" strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-3">
                  {[['Squat', '#3b82f6'], ['Bench', '#22c55e'], ['Deadlift', '#f97316']].map(([name, color]) => (
                    <div key={name} className="flex items-center gap-1.5 text-sm">
                      <div className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
                      <span className="text-dark-400">{name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-52 flex items-center justify-center text-dark-400 text-sm">Log squat / bench / deadlift workouts to see lift progress</div>
            )}
          </ChartCard>

          {/* Calorie trend */}
          <ChartCard title="Calorie intake" icon={Flame} accentClass="text-orange-400">
            {nutritionLogs.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={calorieData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2028" />
                  <XAxis dataKey="date" tick={{ fill: '#5d606e', fontSize: 11 }} tickLine={false} axisLine={false} interval={Math.floor(range / 7)} />
                  <YAxis tick={{ fill: '#5d606e', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  {currentUser.target_calories && <ReferenceLine y={currentUser.target_calories} stroke="#e60000" strokeDasharray="4 4" />}
                  <Bar dataKey="calories" name="Calories" fill="#e60000" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-dark-400 text-sm">Log nutrition to see calorie trends</div>
            )}
          </ChartCard>

          {/* Weekly volume */}
          <ChartCard title="Weekly training volume" icon={Dumbbell} accentClass="text-green-400">
            {volumeData.some((d) => d.volume > 0) ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={volumeData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2028" />
                  <XAxis dataKey="week" tick={{ fill: '#5d606e', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#5d606e', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="volume" name={`Volume (${unit})`} fill="#22c55e" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-dark-400 text-sm">Log workouts to see weekly volume</div>
            )}
          </ChartCard>
        </>
      )}
    </div>
  )
}
