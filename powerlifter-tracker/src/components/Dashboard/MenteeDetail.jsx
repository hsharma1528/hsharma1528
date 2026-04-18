import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft, User, Dumbbell, Apple, Scale, ClipboardList,
  Plus, CheckCircle, Circle, Trash2, TrendingUp, MessageSquare,
  X, ClipboardCheck, Target, Trophy
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  getMenteeProfile, getMenteeWorkouts, getMenteeNutrition, getMenteeWeightLog,
  getWorkoutPlansForMentee, deleteWorkoutPlan, updateWorkoutPlan, getPlanWorkouts,
  getWorkoutComments, addWorkoutComment, getCheckIns, updateCheckInReply,
  setMenteeNutritionTargets, getMenteeEnrollment, getPersonalRecords,
} from '../../lib/db'
import { calcDOTS, phaseLabels, phaseColors } from '../../utils/calculations'

const CATEGORY_COLORS = {
  squat:    'text-blue-400 bg-blue-500/10 border-blue-500/30',
  bench:    'text-green-400 bg-green-500/10 border-green-500/30',
  deadlift: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  other:    'text-purple-400 bg-purple-500/10 border-purple-500/30',
}

function Section({ title, icon: Icon, iconColor = 'text-brand-400', children, action }) {
  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold flex items-center gap-2 text-sm">
          <Icon className={`w-4 h-4 ${iconColor}`} />{title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function StatBadge({ label, value, unit }) {
  return (
    <div className="bg-dark-900 rounded-xl p-3 text-center border border-dark-700">
      <div className="text-dark-400 text-xs mb-1">{label}</div>
      <div className="text-white font-bold">{value || '—'}<span className="text-dark-400 text-xs font-normal ml-1">{value ? unit : ''}</span></div>
    </div>
  )
}

function ComplianceRow({ day, dayIndex, completed }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      completed ? 'border-green-500/30 bg-green-500/5' : 'border-dark-700 bg-dark-900'
    }`}>
      {completed
        ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
        : <Circle className="w-4 h-4 text-dark-600 shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${completed ? 'text-green-400' : 'text-dark-300'}`}>
          {day.day_label || `Day ${dayIndex + 1}`}
        </div>
        {day.exercises?.length > 0 && (
          <div className="text-dark-500 text-xs truncate mt-0.5">
            {day.exercises.map((e) => e.name).join(' · ')}
          </div>
        )}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full border ${
        completed ? 'border-green-500/30 text-green-400' : 'border-dark-700 text-dark-500'
      }`}>
        {completed ? 'Done' : 'Pending'}
      </span>
    </div>
  )
}

export default function MenteeDetail() {
  const { athleteId } = useParams()
  const { currentUser } = useApp()
  const navigate = useNavigate()

  const [profile,    setProfile]    = useState(null)
  const [workouts,   setWorkouts]   = useState([])
  const [nutrition,  setNutrition]  = useState([])
  const [weightLog,  setWeightLog]  = useState([])
  const [plans,      setPlans]      = useState([])
  const [planDones,  setPlanDones]  = useState({})
  const [checkIns,   setCheckIns]   = useState([])
  const [prs,        setPrs]        = useState([])
  const [enrollment, setEnrollment] = useState(null)
  const [loading,    setLoading]    = useState(true)
  // Comments panel
  const [commentsWorkout, setCommentsWorkout] = useState(null)
  const [comments,   setComments]   = useState([])
  const [commentText, setCommentText] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)
  // Nutrition targets panel
  const [showNutrTargets, setShowNutrTargets] = useState(false)
  const [nutrForm, setNutrForm] = useState({ custom_calories: '', custom_protein: '', custom_carbs: '', custom_fat: '' })
  const [nutrSaving, setNutrSaving] = useState(false)
  // Check-in replies
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replySaving, setReplySaving] = useState(false)

  async function loadAll() {
    setLoading(true)
    try {
      const [prof, ws, nut, wl, pls, cis, prData, enroll] = await Promise.all([
        getMenteeProfile(athleteId),
        getMenteeWorkouts(athleteId),
        getMenteeNutrition(athleteId),
        getMenteeWeightLog(athleteId),
        getWorkoutPlansForMentee(currentUser.id, athleteId),
        getCheckIns(athleteId, 8),
        getPersonalRecords(athleteId).catch(() => []),
        getMenteeEnrollment(currentUser.id, athleteId).catch(() => null),
      ])
      setProfile(prof)
      setWorkouts(ws)
      setNutrition(nut)
      setWeightLog(wl)
      setPlans(pls)
      setCheckIns(cis)
      setPrs(prData)
      setEnrollment(enroll)
      if (enroll) {
        setNutrForm({
          custom_calories: enroll.custom_calories || '',
          custom_protein:  enroll.custom_protein  || '',
          custom_carbs:    enroll.custom_carbs    || '',
          custom_fat:      enroll.custom_fat      || '',
        })
      }

      const dones = {}
      await Promise.all(pls.map(async (plan) => {
        const planWs = await getPlanWorkouts(plan.id)
        const set = new Set(planWs.map((w) => w.plan_day_index).filter((i) => i != null))
        dones[plan.id] = set
      }))
      setPlanDones(dones)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openComments = async (workout) => {
    setCommentsWorkout(workout)
    setCommentText('')
    const data = await getWorkoutComments(workout.id).catch(() => [])
    setComments(data)
  }

  const submitComment = async () => {
    if (!commentText.trim() || !commentsWorkout) return
    setCommentSaving(true)
    try {
      const c = await addWorkoutComment(commentsWorkout.id, currentUser.id, commentText.trim())
      setComments((prev) => [...prev, c])
      setCommentText('')
    } finally {
      setCommentSaving(false)
    }
  }

  const saveNutrTargets = async () => {
    setNutrSaving(true)
    try {
      const targets = {
        custom_calories: nutrForm.custom_calories ? parseInt(nutrForm.custom_calories) : null,
        custom_protein:  nutrForm.custom_protein  ? parseInt(nutrForm.custom_protein)  : null,
        custom_carbs:    nutrForm.custom_carbs    ? parseInt(nutrForm.custom_carbs)    : null,
        custom_fat:      nutrForm.custom_fat      ? parseInt(nutrForm.custom_fat)      : null,
      }
      await setMenteeNutritionTargets(currentUser.id, athleteId, targets)
      setShowNutrTargets(false)
    } finally {
      setNutrSaving(false)
    }
  }

  const submitReply = async (checkIn) => {
    if (!replyText.trim()) return
    setReplySaving(true)
    try {
      await updateCheckInReply(checkIn.id, replyText.trim())
      setCheckIns((prev) => prev.map((ci) =>
        ci.id === checkIn.id ? { ...ci, coach_reply: replyText.trim() } : ci
      ))
      setReplyingTo(null)
      setReplyText('')
    } finally {
      setReplySaving(false)
    }
  }

  useEffect(() => { loadAll() }, [athleteId])

  const handleDeletePlan = async (planId) => {
    if (!confirm('Delete this plan? This cannot be undone.')) return
    await deleteWorkoutPlan(planId)
    setPlans((ps) => ps.filter((p) => p.id !== planId))
  }

  const handleToggleActive = async (plan) => {
    await updateWorkoutPlan(plan.id, { is_active: !plan.is_active })
    setPlans((ps) => ps.map((p) => p.id === plan.id ? { ...p, is_active: !p.is_active } : p))
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!profile) return (
    <div className="p-8 text-center text-dark-400">Mentee not found or access denied.</div>
  )

  const phase = profile.phase || 'offseason'
  const pc = phaseColors[phase] || phaseColors.offseason
  const total = (profile.squat_max || 0) + (profile.bench_max || 0) + (profile.deadlift_max || 0)
  const weightKg = profile.weight_unit === 'lbs' ? (profile.weight || 0) * 0.453592 : (profile.weight || 0)
  const totalKg  = profile.weight_unit === 'lbs' ? total * 0.453592 : total
  const dots     = total > 0 ? calcDOTS(totalKg, weightKg, profile.gender === 'male') : null

  // Recent nutrition avg
  const recentNut = nutrition.slice(0, 7)
  const avgCals = recentNut.length > 0
    ? Math.round(recentNut.reduce((sum, log) => {
        return sum + (log.meals || []).reduce((ms, meal) =>
          ms + (meal.foods || []).reduce((fs, f) => fs + (f.calories || 0), 0), 0)
      }, 0) / recentNut.length)
    : 0

  const latestWeight = weightLog[0]?.weight || profile.weight

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-5">

      {/* Comments Panel */}
      {commentsWorkout && (
        <>
          <div className="fixed inset-0 z-40 bg-dark-950/60" onClick={() => setCommentsWorkout(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-dark-900 border-l border-dark-700 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <div>
                <div className="text-white font-semibold">Comments</div>
                <div className="text-dark-400 text-xs">{format(parseISO(commentsWorkout.date), 'EEEE, MMM d')}</div>
              </div>
              <button onClick={() => setCommentsWorkout(null)} className="text-dark-400 hover:text-white p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {comments.length === 0 && <p className="text-dark-500 text-sm text-center py-8">No comments yet. Leave feedback for this session.</p>}
              {comments.map((c) => (
                <div key={c.id} className={`rounded-xl p-3 ${c.author_id === currentUser.id ? 'bg-purple-600/10 border border-purple-600/20 ml-4' : 'bg-dark-800 border border-dark-700 mr-4'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${c.author?.role === 'coach' ? 'text-purple-400' : 'text-brand-400'}`}>
                      {c.author?.role === 'coach' ? '🎽 ' : ''}{c.author?.name || c.author?.username}
                    </span>
                  </div>
                  <p className="text-white text-sm">{c.body}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-dark-700">
              <div className="flex gap-2">
                <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitComment()}
                  placeholder="Leave feedback…"
                  className="flex-1 bg-dark-800 border border-dark-600 rounded-xl px-3 py-2 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-brand-500" />
                <button onClick={submitComment} disabled={!commentText.trim() || commentSaving}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-xl text-sm disabled:opacity-50 transition-colors">Send</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Nutrition targets modal */}
      {showNutrTargets && (
        <>
          <div className="fixed inset-0 z-40 bg-dark-950/60" onClick={() => setShowNutrTargets(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-semibold">Custom nutrition targets</h3>
                <button onClick={() => setShowNutrTargets(false)} className="text-dark-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[['custom_calories', 'Calories (kcal)'], ['custom_protein', 'Protein (g)'], ['custom_carbs', 'Carbs (g)'], ['custom_fat', 'Fat (g)']].map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-dark-400 text-xs mb-1">{label}</label>
                    <input type="number" value={nutrForm[field]} onChange={(e) => setNutrForm({ ...nutrForm, [field]: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                      placeholder="—" min="0" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNutrTargets(false)} className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 font-semibold py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
                <button onClick={saveNutrTargets} disabled={nutrSaving} className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors">
                  {nutrSaving ? 'Saving…' : 'Save targets'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')}
          className="text-dark-400 hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{profile.name || profile.username}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-dark-400 text-xs">@{profile.username}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${pc.bg} ${pc.border} ${pc.text}`}>
              {phaseLabels[phase]}
            </span>
          </div>
        </div>
        <Link to={`/mentee/${athleteId}/plan`}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">
          <Plus className="w-4 h-4" />New plan
        </Link>
      </div>

      {/* Stats */}
      <Section title="Stats" icon={User}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBadge label="Body weight" value={latestWeight} unit={profile.weight_unit} />
          <StatBadge label="SBD total"   value={total > 0 ? total : null} unit={profile.weight_unit} />
          <StatBadge label="DOTS score"  value={dots} unit="" />
          <StatBadge label="Avg kcal/d"  value={avgCals > 0 ? avgCals : null} unit="kcal" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <StatBadge label="Squat 1RM"    value={profile.squat_max}    unit={profile.weight_unit} />
          <StatBadge label="Bench 1RM"    value={profile.bench_max}    unit={profile.weight_unit} />
          <StatBadge label="Deadlift 1RM" value={profile.deadlift_max} unit={profile.weight_unit} />
        </div>
      </Section>

      {/* Training Plans */}
      <Section
        title="Training plans"
        icon={ClipboardList}
        iconColor="text-brand-400"
        action={
          <Link to={`/mentee/${athleteId}/plan`}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />New
          </Link>
        }
      >
        {plans.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-dark-400 text-sm">No plans created yet.</p>
            <Link to={`/mentee/${athleteId}/plan`}
              className="mt-3 inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300">
              <Plus className="w-4 h-4" />Create first plan
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => {
              const done = planDones[plan.id] || new Set()
              const total = (plan.days || []).length
              const completed = done.size
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0
              return (
                <div key={plan.id} className="border border-dark-700 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-dark-900">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{plan.title}</span>
                        {plan.is_active && (
                          <span className="text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded px-1.5 py-0.5">Active</span>
                        )}
                      </div>
                      <div className="text-dark-400 text-xs mt-0.5">
                        {plan.week_start ? `Week of ${format(parseISO(plan.week_start), 'MMM d')}` : ''}
                        {' · '}{completed}/{total} days logged ({pct}%)
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleActive(plan)}
                        className="text-xs text-dark-400 hover:text-white border border-dark-600 rounded-lg px-2 py-1 transition-colors">
                        {plan.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <Link to={`/mentee/${athleteId}/plan/${plan.id}/view`}
                        className="text-xs text-dark-300 hover:text-white border border-dark-600 rounded-lg px-2 py-1 transition-colors">
                        View
                      </Link>
                      <Link to={`/mentee/${athleteId}/plan/${plan.id}`}
                        className="text-xs text-brand-400 hover:text-brand-300 border border-brand-500/20 rounded-lg px-2 py-1 transition-colors">
                        Edit
                      </Link>
                      <button onClick={() => handleDeletePlan(plan.id)}
                        className="text-dark-500 hover:text-red-400 p-1 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Compliance per day */}
                  {(plan.days || []).length > 0 && (
                    <div className="p-3 space-y-1.5">
                      {plan.days.map((day, idx) => (
                        <ComplianceRow key={day.id || idx} day={day} dayIndex={idx} completed={done.has(idx)} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Recent workouts */}
      <Section title="Recent workouts" icon={Dumbbell} iconColor="text-blue-400">
        {workouts.length === 0 ? (
          <p className="text-dark-400 text-sm text-center py-4">No workouts logged yet.</p>
        ) : (
          <div className="space-y-3">
            {workouts.slice(0, 5).map((w) => {
              const vol = w.exercises?.reduce((v, ex) =>
                v + ex.sets.reduce((sv, s) => sv + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0) || 0
              return (
                <div key={w.id} className="bg-dark-900 rounded-xl border border-dark-700 p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-white text-sm font-medium">{format(parseISO(w.date), 'EEE, MMM d')}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-dark-500 text-xs">{vol > 0 ? `${Math.round(vol).toLocaleString()} ${profile.weight_unit}` : ''}</span>
                      <button onClick={() => openComments(w)}
                        className="flex items-center gap-1 text-xs text-dark-400 hover:text-purple-400 border border-dark-600 hover:border-purple-500/30 rounded-lg px-2 py-1 transition-colors">
                        <MessageSquare className="w-3 h-3" />Comment
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {w.exercises?.map((ex) => {
                      const cc = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.other
                      const top = ex.sets.reduce((best, s) => parseFloat(s.weight) > parseFloat(best.weight || 0) ? s : best, {})
                      return (
                        <span key={ex.id} className={`px-2 py-0.5 rounded-lg border text-xs ${cc}`}>
                          {ex.name}{top.weight ? ` ${top.weight}×${top.reps}` : ''}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {workouts.length > 5 && (
              <p className="text-dark-500 text-xs text-center">+{workouts.length - 5} more sessions</p>
            )}
          </div>
        )}
      </Section>

      {/* Recent nutrition */}
      <Section title="Nutrition (7-day avg)" icon={Apple} iconColor="text-green-400">
        {nutrition.length === 0 ? (
          <p className="text-dark-400 text-sm text-center py-4">No nutrition logs yet.</p>
        ) : (
          <div className="space-y-2">
            {nutrition.slice(0, 7).map((log) => {
              const totals = (log.meals || []).reduce((acc, meal) => {
                ;(meal.foods || []).forEach((f) => {
                  acc.calories += f.calories || 0
                  acc.protein  += f.protein  || 0
                  acc.carbs    += f.carbs    || 0
                  acc.fat      += f.fat      || 0
                })
                return acc
              }, { calories: 0, protein: 0, carbs: 0, fat: 0 })
              const targetCal = profile.target_calories || 2500
              const pct = Math.min(100, Math.round((totals.calories / targetCal) * 100))
              return (
                <div key={log.id} className="flex items-center gap-3 bg-dark-900 rounded-xl border border-dark-700 p-3">
                  <div className="text-dark-400 text-xs w-16 shrink-0">{format(parseISO(log.date), 'EEE d/M')}</div>
                  <div className="flex-1">
                    <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-white text-xs font-medium w-16 text-right shrink-0">{totals.calories} kcal</div>
                  <div className="text-dark-500 text-xs w-20 text-right shrink-0">P:{Math.round(totals.protein)}g C:{Math.round(totals.carbs)}g</div>
                </div>
              )
            })}
            <div className="text-center mt-2 text-dark-400 text-xs">
              7-day avg: <span className="text-white font-medium">{avgCals} kcal/day</span>
              {profile.target_calories ? ` · target ${profile.target_calories} kcal` : ''}
            </div>
          </div>
        )}
      </Section>

      {/* Weight trend */}
      <Section title="Weight trend" icon={Scale} iconColor="text-orange-400">
        {weightLog.length === 0 ? (
          <p className="text-dark-400 text-sm text-center py-4">No weight entries yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weightLog.slice(0, 10).map((entry) => (
              <div key={entry.id} className="bg-dark-900 rounded-xl border border-dark-700 px-3 py-2 text-center min-w-[70px]">
                <div className="text-dark-400 text-xs">{format(parseISO(entry.date), 'MMM d')}</div>
                <div className="text-white font-medium text-sm">{entry.weight}<span className="text-dark-500 text-xs ml-0.5">{profile.weight_unit}</span></div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Personal Records */}
      {prs.length > 0 && (
        <Section title="Personal records" icon={Trophy} iconColor="text-yellow-400">
          <div className="space-y-2">
            {Object.entries(
              prs.reduce((acc, r) => { (acc[r.exercise_name] = acc[r.exercise_name] || []).push(r); return acc }, {})
            ).slice(0, 6).map(([exName, records]) => {
              const best1rm = records.find((r) => r.rep_count === 1)
              const others = records.filter((r) => r.rep_count !== 1).slice(0, 3)
              return (
                <div key={exName} className="flex items-center gap-3 bg-dark-900 rounded-xl border border-dark-700 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{exName}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {best1rm && (
                      <span className="text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg px-2 py-1">
                        1RM: {best1rm.weight} {profile.weight_unit}
                      </span>
                    )}
                    {others.map((r) => (
                      <span key={r.id} className="text-xs text-dark-400 hidden sm:inline">
                        {r.rep_count}RM: {r.weight}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Nutrition targets */}
      <Section
        title="Nutrition targets"
        icon={Target}
        iconColor="text-green-400"
        action={
          <button onClick={() => setShowNutrTargets(true)}
            className="text-xs text-brand-400 hover:text-brand-300 border border-brand-500/20 rounded-lg px-2 py-1 transition-colors">
            Set targets
          </button>
        }
      >
        {enrollment?.custom_calories ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[['Calories', enrollment.custom_calories, 'kcal'], ['Protein', enrollment.custom_protein, 'g'], ['Carbs', enrollment.custom_carbs, 'g'], ['Fat', enrollment.custom_fat, 'g']].map(([label, val, unit]) => (
              <div key={label} className="bg-dark-900 rounded-xl border border-dark-700 p-3 text-center">
                <div className="text-dark-400 text-xs mb-1">{label}</div>
                <div className="text-white font-bold">{val || '—'}<span className="text-dark-500 text-xs ml-0.5">{val ? unit : ''}</span></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-dark-400 text-sm">No custom targets set yet.</p>
            <button onClick={() => setShowNutrTargets(true)} className="mt-2 text-brand-400 hover:text-brand-300 text-sm">Set custom targets →</button>
          </div>
        )}
      </Section>

      {/* Weekly Check-ins */}
      <Section title="Weekly check-ins" icon={ClipboardCheck} iconColor="text-purple-400">
        {checkIns.length === 0 ? (
          <p className="text-dark-400 text-sm text-center py-4">No check-ins submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {checkIns.slice(0, 4).map((ci) => {
              const metrics = [
                { label: 'Energy', val: ci.energy },
                { label: 'Sleep', val: ci.sleep_quality },
                { label: 'Soreness', val: ci.soreness },
                { label: 'Motivation', val: ci.motivation },
              ]
              const avg = metrics.filter((m) => m.val).reduce((s, m) => s + m.val, 0) / metrics.filter((m) => m.val).length
              const statusColor = avg >= 7 ? 'text-green-400' : avg >= 5 ? 'text-yellow-400' : 'text-red-400'
              return (
                <div key={ci.id} className="bg-dark-900 rounded-xl border border-dark-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">
                      Week of {format(parseISO(ci.week_start), 'MMM d')}
                    </span>
                    <span className={`text-xs font-bold ${statusColor}`}>avg {avg.toFixed(1)}/10</span>
                  </div>
                  <div className="flex gap-3 mb-2">
                    {metrics.filter((m) => m.val).map((m) => (
                      <div key={m.label} className="text-center">
                        <div className="text-dark-500 text-xs">{m.label}</div>
                        <div className={`font-bold text-sm ${m.val >= 7 ? 'text-green-400' : m.val >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                  {ci.notes && <p className="text-dark-300 text-xs italic mb-2">"{ci.notes}"</p>}
                  {ci.coach_reply ? (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                      <span className="text-purple-400 text-xs font-semibold">Your reply: </span>
                      <span className="text-dark-300 text-xs">{ci.coach_reply}</span>
                    </div>
                  ) : replyingTo === ci.id ? (
                    <div className="flex gap-2 mt-2">
                      <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Reply to this check-in…"
                        className="flex-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-white text-xs placeholder-dark-500 focus:outline-none focus:border-brand-500" />
                      <button onClick={() => submitReply(ci)} disabled={replySaving || !replyText.trim()}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50">Reply</button>
                      <button onClick={() => setReplyingTo(null)} className="text-dark-400 hover:text-white text-xs px-2">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setReplyingTo(ci.id); setReplyText('') }}
                      className="text-xs text-purple-400 hover:text-purple-300 mt-1">Reply →</button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
