import React, { useEffect, useState, useMemo } from 'react'
import { Search, Users, Clock, CheckCircle, XCircle, ChevronDown, X, Send } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getCoaches, getMyEnrollments, requestEnrollment, cancelEnrollment, createNotification, sendPushNotification } from '../../lib/db'

const ALL_SPECIALTIES = [
  'Raw', 'Equipped', 'Powerbuilding', 'Beginner coaching',
  'Meet preparation', 'Injury rehab', 'Nutrition planning', 'Online coaching',
]

const ALL_PHASES = ['offseason', 'bulk', 'cut', 'meet_prep']
const PHASE_LABELS = { offseason: 'Off-Season', bulk: 'Bulk', cut: 'Cut', meet_prep: 'Meet Prep' }

function RequestModal({ coach, onClose, onSent }) {
  const { currentUser } = useApp()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)
    try {
      await requestEnrollment(currentUser.id, coach.id, message.trim())
      createNotification(coach.id, 'enrollment_request', `New coaching request from ${currentUser.name || currentUser.username}`, message.trim() || null, '/dashboard').catch(() => {})
      sendPushNotification(coach.id, 'New coaching request', `From ${currentUser.name || currentUser.username}`, '/dashboard').catch(console.error)
      onSent(coach.id)
      onClose()
    } catch (err) {
      if (err.message?.includes('duplicate')) {
        alert('You already have a pending request with this coach.')
      } else {
        alert('Failed to send request: ' + err.message)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/80 backdrop-blur-sm p-4">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-dark-700">
          <div>
            <h3 className="text-white font-semibold">Request coaching</h3>
            <p className="text-dark-400 text-xs mt-0.5">from {coach.name || coach.username}</p>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Message <span className="text-dark-500">(optional)</span></label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 resize-none text-sm"
              rows={3} placeholder="Introduce yourself, your goals, current lifts…" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 font-semibold py-2.5 rounded-xl transition-colors text-sm">
              Cancel
            </button>
            <button onClick={handleSend} disabled={sending}
              className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              <Send className="w-4 h-4" />{sending ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CoachCard({ coach, enrollment, onRequest, onCancel }) {
  const [expanded, setExpanded] = useState(false)
  const initials = ((coach.name || coach.username || '?')[0]).toUpperCase()
  const phases      = Array.isArray(coach.coaching_phases)       ? coach.coaching_phases       : []
  const specialties = Array.isArray(coach.coaching_specialties)  ? coach.coaching_specialties  : []
  const weightClasses = Array.isArray(coach.coaching_weight_classes) ? coach.coaching_weight_classes : []

  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-600/30 flex items-center justify-center font-bold text-lg text-purple-400 shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold">{coach.name || coach.username}</span>
            {coach.is_available
              ? <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-2 py-0.5">
                  <CheckCircle className="w-3 h-3" /> Accepting athletes
                </span>
              : <span className="flex items-center gap-1 text-xs text-dark-500 bg-dark-700 border border-dark-600 rounded-full px-2 py-0.5">
                  <XCircle className="w-3 h-3" /> Full
                </span>
            }
          </div>
          <div className="text-dark-400 text-xs mt-0.5">@{coach.username}</div>
          {coach.experience_years > 0 && (
            <div className="flex items-center gap-1 text-dark-400 text-xs mt-1">
              <Clock className="w-3 h-3" />
              {coach.experience_years} yr{coach.experience_years !== 1 ? 's' : ''} experience
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {coach.bio && (
        <p className={`text-dark-300 text-sm leading-relaxed ${!expanded && 'line-clamp-2'}`}>
          {coach.bio}
        </p>
      )}
      {coach.bio && coach.bio.length > 120 && (
        <button onClick={() => setExpanded(!expanded)}
          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 -mt-2 self-start">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Specialties */}
      {specialties.length > 0 && (
        <div>
          <div className="text-dark-500 text-xs uppercase tracking-wider mb-2">Specialties</div>
          <div className="flex flex-wrap gap-1.5">
            {specialties.map((s) => (
              <span key={s} className="px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Phases */}
      {phases.length > 0 && (
        <div>
          <div className="text-dark-500 text-xs uppercase tracking-wider mb-2">Phases coached</div>
          <div className="flex flex-wrap gap-1.5">
            {phases.map((p) => (
              <span key={p} className="px-2 py-1 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs">
                {PHASE_LABELS[p] || p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weight classes */}
      {weightClasses.length > 0 && (
        <div>
          <div className="text-dark-500 text-xs uppercase tracking-wider mb-2">Weight classes</div>
          <div className="flex flex-wrap gap-1.5">
            {weightClasses.map((wc) => (
              <span key={wc} className="px-2 py-1 rounded-lg bg-dark-700 border border-dark-600 text-dark-300 text-xs">{wc}</span>
            ))}
          </div>
        </div>
      )}

      {/* Enrollment CTA */}
      <div className="border-t border-dark-700 pt-3">
        {!enrollment && coach.is_available && (
          <button onClick={() => onRequest(coach)}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
            Request coaching
          </button>
        )}
        {!enrollment && !coach.is_available && (
          <div className="text-center text-dark-500 text-xs py-1">Not accepting new athletes</div>
        )}
        {enrollment?.status === 'pending' && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-yellow-400 text-sm">
              <Clock className="w-4 h-4" />Request pending
            </span>
            <button onClick={() => onCancel(enrollment.id, coach.id)}
              className="text-dark-500 hover:text-red-400 text-xs transition-colors">
              Cancel
            </button>
          </div>
        )}
        {enrollment?.status === 'accepted' && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />Your coach
            </span>
            <button onClick={() => onCancel(enrollment.id, coach.id)}
              className="text-dark-500 hover:text-red-400 text-xs transition-colors">
              Unenroll
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CoachDirectory() {
  const { currentUser } = useApp()
  const [coaches,        setCoaches]        = useState([])
  const [enrollmentMap,  setEnrollmentMap]  = useState({}) // { coachId: enrollment }
  const [loading,        setLoading]        = useState(true)
  const [modalCoach,     setModalCoach]     = useState(null)
  const [search,         setSearch]         = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [filterPhase,    setFilterPhase]    = useState('')
  const [availableOnly,  setAvailableOnly]  = useState(false)

  useEffect(() => {
    async function load() {
      const [cs, enrs] = await Promise.all([
        getCoaches(),
        getMyEnrollments(currentUser.id),
      ])
      setCoaches(cs)
      const map = {}
      enrs.forEach((e) => { map[e.coach_id] = e })
      setEnrollmentMap(map)
      setLoading(false)
    }
    load().catch(console.error)
  }, [currentUser.id])

  const handleSent = (coachId) => {
    setEnrollmentMap((m) => ({ ...m, [coachId]: { coach_id: coachId, status: 'pending' } }))
  }

  const handleCancel = async (enrollmentId, coachId) => {
    if (!confirm('Cancel this request / unenroll from this coach?')) return
    await cancelEnrollment(enrollmentId)
    setEnrollmentMap((m) => { const nm = { ...m }; delete nm[coachId]; return nm })
  }

  const filtered = useMemo(() => {
    return coaches.filter((c) => {
      if (availableOnly && !c.is_available) return false
      if (filterSpecialty) {
        if (!(Array.isArray(c.coaching_specialties) ? c.coaching_specialties : []).includes(filterSpecialty)) return false
      }
      if (filterPhase) {
        if (!(Array.isArray(c.coaching_phases) ? c.coaching_phases : []).includes(filterPhase)) return false
      }
      if (search) {
        const q = search.toLowerCase()
        if (!(c.name || '').toLowerCase().includes(q) &&
            !(c.username || '').toLowerCase().includes(q) &&
            !(c.bio || '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [coaches, search, filterSpecialty, filterPhase, availableOnly])

  const selectCls = "bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-sm text-dark-300 focus:outline-none focus:border-brand-500 transition-colors"

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      {modalCoach && (
        <RequestModal coach={modalCoach} onClose={() => setModalCoach(null)} onSent={handleSent} />
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">Find a Coach</h1>
        <p className="text-dark-400 text-sm mt-1">Browse coaches on the platform and request coaching</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or keyword…"
            className="w-full bg-dark-900 border border-dark-600 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filterSpecialty} onChange={(e) => setFilterSpecialty(e.target.value)} className={selectCls}>
            <option value="">All specialties</option>
            {ALL_SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterPhase} onChange={(e) => setFilterPhase(e.target.value)} className={selectCls}>
            <option value="">All phases</option>
            {ALL_PHASES.map((p) => <option key={p} value={p}>{PHASE_LABELS[p]}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer select-none">
            <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)}
              className="rounded border-dark-600 bg-dark-900 text-brand-500 focus:ring-brand-500" />
            Available only
          </label>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">
            {coaches.length === 0 ? 'No coaches have registered yet.' : 'No coaches match your filters.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-dark-500 text-xs">{filtered.length} coach{filtered.length !== 1 ? 'es' : ''} found</p>
          <div className="grid gap-4">
            {filtered.map((coach) => (
              <CoachCard
                key={coach.id}
                coach={coach}
                enrollment={enrollmentMap[coach.id]}
                onRequest={setModalCoach}
                onCancel={handleCancel}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
