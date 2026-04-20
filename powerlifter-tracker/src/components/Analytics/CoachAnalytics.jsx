import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, TrendingUp, TrendingDown, CheckCircle, Users, AlertCircle, ChevronRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getCoachAnalytics } from '../../lib/db'
import { format, parseISO } from 'date-fns'

function StatPill({ value, label, color = 'text-white' }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${color}`}>{value ?? '—'}</div>
      <div className="text-dark-400 text-xs">{label}</div>
    </div>
  )
}

function ComplianceBar({ pct }) {
  if (pct == null) return <span className="text-dark-500 text-xs">No plans</span>
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-white font-medium w-8 text-right">{pct}%</span>
    </div>
  )
}

function CheckInBadge({ avg }) {
  if (avg == null) return <span className="text-dark-500 text-xs">No data</span>
  const color = avg >= 7 ? 'text-green-400' : avg >= 5 ? 'text-yellow-400' : 'text-red-400'
  return <span className={`text-sm font-bold ${color}`}>{avg.toFixed(1)}<span className="text-dark-500 text-xs font-normal">/10</span></span>
}

export default function CoachAnalytics() {
  const { currentUser } = useApp()
  const [analytics, setAnalytics] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    getCoachAnalytics(currentUser.id)
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [currentUser.id])

  const avgCompliance = (() => {
    const valid = analytics.filter((a) => a.complianceRate != null)
    if (!valid.length) return null
    return Math.round(valid.reduce((s, a) => s + a.complianceRate, 0) / valid.length)
  })()

  const avgCheckIn = (() => {
    const valid = analytics.filter((a) => a.avgCheckIn != null)
    if (!valid.length) return null
    return (valid.reduce((s, a) => s + a.avgCheckIn, 0) / valid.length).toFixed(1)
  })()

  const atRisk = analytics.filter((a) => (a.complianceRate ?? 100) < 50 || (a.avgCheckIn ?? 10) < 5).length

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-brand-400" />Coach Analytics
        </h1>
        <p className="text-dark-400 text-sm mt-0.5">Aggregate view across all your mentees.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : analytics.length === 0 ? (
        <div className="text-center py-16 bg-dark-800 rounded-2xl border border-dark-700">
          <Users className="w-10 h-10 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">No mentees yet. Accept enrollment requests to see analytics.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Users,       label: 'Total mentees',       value: analytics.length,                         accent: 'text-brand-400 bg-brand-500/10' },
              { icon: CheckCircle, label: 'Avg compliance',      value: avgCompliance != null ? `${avgCompliance}%` : '—', accent: 'text-green-400 bg-green-500/10' },
              { icon: BarChart2,   label: 'Avg check-in score',  value: avgCheckIn ?? '—',                        accent: 'text-purple-400 bg-purple-500/10' },
              { icon: AlertCircle, label: 'At risk (< 50%)',     value: atRisk,                                   accent: atRisk > 0 ? 'text-red-400 bg-red-500/10' : 'text-dark-400 bg-dark-700' },
            ].map(({ icon: Icon, label, value, accent }) => (
              <div key={label} className="bg-dark-800 rounded-2xl border border-dark-700 p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-dark-400 text-sm">{label}</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{value}</div>
              </div>
            ))}
          </div>

          {/* Per-mentee table */}
          <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <div className="p-4 border-b border-dark-700">
              <h2 className="text-white font-semibold text-sm">Mentee breakdown</h2>
            </div>
            <div className="divide-y divide-dark-700">
              {analytics.map(({ mentee, complianceRate, avgCheckIn: ci, weightChange, weightUnit, lastCheckIn, activePlanCount }) => {
                const athlete = mentee.athlete || {}
                const name    = athlete.name || athlete.username || 'Athlete'
                const initials = name[0].toUpperCase()
                const isAtRisk = (complianceRate ?? 100) < 50 || (ci ?? 10) < 5
                return (
                  <Link key={mentee.athlete_id} to={`/mentee/${mentee.athlete_id}`}
                    className="flex items-center gap-4 p-4 hover:bg-dark-700/50 transition-colors">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 ${
                      isAtRisk ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-dark-600 bg-dark-700 text-dark-300'
                    }`}>
                      {athlete.avatar_url ? <img src={athlete.avatar_url} className="w-full h-full rounded-full object-cover" alt="" /> : initials}
                    </div>

                    {/* Name */}
                    <div className="w-28 shrink-0 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{name}</div>
                      <div className="text-dark-400 text-xs">@{athlete.username}</div>
                    </div>

                    {/* Compliance */}
                    <div className="flex-1 min-w-0">
                      <div className="text-dark-500 text-xs mb-1">Compliance ({activePlanCount} active plan{activePlanCount !== 1 ? 's' : ''})</div>
                      <ComplianceBar pct={complianceRate} />
                    </div>

                    {/* Check-in */}
                    <div className="w-20 text-center shrink-0">
                      <div className="text-dark-500 text-xs mb-1">Check-in</div>
                      <CheckInBadge avg={ci} />
                    </div>

                    {/* Weight */}
                    <div className="w-24 text-right shrink-0 hidden lg:block">
                      <div className="text-dark-500 text-xs mb-1">Weight Δ</div>
                      {weightChange != null ? (
                        <span className={`text-sm font-medium flex items-center justify-end gap-1 ${
                          weightChange < 0 ? 'text-blue-400' : weightChange > 0 ? 'text-orange-400' : 'text-dark-400'
                        }`}>
                          {weightChange > 0 ? <TrendingUp className="w-3 h-3" /> : weightChange < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                          {weightChange > 0 ? '+' : ''}{weightChange} {weightUnit}
                        </span>
                      ) : (
                        <span className="text-dark-500 text-xs">No data</span>
                      )}
                    </div>

                    {/* Last check-in */}
                    <div className="w-20 text-right shrink-0 hidden lg:block">
                      <div className="text-dark-500 text-xs mb-1">Last check-in</div>
                      <span className="text-dark-300 text-xs">
                        {lastCheckIn ? format(parseISO(lastCheckIn.week_start), 'MMM d') : '—'}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-dark-500 shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
