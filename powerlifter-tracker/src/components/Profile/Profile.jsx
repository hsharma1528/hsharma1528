import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Save, User, Dumbbell, Target, Users, ToggleLeft, ToggleRight, UserCheck, Search, Camera, Instagram, Twitter, Globe, Bell, Smartphone } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { updateProfile, getMyEnrollments, cancelEnrollment, uploadAvatar, savePushSubscription, deletePushSubscription } from '../../lib/db'
import { isPushSupported, subscribeToPush, unsubscribeFromPush, getCurrentSubscription } from '../../lib/pushNotifications'
import { calcCalorieTargets, calcDOTS, calcWilks } from '../../utils/calculations'

const PHASES = [
  { value: 'offseason', label: 'Off-Season', desc: 'Base building, higher volume' },
  { value: 'bulk',      label: 'Bulk',       desc: 'Calorie surplus, mass gain' },
  { value: 'cut',       label: 'Cut',        desc: 'Calorie deficit, fat loss' },
  { value: 'meet_prep', label: 'Meet Prep',  desc: 'Peaking for competition' },
]

const COACHING_PHASES = [
  { value: 'offseason', label: 'Off-Season' },
  { value: 'bulk',      label: 'Bulk' },
  { value: 'cut',       label: 'Cut' },
  { value: 'meet_prep', label: 'Meet Prep' },
]

const WEIGHT_CLASSES = [
  '47kg', '52kg', '57kg', '63kg', '69kg', '76kg', '84kg', '84kg+',
  '59kg', '66kg', '74kg', '83kg', '93kg', '105kg', '120kg', '120kg+',
]

const SPECIALTIES = [
  'Raw', 'Equipped', 'Powerbuilding', 'Beginner coaching',
  'Meet preparation', 'Injury rehab', 'Nutrition planning', 'Online coaching',
]

const inputCls = "w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors"
const labelCls = "block text-sm font-medium text-dark-300 mb-1.5"

function Section({ title, icon: Icon, iconColor = 'text-brand-400', children }) {
  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
      <h2 className="text-white font-semibold flex items-center gap-2 mb-5">
        <Icon className={`w-5 h-5 ${iconColor}`} />{title}
      </h2>
      {children}
    </div>
  )
}

function MultiPill({ options, selected, onToggle, colorActive = 'border-brand-500 bg-brand-500/10 text-brand-400' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value
        const lbl = typeof opt === 'string' ? opt : opt.label
        const active = selected.includes(val)
        return (
          <button key={val} type="button" onClick={() => onToggle(val)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              active ? colorActive : 'border-dark-600 bg-dark-900 text-dark-400 hover:border-dark-500'
            }`}>
            {lbl}
          </button>
        )
      })}
    </div>
  )
}

export default function Profile() {
  const { currentUser, dispatch } = useApp()
  const isCoach = currentUser.role === 'coach'

  const [form, setForm] = useState({
    // Common
    name:            currentUser.name            || '',
    age:             currentUser.age             || '',
    gender:          currentUser.gender          || 'male',
    weight:          currentUser.weight          || '',
    height:          currentUser.height          || '',
    weight_unit:     currentUser.weight_unit     || 'lbs',
    phone_number:    currentUser.phone_number    || '',
    avatar_url:      currentUser.avatar_url      || '',
    instagram_url:   currentUser.instagram_url   || '',
    twitter_url:     currentUser.twitter_url     || '',
    website_url:     currentUser.website_url     || '',
    notify_sms:      currentUser.notify_sms      ?? false,
    notify_whatsapp: currentUser.notify_whatsapp ?? false,
    // Athlete-specific
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
    // Coach-specific
    bio:                     currentUser.bio                     || '',
    experience_years:        currentUser.experience_years        || '',
    is_available:            currentUser.is_available            ?? true,
    coaching_phases:         currentUser.coaching_phases         || [],
    coaching_weight_classes: currentUser.coaching_weight_classes || [],
    coaching_specialties:    currentUser.coaching_specialties    || [],
  })

  const [saving,          setSaving]          = useState(false)
  const [saved,           setSaved]           = useState(false)
  const [enrollment,      setEnrollment]      = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [pushSub,         setPushSub]         = useState(null)
  const [pushLoading,     setPushLoading]     = useState(false)
  const avatarInputRef = useRef(null)

  useEffect(() => {
    if (!isCoach) {
      getMyEnrollments(currentUser.id)
        .then((enrs) => setEnrollment(enrs[0] || null))
        .catch(console.error)
    }
  }, [currentUser.id, isCoach])

  useEffect(() => {
    if (isPushSupported()) {
      getCurrentSubscription().then(setPushSub).catch(() => {})
    }
  }, [])

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const toggleArrayField = (field, value) => {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v) => v !== value)
        : [...f[field], value],
    }))
  }

  const recalcTargets = () => {
    const targets = calcCalorieTargets({
      age: parseInt(form.age), gender: form.gender,
      weight: parseFloat(form.weight), height: parseFloat(form.height),
      weightUnit: form.weight_unit, phase: form.phase,
    })
    setForm((f) => ({ ...f, target_calories: targets.calories, target_protein: targets.protein, target_carbs: targets.carbs, target_fat: targets.fat }))
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const url = await uploadAvatar(currentUser.id, file)
      await updateProfile(currentUser.id, { avatar_url: url })
      dispatch({ type: 'UPDATE_USER', payload: { avatar_url: url } })
      setForm((f) => ({ ...f, avatar_url: url }))
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleEnablePush = async () => {
    setPushLoading(true)
    try {
      const sub = await subscribeToPush()
      await savePushSubscription(currentUser.id, sub)
      setPushSub(sub)
    } catch (err) {
      alert(err.message)
    } finally {
      setPushLoading(false)
    }
  }

  const handleDisablePush = async () => {
    setPushLoading(true)
    try {
      const sub = await getCurrentSubscription()
      if (sub) {
        await deletePushSubscription(currentUser.id, sub.endpoint)
        await unsubscribeFromPush()
      }
      setPushSub(null)
    } catch (err) {
      alert(err.message)
    } finally {
      setPushLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = {
        name:        form.name,
        age:         parseInt(form.age)      || currentUser.age,
        gender:      form.gender,
        weight:      parseFloat(form.weight) || currentUser.weight,
        height:      parseFloat(form.height) || currentUser.height,
        weight_unit: form.weight_unit,
        phone_number:    form.phone_number    || null,
        instagram_url:   form.instagram_url   || null,
        twitter_url:     form.twitter_url     || null,
        website_url:     form.website_url     || null,
        notify_sms:      form.notify_sms,
        notify_whatsapp: form.notify_whatsapp,
        // Athlete fields
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
        // Coach fields
        bio:                     form.bio,
        experience_years:        parseInt(form.experience_years) || 0,
        is_available:            form.is_available,
        coaching_phases:         form.coaching_phases,
        coaching_weight_classes: form.coaching_weight_classes,
        coaching_specialties:    form.coaching_specialties,
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

      {/* ── Avatar ── */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6 flex items-center gap-5">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full border-2 border-dark-600 overflow-hidden bg-dark-700 flex items-center justify-center">
            {form.avatar_url
              ? <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              : <span className="text-2xl font-bold text-dark-400">{(currentUser.name || currentUser.username || '?')[0].toUpperCase()}</span>
            }
          </div>
          <button onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-600 hover:bg-brand-500 rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50">
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <div>
          <div className="text-white font-semibold">{currentUser.name || currentUser.username}</div>
          <div className="text-dark-400 text-sm">@{currentUser.username}</div>
          <div className="text-dark-500 text-xs mt-1">{uploadingAvatar ? 'Uploading…' : 'Click camera to change photo'}</div>
        </div>
      </div>

      {/* ── Coach profile section (coaches only) ── */}
      {isCoach && (
        <Section title="Coach profile" icon={Users} iconColor="text-purple-400">
          {/* Availability toggle */}
          <div className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-dark-700 mb-5">
            <div>
              <div className="text-white text-sm font-medium">Accepting new athletes</div>
              <div className="text-dark-400 text-xs mt-0.5">
                {form.is_available ? 'Athletes can send you enrollment requests' : 'Your profile is hidden from athlete search'}
              </div>
            </div>
            <button type="button" onClick={() => set('is_available', !form.is_available)}
              className="transition-colors">
              {form.is_available
                ? <ToggleRight className="w-9 h-9 text-purple-400" />
                : <ToggleLeft  className="w-9 h-9 text-dark-500" />}
            </button>
          </div>

          {/* Bio */}
          <div className="mb-4">
            <label className={labelCls}>Bio</label>
            <textarea value={form.bio} onChange={(e) => set('bio', e.target.value)}
              className={`${inputCls} resize-none`} rows={4}
              placeholder="Tell athletes about your coaching background, philosophy, and what you specialise in…" />
          </div>

          {/* Years of experience */}
          <div className="mb-5">
            <label className={labelCls}>Years of coaching experience</label>
            <input type="number" value={form.experience_years}
              onChange={(e) => set('experience_years', e.target.value)}
              className={inputCls} placeholder="0" min="0" max="50" />
          </div>

          {/* Coaching phases */}
          <div className="mb-5">
            <label className={`${labelCls} mb-2`}>Phases I coach</label>
            <MultiPill
              options={COACHING_PHASES}
              selected={form.coaching_phases}
              onToggle={(v) => toggleArrayField('coaching_phases', v)}
              colorActive="border-purple-500 bg-purple-500/10 text-purple-400"
            />
          </div>

          {/* Weight classes */}
          <div className="mb-5">
            <label className={`${labelCls} mb-2`}>Weight classes I work with</label>
            <MultiPill
              options={WEIGHT_CLASSES}
              selected={form.coaching_weight_classes}
              onToggle={(v) => toggleArrayField('coaching_weight_classes', v)}
              colorActive="border-purple-500 bg-purple-500/10 text-purple-400"
            />
          </div>

          {/* Specialties */}
          <div>
            <label className={`${labelCls} mb-2`}>Specialties</label>
            <MultiPill
              options={SPECIALTIES}
              selected={form.coaching_specialties}
              onToggle={(v) => toggleArrayField('coaching_specialties', v)}
              colorActive="border-purple-500 bg-purple-500/10 text-purple-400"
            />
          </div>
        </Section>
      )}

      {/* ── Athlete: My Coach ── */}
      {!isCoach && (
        <Section title="My Coach" icon={UserCheck} iconColor="text-purple-400">
          {!enrollment ? (
            <div className="text-center py-4">
              <p className="text-dark-400 text-sm mb-3">You don't have a coach yet.</p>
              <Link to="/coaches"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                <Search className="w-4 h-4" />Find a Coach
              </Link>
            </div>
          ) : (
            <div className="flex items-start gap-4 p-4 bg-dark-900 rounded-xl border border-dark-700">
              <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-600/30 flex items-center justify-center font-bold text-purple-400 shrink-0">
                {((enrollment.coach?.name || enrollment.coach?.username || '?')[0]).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium">{enrollment.coach?.name || enrollment.coach?.username}</div>
                <div className="text-dark-400 text-xs mt-0.5">@{enrollment.coach?.username}</div>
                {enrollment.status === 'pending' && (
                  <span className="mt-1 inline-block text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded px-2 py-0.5">
                    Request pending
                  </span>
                )}
                {enrollment.status === 'accepted' && (
                  <span className="mt-1 inline-block text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded px-2 py-0.5">
                    Active coaching
                  </span>
                )}
              </div>
              <button
                onClick={async () => {
                  if (!confirm('Cancel request / unenroll from this coach?')) return
                  await cancelEnrollment(enrollment.id)
                  setEnrollment(null)
                }}
                className="text-dark-500 hover:text-red-400 text-xs transition-colors shrink-0 mt-1">
                {enrollment.status === 'pending' ? 'Cancel' : 'Unenroll'}
              </button>
            </div>
          )}
        </Section>
      )}

      {/* ── Personal info ── */}
      <Section title="Personal info" icon={User}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Display name</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="Your name" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>
              Phone number <span className="text-dark-500 text-xs font-normal">(optional — for future SMS updates)</span>
            </label>
            <input type="tel" value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)}
              className={inputCls} placeholder="+1 555 000 0000" />
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
          {!isCoach && (
            <div>
              <label className={labelCls}>Goal weight ({form.weight_unit})</label>
              <input type="number" value={form.goal_weight} onChange={(e) => set('goal_weight', e.target.value)} className={inputCls} placeholder="Goal" step="0.1" />
            </div>
          )}
        </div>
      </Section>

      {/* ── Athlete-only: Training phase ── */}
      {!isCoach && (
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
      )}

      {/* ── Athlete-only: Competition lifts ── */}
      {!isCoach && (
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
      )}

      {/* ── Social links ── */}
      <Section title="Social & web" icon={Globe} iconColor="text-blue-400">
        <div className="space-y-4">
          {[
            ['instagram_url', 'Instagram', '@username or full URL', Instagram, 'text-pink-400'],
            ['twitter_url',   'X / Twitter', '@username or full URL', Twitter,   'text-sky-400'],
            ['website_url',   'Website',    'https://yoursite.com',  Globe,     'text-green-400'],
          ].map(([field, label, placeholder, Icon, iconColor]) => (
            <div key={field} className="relative">
              <label className={labelCls}>{label}</label>
              <div className="relative">
                <Icon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${iconColor}`} />
                <input value={form[field]} onChange={(e) => set(field, e.target.value)}
                  className={inputCls + ' pl-10'} placeholder={placeholder} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Notifications ── */}
      <Section title="Notifications" icon={Bell} iconColor="text-yellow-400">

        {/* Push notifications (PWA) */}
        <div className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-dark-700 mb-3">
          <div>
            <div className="text-white text-sm font-medium flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />Push notifications
            </div>
            <div className="text-dark-400 text-xs mt-0.5">
              {!isPushSupported()
                ? 'Not supported on this browser'
                : pushSub
                  ? 'Enabled on this device'
                  : 'Plans, messages, and check-in reminders'}
            </div>
          </div>
          {isPushSupported() && (
            <button onClick={pushSub ? handleDisablePush : handleEnablePush}
              disabled={pushLoading}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
                pushSub
                  ? 'bg-dark-700 hover:bg-dark-600 text-dark-300 border border-dark-600'
                  : 'bg-brand-600 hover:bg-brand-500 text-white'
              }`}>
              {pushLoading ? '…' : pushSub ? 'Disable' : 'Enable'}
            </button>
          )}
        </div>
        {pushSub && (
          <p className="text-green-400 text-xs mb-3 px-1">✓ This device will receive push notifications</p>
        )}

        {/* iOS tip */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 mb-4 text-xs text-blue-300">
          <span className="font-medium">iPhone / iPad:</span> First tap Share → "Add to Home Screen", then come back here to enable notifications.
        </div>

        {/* Legacy SMS / WhatsApp */}
        <div className="text-dark-500 text-xs mb-2 mt-1">Optional: SMS / WhatsApp (requires Twilio setup)</div>
        {[
          ['notify_sms',      'SMS',      'Text message to your phone number'],
          ['notify_whatsapp', 'WhatsApp', 'WhatsApp message to your phone number'],
        ].map(([field, label, desc]) => (
          <div key={field} className="flex items-center justify-between p-3 bg-dark-900 rounded-xl border border-dark-700 mb-2">
            <div>
              <div className="text-dark-300 text-sm">{label}</div>
              <div className="text-dark-500 text-xs">{desc}</div>
            </div>
            <button type="button" onClick={() => set(field, !form[field])}>
              {form[field]
                ? <ToggleRight className="w-8 h-8 text-brand-400" />
                : <ToggleLeft  className="w-8 h-8 text-dark-600" />}
            </button>
          </div>
        ))}
        {(form.notify_sms || form.notify_whatsapp) && !form.phone_number && (
          <p className="text-yellow-400 text-xs mt-1">Add a phone number in Personal info to use SMS/WhatsApp.</p>
        )}
      </Section>

      {/* ── Nutrition targets ── */}
      <Section title="Nutrition targets" icon={Target}>
        {!isCoach && (
          <button onClick={recalcTargets}
            className="w-full border border-dashed border-dark-600 hover:border-brand-600 text-dark-400 hover:text-brand-400 rounded-xl py-2.5 text-sm transition-all mb-4">
            Auto-calculate from phase & stats
          </button>
        )}
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
