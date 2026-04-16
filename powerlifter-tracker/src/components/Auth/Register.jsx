import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, Users, Eye, EyeOff, AlertCircle, Mail, Check } from 'lucide-react'
import { signUp, isUsernameTaken, createProfile } from '../../lib/db'
import { calcCalorieTargets } from '../../utils/calculations'

const PHASES = [
  { value: 'offseason', label: 'Off-Season', desc: 'Building base strength & work capacity' },
  { value: 'bulk',      label: 'Bulk',       desc: 'Gaining muscle mass with a calorie surplus' },
  { value: 'cut',       label: 'Cut',        desc: 'Losing fat while preserving muscle' },
  { value: 'meet_prep', label: 'Meet Prep',  desc: 'Peaking for competition' },
]

const ROLES = [
  {
    value: 'athlete',
    icon: Dumbbell,
    label: 'Athlete',
    desc: 'Track your workouts, nutrition, and progress toward your goals.',
    accent: 'border-brand-500 bg-brand-500/10',
    iconBg: 'bg-brand-600/20 text-brand-400',
    check: 'bg-brand-500',
  },
  {
    value: 'coach',
    icon: Users,
    label: 'Coach',
    desc: 'Manage athletes, build training plans, and track mentee progress.',
    accent: 'border-purple-500 bg-purple-500/10',
    iconBg: 'bg-purple-600/20 text-purple-400',
    check: 'bg-purple-500',
  },
]

const inputCls = "w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors"
const labelCls = "block text-sm font-medium text-dark-300 mb-1.5"

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  const [form, setForm] = useState({
    // Role
    role: 'athlete',
    // Credentials
    username: '', email: '', password: '', confirmPassword: '',
    // Common profile
    name: '', age: '', gender: 'male', weight: '', height: '', weightUnit: 'lbs',
    // Athlete-only
    phase: 'offseason', goalWeight: '', meetDate: '',
    squatMax: '', benchMax: '', deadliftMax: '',
  })

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  // ── Step 1: validate credentials ────────────────────────────────
  const handleStep1 = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6)                    { setError('Password must be at least 6 characters.'); return }
    if (form.password !== form.confirmPassword)       { setError('Passwords do not match.'); return }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) { setError('Username: 3–20 chars, letters / numbers / underscore.'); return }
    setLoading(true)
    try {
      if (await isUsernameTaken(form.username)) { setError('Username already taken — try another.'); return }
      setStep(2)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: create auth user + profile ──────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: authData, error: authError } = await signUp(form.email.trim(), form.password)
      if (authError) throw authError

      const userId = authData.user?.id
      if (!userId) throw new Error('No user ID returned — check Supabase settings.')

      const profileInput = {
        age:         parseInt(form.age)         || 25,
        gender:      form.gender,
        weight:      parseFloat(form.weight)    || 0,
        height:      parseFloat(form.height)    || 0,
        weight_unit: form.weightUnit,
        // Athlete-specific (safe defaults for coaches)
        phase:         form.role === 'athlete' ? form.phase : 'offseason',
        goal_weight:   parseFloat(form.goalWeight) || 0,
        meet_date:     form.meetDate || null,
        squat_max:     parseFloat(form.squatMax)    || 0,
        bench_max:     parseFloat(form.benchMax)    || 0,
        deadlift_max:  parseFloat(form.deadliftMax) || 0,
      }

      const targets = calcCalorieTargets({
        age: profileInput.age, gender: profileInput.gender,
        weight: profileInput.weight, height: profileInput.height,
        weightUnit: profileInput.weight_unit, phase: profileInput.phase,
      })

      const profile = {
        id:       userId,
        username: form.username.trim(),
        name:     form.name.trim() || form.username.trim(),
        role:     form.role,
        ...profileInput,
        target_calories: targets.calories,
        target_protein:  targets.protein,
        target_carbs:    targets.carbs,
        target_fat:      targets.fat,
      }

      if (authData.session) {
        await createProfile(profile)
        navigate('/dashboard')
      } else {
        localStorage.setItem('pt_pending_profile', JSON.stringify(profile))
        setAwaitingConfirm(true)
      }
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  // ── Awaiting email confirmation ──────────────────────────────────
  if (awaitingConfirm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
          <p className="text-dark-400 mb-2">
            We sent a confirmation link to <span className="text-white">{form.email}</span>.
          </p>
          <p className="text-dark-500 text-sm mb-6">
            Click the link — you'll be redirected back and logged in automatically.
          </p>
          <p className="text-dark-500 text-xs">
            Tip: disable "Enable email confirmations" in Supabase Auth → Settings to skip this step.
          </p>
        </div>
      </div>
    )
  }

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
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {/* ── Step 1: role + credentials ── */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              {/* Role picker */}
              <div className="mb-2">
                <label className="block text-sm font-medium text-dark-300 mb-3">I am joining as a…</label>
                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map((r) => {
                    const Icon = r.icon
                    const selected = form.role === r.value
                    return (
                      <button key={r.value} type="button" onClick={() => set('role', r.value)}
                        className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                          selected ? r.accent : 'border-dark-600 bg-dark-900 hover:border-dark-500'
                        }`}>
                        {/* Check mark */}
                        {selected && (
                          <span className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ${r.check}`}>
                            <Check className="w-3 h-3 text-white" />
                          </span>
                        )}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${selected ? r.iconBg : 'bg-dark-700 text-dark-400'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className={`font-semibold text-sm mb-1 ${selected ? 'text-white' : 'text-dark-300'}`}>{r.label}</div>
                        <div className="text-xs text-dark-500 leading-relaxed">{r.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>Username</label>
                <input type="text" value={form.username} onChange={(e) => set('username', e.target.value)}
                  className={inputCls} placeholder="powerlifter_99" required />
                <p className="text-dark-500 text-xs mt-1">3–20 chars, letters / numbers / underscore</p>
              </div>

              <div>
                <label className={labelCls}>Display name <span className="text-dark-500">(optional)</span></label>
                <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
                  className={inputCls} placeholder="John Doe" />
              </div>

              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  className={inputCls} placeholder="you@example.com" required autoComplete="email" />
              </div>

              <div>
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    className={`${inputCls} pr-12`} placeholder="Min. 6 characters" required autoComplete="new-password" />
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
                  className={inputCls} placeholder="••••••••" required autoComplete="new-password" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mt-2">
                {loading ? 'Checking…' : 'Continue'}
              </button>
            </form>
          )}

          {/* ── Step 2: profile details (role-aware) ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                  form.role === 'coach' ? 'bg-purple-600/20 text-purple-400' : 'bg-brand-600/20 text-brand-400'
                }`}>
                  {form.role === 'coach' ? <Users className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {form.role === 'coach' ? 'Coach profile' : 'Athlete profile'}
                </h2>
              </div>

              {/* Common fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Age</label>
                  <input type="number" value={form.age} onChange={(e) => set('age', e.target.value)}
                    className={inputCls} placeholder="25" min="13" max="80" required />
                </div>
                <div>
                  <label className={labelCls}>Gender</label>
                  <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inputCls}>
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
                  <select value={form.weightUnit} onChange={(e) => set('weightUnit', e.target.value)} className={inputCls}>
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

              {/* Athlete-only fields */}
              {form.role === 'athlete' && (
                <>
                  <div>
                    <label className={labelCls}>Current phase</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PHASES.map((p) => (
                        <button key={p.value} type="button" onClick={() => set('phase', p.value)}
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

                  <div>
                    <label className={`${labelCls} mb-2`}>
                      Current 1RM ({form.weightUnit}) <span className="text-dark-500">– optional</span>
                    </label>
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

                  <div>
                    <label className={labelCls}>
                      Goal weight ({form.weightUnit}) <span className="text-dark-500">– optional</span>
                    </label>
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
                </>
              )}

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => { setStep(1); setError('') }}
                  className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 font-semibold py-3 rounded-xl transition-colors">
                  Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
                  {loading ? 'Creating…' : 'Create account'}
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
