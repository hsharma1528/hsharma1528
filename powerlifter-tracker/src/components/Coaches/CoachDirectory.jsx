import React, { useEffect, useState, useMemo } from 'react'
import { Search, Users, Star, Clock, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { getCoaches } from '../../lib/db'

const ALL_SPECIALTIES = [
  'Raw', 'Equipped', 'Powerbuilding', 'Beginner coaching',
  'Meet preparation', 'Injury rehab', 'Nutrition planning', 'Online coaching',
]

const ALL_PHASES = ['offseason', 'bulk', 'cut', 'meet_prep']
const PHASE_LABELS = { offseason: 'Off-Season', bulk: 'Bulk', cut: 'Cut', meet_prep: 'Meet Prep' }

function CoachCard({ coach }) {
  const [expanded, setExpanded] = useState(false)
  const initials = ((coach.name || coach.username || '?')[0]).toUpperCase()
  const phases = Array.isArray(coach.coaching_phases) ? coach.coaching_phases : []
  const specialties = Array.isArray(coach.coaching_specialties) ? coach.coaching_specialties : []
  const weightClasses = Array.isArray(coach.coaching_weight_classes) ? coach.coaching_weight_classes : []

  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5 flex flex-col gap-4">
      {/* Header row */}
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
              <span key={s} className="px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs">
                {s}
              </span>
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
              <span key={wc} className="px-2 py-1 rounded-lg bg-dark-700 border border-dark-600 text-dark-300 text-xs">
                {wc}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CoachDirectory() {
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [filterPhase, setFilterPhase] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)

  useEffect(() => {
    getCoaches()
      .then(setCoaches)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return coaches.filter((c) => {
      if (availableOnly && !c.is_available) return false
      if (filterSpecialty) {
        const specs = Array.isArray(c.coaching_specialties) ? c.coaching_specialties : []
        if (!specs.includes(filterSpecialty)) return false
      }
      if (filterPhase) {
        const phases = Array.isArray(c.coaching_phases) ? c.coaching_phases : []
        if (!phases.includes(filterPhase)) return false
      }
      if (search) {
        const q = search.toLowerCase()
        const nameMatch = (c.name || '').toLowerCase().includes(q)
        const userMatch = (c.username || '').toLowerCase().includes(q)
        const bioMatch  = (c.bio || '').toLowerCase().includes(q)
        if (!nameMatch && !userMatch && !bioMatch) return false
      }
      return true
    })
  }, [coaches, search, filterSpecialty, filterPhase, availableOnly])

  const selectCls = "bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-sm text-dark-300 focus:outline-none focus:border-brand-500 transition-colors"

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Find a Coach</h1>
        <p className="text-dark-400 text-sm mt-1">Browse coaches on the platform and request coaching</p>
      </div>

      {/* Search + filters */}
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
          <p className="text-dark-500 text-xs">
            {filtered.length} coach{filtered.length !== 1 ? 'es' : ''} found
          </p>
          <div className="grid gap-4">
            {filtered.map((coach) => <CoachCard key={coach.id} coach={coach} />)}
          </div>
        </>
      )}
    </div>
  )
}
