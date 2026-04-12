import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { getUserByUsername, createUser } from '../../utils/storage'
import { useApp } from '../../context/AppContext'
import { calcCalorieTargets } from '../../utils/calculations'

const PHASES = [
  { value: 'offseason', label: 'Off-Season', desc: 'Building base strength & work capacity' },
  { value: 'bulk', label: 'Bulk', desc: 'Gaining muscle mass with a calorie surplus' },
  { value: 'cut', label: 'Cut', desc: 'Losing fat while preserving muscle' },
  { value: 'meet_prep', label: 'Meet Prep', desc: 'Peaking for competition' },
]

export default function Register() {
  const { login } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    weightUnit: 'lbs',
    phase: 'offseason',
    goalWeight: '',
    meetDate: '',
    squatMax: '',
    benchMax: '',
    deadliftMax: '',
  })

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const handleStep1 = (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (getUserByUsername(form.username)) {
      setError('Username already taken.')
      return
    }
    setStep(2)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const profile = {
      id: uuidv4(),
      username: form.username,
      password: form.password,
      name: form.name || form.username,
      age: parseInt(form.age) || 25,
      gender: form.gender,
      weight: parseFloat(form.weight) || 0,
      height: parseFloat(form.height) || 0,
      weightUnit: form.weightUnit,
      phase: form.phase,
      goalWeight: parseFloat(form.goalWeight) || 0,
      meetDate: form.meetDate || null,
      squatMax: parseFloat(form.squatMax) || 0,
      benchMax: parseFloat(form.benchMax) || 0,
      deadliftMax: parseFloat(form.deadliftMax) || 0,
      createdAt: new Date().toISOString(),
    }

    const targets = calcCalorieTargets(profile)
    profile.targetCalories = targets.calories
    profile.targetProtein = targets.protein
    profile.targetCarbs = targets.carbs
    profile.targetFat = targets.fat

    createUser(profile)
    login(profile)
    navigate('/dashboard')
  }

  const inputCls = "w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors"
  const labelCls = "block text-sm font-medium text-dark-300 mb-1.5"

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mb-3 shadow-lg shadow-brand-600/30">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create your PowerTrack account</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${s <= step ? 'bg-brand-500 w-12' : 'bg-dark-700 w-8'}`} />
          ))}
          <span className="text-dark-400 text-xs ml-2">Step {step} of 2</span>
        </div>

        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-8">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Account details</h2>

              <div>
                <label className={labelCls}>Username</label>
                <input type="text" value={form.username} onChange={(e) => set('username', e.target.value)}
                  className={inputCls} placeholder="powerlifter_99" required />
              </div>

              <div>
                <label className={labelCls}>Display name <span className="text-dark-500">(optional)</span></label>
                <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
                  className={inputCls} placeholder="John Doe" />
              </div>

              <div>
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    className={`${inputCls} pr-12`} placeholder="Min. 6 characters" required />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200">
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls}>Confirm password</label>
                <input type="password" value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  className={inputCls} placeholder="••••••••" required />
              </div>

              <button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-colors mt-2">
                Continue
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Your profile</h2>

              {/* Demographics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Age</label>
                  <input type="number" value={form.age} onChange={(e) => set('age', e.target.value)}
                    className={inputCls} placeholder="25" min="13" max="80" required />
                </div>
                <div>
                  <label className={labelCls}>Gender</label>
                  <select value={form.gender} onChange={(e) => set('gender', e.target.value)}
                    className={inputCls}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Body weight</label>
                  <input type="number" value={form.weight} onChange={(e) => set('weight', e.target.value)}
                    className={inputCls} placeholder={form.weightUnit === 'lbs' ? '185' : '84'} step="0.1" required />
                </div>
                <div>
                  <label className={labelCls}>Unit</label>
                  <select value={form.weightUnit} onChange={(e) => set('weightUnit', e.target.value)}
                    className={inputCls}>
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Height (cm)</label>
                <input type="number" value={form.height} onChange={(e) => set('height', e.target.value)}
                  className={inputCls} placeholder="178" required />
              </div>

              {/* Powerlifting phase */}
              <div>
                <label className={labelCls}>Current phase</label>
                <div className="grid grid-cols-2 gap-2">
                  {PHASES.map((p) => (
                    <button key={p.value} type="button"
                      onClick={() => set('phase', p.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        form.phase === p.value
                          ? 'border-brand-500 bg-brand-500/10 text-white'
                          : 'border-dark-600 bg-dark-900 text-dark-300 hover:border-dark-500'
                      }`}>
                      <div className="font-medium text-sm">{p.label}</div>
                      <div className="text-xs text-dark-400 mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Big 3 maxes */}
              <div>
                <label className={`${labelCls} mb-2`}>Current 1RM ({form.weightUnit}) <span className="text-dark-500">– optional</span></label>
                <div className="grid grid-cols-3 gap-3">
                  {[['squatMax','Squat'],['benchMax','Bench'],['deadliftMax','Deadlift']].map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs text-dark-400 mb-1">{label}</label>
                      <input type="number" value={form[key]} onChange={(e) => set(key, e.target.value)}
                        className={inputCls} placeholder="0" step="2.5" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Goal weight */}
              <div>
                <label className={labelCls}>Goal weight ({form.weightUnit}) <span className="text-dark-500">– optional</span></label>
                <input type="number" value={form.goalWeight} onChange={(e) => set('goalWeight', e.target.value)}
                  className={inputCls} placeholder="Goal body weight" step="0.1" />
              </div>

              {form.phase === 'meet_prep' && (
                <div>
                  <label className={labelCls}>Meet date</label>
                  <input type="date" value={form.meetDate} onChange={(e) => set('meetDate', e.target.value)}
                    className={inputCls} />
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 font-semibold py-3 rounded-xl transition-colors">
                  Back
                </button>
                <button type="submit"
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-colors">
                  Create account
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-dark-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
