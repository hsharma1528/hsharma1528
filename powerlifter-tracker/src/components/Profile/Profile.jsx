import React, { useState } from 'react'
import { Save, User, Dumbbell, Target } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { updateProfile } from '../../lib/db'
import { calcCalorieTargets, phaseColors, phaseLabels, calcDOTS, calcWilks } from '../../utils/calculations'

const PHASES = [
  { value: 'offseason', label: 'Off-Season', desc: 'Base building, higher volume' },
  { value: 'bulk',      label: 'Bulk',       desc: 'Calorie surplus, mass gain' },
  { value: 'cut',       label: 'Cut',        desc: 'Calorie deficit, fat loss' },
  { value: 'meet_prep', label: 'Meet Prep',  desc: 'Peaking for competition' },
]

const inputCls = "w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors"
const labelCls = "block text-sm font-medium text-dark-300 mb-1.5"

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
      <h2 className="text-white font-semibold flex items-center gap-2 mb-5">
        <Icon className="w-5 h-5 text-brand-400" />{title}
      </h2>
      {children}
    </div>
  )
}

export default function Profile() {
  const { currentUser, refreshUser, dispatch } = useApp()

  // Map DB column names (snake_case) to form fields
  const [form, setForm] = useState({
    name:            currentUser.name            || '',
    age:             currentUser.age             || '',
    gender:          currentUser.gender          || 'male',
    weight:          currentUser.weight          || '',
    height:          currentUser.height          || '',
    weight_unit:     currentUser.weight_unit     || 'lbs',
    phase:           currentUser.phase           || 'offseason',
    goal_weight:     currentUser.goal_weight     || '',
    meet_date:       currentUser.meet_date       || '',
    squat_max:       currentUser.squat_max       || '',
    bench_max:       currentUser.bench_max       || '',
    deadlift_max:    currentUser.deadlift_max    || '',
    target_calories: currentUser.target_calories || '',
    target_protein:  currentUser.target_protein  || '',
    target_carbs:    currentUser.target_carbs    || '',
    target_fat:      currentUser.target_fat      || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const recalcTargets = () => {
    const targets = calcCalorieTargets({
      age: parseInt(form.age), gender: form.gender,
      weight: parseFloat(form.weight), height: parseFloat(form.height),
      weightUnit: form.weight_unit, phase: form.phase,
    })
    setForm((f) => ({ ...f, target_calories: targets.calories, target_protein: targets.protein, target_carbs: targets.carbs, target_fat: targets.fat }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = {
        name:            form.name,
        age:             parseInt(form.age)          || currentUser.age,
        gender:          form.gender,
        weight:          parseFloat(form.weight)     || currentUser.weight,
        height:          parseFloat(form.height)     || currentUser.height,
        weight_unit:     form.weight_unit,
        phase:           form.phase,
        goal_weight:     parseFloat(form.goal_weight) || 0,
        meet_date:       form.meet_date || null,
        squat_max:       parseFloat(form.squat_max)    || 0,
        bench_max:       parseFloat(form.bench_max)    || 0,
        deadlift_max:    parseFloat(form.deadlift_max) || 0,
        target_calories: parseInt(form.target_calories) || currentUser.target_calories,
        target_protein:  parseInt(form.target_protein)  || currentUser.target_protein,
        target_carbs:    parseInt(form.target_carbs)    || currentUser.target_carbs,
        target_fat:      parseInt(form.target_fat)      || currentUser.target_fat,
      }
      await updateProfile(currentUser.id, updates)
      dispatch({ type: 'UPDATE_USER', payload: updates })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Computed stats
  const total = (parseFloat(form.squat_max) || 0) + (parseFloat(form.bench_max) || 0) + (parseFloat(form.deadlift_max) || 0)
  const weightKg = form.weight_unit === 'lbs' ? (parseFloat(form.weight) || 0) * 0.453592 : (parseFloat(form.weight) || 0)
  const totalKg  = form.weight_unit === 'lbs' ? total * 0.453592 : total
  const dots  = calcDOTS(totalKg, weightKg, form.gender === 'male')
  const wilks = calcWilks(totalKg, weightKg, form.gender === 'male')

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-dark-400 text-sm">@{currentUser.username}</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 ${
            saved ? 'bg-green-600 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white'
          }`}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
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
            <select value={form.weight_unit} onChange={(e) => set('weight_unit', e.target.value)} className={inputCls}>
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Height (cm)</label>
            <input type="number" value={form.height} onChange={(e) => set('height', e.target.value)} className={inputCls} placeholder="178" />
          </div>
          <div>
            <label className={labelCls}>Goal weight ({form.weight_unit})</label>
            <input type="number" value={form.goal_weight} onChange={(e) => set('goal_weight', e.target.value)} className={inputCls} placeholder="Goal" step="0.1" />
          </div>
        </div>
      </Section>

      {/* Training phase */}
      <Section title="Training phase" icon={Target}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {PHASES.map((p) => (
            <button key={p.value} type="button" onClick={() => set('phase', p.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                form.phase === p.value ? 'border-brand-500 bg-brand-500/10 text-white' : 'border-dark-600 bg-dark-900 text-dark-300 hover:border-dark-500'
              }`}>
              <div className="font-medium text-sm">{p.label}</div>
              <div className="text-xs text-dark-500 mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
        {form.phase === 'meet_prep' && (
          <div>
            <label className={labelCls}>Meet date</label>
            <input type="date" value={form.meet_date} onChange={(e) => set('meet_date', e.target.value)} className={inputCls} />
          </div>
        )}
      </Section>

      {/* Big 3 */}
      <Section title="Competition lifts (1RM)" icon={Dumbbell}>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[['squat_max','Squat'],['bench_max','Bench'],['deadlift_max','Deadlift']].map(([key, label]) => (
            <div key={key}>
              <label className={labelCls}>{label}</label>
              <input type="number" value={form[key]} onChange={(e) => set(key, e.target.value)} className={inputCls} placeholder="0" step="2.5" />
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[['SBD Total', `${total} ${form.weight_unit}`], ['DOTS', dots], ['Wilks', wilks]].map(([label, val]) => (
              <div key={label} className="bg-dark-900 rounded-xl p-3 text-center border border-dark-700">
                <div className="text-dark-400 text-xs">{label}</div>
                <div className="text-white font-bold">{val}</div>
              </div>
            ))}
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
          {[['target_calories','Daily calories (kcal)'],['target_protein','Protein (g)'],['target_carbs','Carbs (g)'],['target_fat','Fat (g)']].map(([key, label]) => (
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
