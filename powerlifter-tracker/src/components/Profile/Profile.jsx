import React, { useState } from 'react'
import { Save, User, Dumbbell, Target, Calendar, ChevronDown } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { updateUser } from '../../utils/storage'
import { calcCalorieTargets, phaseColors, phaseLabels, calcDOTS, calcWilks, lbsToKg } from '../../utils/calculations'

const PHASES = [
  { value: 'offseason', label: 'Off-Season', desc: 'Base building, higher volume' },
  { value: 'bulk', label: 'Bulk', desc: 'Calorie surplus, mass gain' },
  { value: 'cut', label: 'Cut', desc: 'Calorie deficit, fat loss' },
  { value: 'meet_prep', label: 'Meet Prep', desc: 'Peaking for competition' },
]

const inputCls = "w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors"
const labelCls = "block text-sm font-medium text-dark-300 mb-1.5"

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
      <h2 className="text-white font-semibold flex items-center gap-2 mb-5">
        <Icon className="w-5 h-5 text-brand-400" />
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function Profile() {
  const { currentUser, dispatch } = useApp()
  const [form, setForm] = useState({
    name: currentUser.name || '',
    age: currentUser.age || '',
    gender: currentUser.gender || 'male',
    weight: currentUser.weight || '',
    height: currentUser.height || '',
    weightUnit: currentUser.weightUnit || 'lbs',
    phase: currentUser.phase || 'offseason',
    goalWeight: currentUser.goalWeight || '',
    meetDate: currentUser.meetDate || '',
    squatMax: currentUser.squatMax || '',
    benchMax: currentUser.benchMax || '',
    deadliftMax: currentUser.deadliftMax || '',
    targetCalories: currentUser.targetCalories || '',
    targetProtein: currentUser.targetProtein || '',
    targetCarbs: currentUser.targetCarbs || '',
    targetFat: currentUser.targetFat || '',
  })
  const [saved, setSaved] = useState(false)

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const recalcTargets = () => {
    const targets = calcCalorieTargets({ ...currentUser, ...form })
    setForm((f) => ({
      ...f,
      targetCalories: targets.calories,
      targetProtein: targets.protein,
      targetCarbs: targets.carbs,
      targetFat: targets.fat,
    }))
  }

  const handleSave = () => {
    const updates = {
      name: form.name,
      age: parseInt(form.age) || currentUser.age,
      gender: form.gender,
      weight: parseFloat(form.weight) || currentUser.weight,
      height: parseFloat(form.height) || currentUser.height,
      weightUnit: form.weightUnit,
      phase: form.phase,
      goalWeight: parseFloat(form.goalWeight) || 0,
      meetDate: form.meetDate || null,
      squatMax: parseFloat(form.squatMax) || 0,
      benchMax: parseFloat(form.benchMax) || 0,
      deadliftMax: parseFloat(form.deadliftMax) || 0,
      targetCalories: parseInt(form.targetCalories) || currentUser.targetCalories,
      targetProtein: parseInt(form.targetProtein) || currentUser.targetProtein,
      targetCarbs: parseInt(form.targetCarbs) || currentUser.targetCarbs,
      targetFat: parseInt(form.targetFat) || currentUser.targetFat,
    }
    updateUser(currentUser.id, updates)
    dispatch({ type: 'UPDATE_USER', payload: updates })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Computed stats
  const total = (parseFloat(form.squatMax) || 0) + (parseFloat(form.benchMax) || 0) + (parseFloat(form.deadliftMax) || 0)
  const weightKg = form.weightUnit === 'lbs' ? (parseFloat(form.weight) || 0) * 0.453592 : (parseFloat(form.weight) || 0)
  const totalKg = form.weightUnit === 'lbs' ? total * 0.453592 : total
  const dots = calcDOTS(totalKg, weightKg, form.gender === 'male')
  const wilks = calcWilks(totalKg, weightKg, form.gender === 'male')

  const pc = phaseColors[form.phase] || phaseColors.offseason

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-dark-400 text-sm">@{currentUser.username}</p>
        </div>
        <button onClick={handleSave}
          className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition-all ${
            saved ? 'bg-green-600 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white'
          }`}>
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Personal info */}
      <Section title="Personal info" icon={User}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Display name</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="Your name" />
          </div>
          <div>
            <label className={labelCls}>Age</label>
            <input type="number" value={form.age} onChange={(e) => set('age', e.target.value)} className={inputCls} placeholder="25" min="13" max="80" />
          </div>
          <div>
            <label className={labelCls}>Gender</label>
            <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inputCls}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Body weight</label>
            <input type="number" value={form.weight} onChange={(e) => set('weight', e.target.value)} className={inputCls} placeholder="185" step="0.1" />
          </div>
          <div>
            <label className={labelCls}>Unit</label>
            <select value={form.weightUnit} onChange={(e) => set('weightUnit', e.target.value)} className={inputCls}>
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Height (cm)</label>
            <input type="number" value={form.height} onChange={(e) => set('height', e.target.value)} className={inputCls} placeholder="178" />
          </div>
          <div>
            <label className={labelCls}>Goal weight ({form.weightUnit})</label>
            <input type="number" value={form.goalWeight} onChange={(e) => set('goalWeight', e.target.value)} className={inputCls} placeholder="Goal" step="0.1" />
          </div>
        </div>
      </Section>

      {/* Training phase */}
      <Section title="Training phase" icon={Target}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {PHASES.map((p) => (
            <button key={p.value} type="button" onClick={() => set('phase', p.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                form.phase === p.value
                  ? 'border-brand-500 bg-brand-500/10 text-white'
                  : 'border-dark-600 bg-dark-900 text-dark-300 hover:border-dark-500'
              }`}>
              <div className="font-medium text-sm">{p.label}</div>
              <div className="text-xs text-dark-500 mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>

        {form.phase === 'meet_prep' && (
          <div>
            <label className={labelCls}>Meet date</label>
            <input type="date" value={form.meetDate} onChange={(e) => set('meetDate', e.target.value)} className={inputCls} />
          </div>
        )}
      </Section>

      {/* Big 3 */}
      <Section title="Competition lifts (1RM)" icon={Dumbbell}>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[['squatMax', 'Squat'], ['benchMax', 'Bench'], ['deadliftMax', 'Deadlift']].map(([key, label]) => (
            <div key={key}>
              <label className={labelCls}>{label}</label>
              <input type="number" value={form[key]} onChange={(e) => set(key, e.target.value)}
                className={inputCls} placeholder="0" step="2.5" />
            </div>
          ))}
        </div>

        {total > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="bg-dark-900 rounded-xl p-3 text-center border border-dark-700">
              <div className="text-dark-400 text-xs">SBD Total</div>
              <div className="text-white font-bold">{total} {form.weightUnit}</div>
            </div>
            <div className="bg-dark-900 rounded-xl p-3 text-center border border-dark-700">
              <div className="text-dark-400 text-xs">DOTS</div>
              <div className="text-white font-bold">{dots}</div>
            </div>
            <div className="bg-dark-900 rounded-xl p-3 text-center border border-dark-700">
              <div className="text-dark-400 text-xs">Wilks</div>
              <div className="text-white font-bold">{wilks}</div>
            </div>
          </div>
        )}
      </Section>

      {/* Nutrition targets */}
      <Section title="Nutrition targets" icon={Target}>
        <button onClick={recalcTargets}
          className="w-full border border-dashed border-dark-600 hover:border-brand-600 text-dark-400 hover:text-brand-400 rounded-xl py-2.5 text-sm transition-all mb-4">
          Auto-calculate from phase & stats
        </button>
        <div className="grid grid-cols-2 gap-4">
          {[['targetCalories', 'Daily calories (kcal)'], ['targetProtein', 'Protein (g)'], ['targetCarbs', 'Carbs (g)'], ['targetFat', 'Fat (g)']].map(([key, label]) => (
            <div key={key}>
              <label className={labelCls}>{label}</label>
              <input type="number" value={form[key]} onChange={(e) => set(key, e.target.value)} className={inputCls} placeholder="0" min="0" />
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
