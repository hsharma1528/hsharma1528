import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  Users, ClipboardList, TrendingUp, UserPlus, CheckCircle, XCircle,
  ChevronRight, Clock, Dumbbell
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getEnrollmentRequests, updateEnrollmentStatus, getMentees, createNotification } from '../../lib/db'
import { phaseLabels, phaseColors } from '../../utils/calculations'

function StatCard({ icon: Icon, label, value, accent }) {
  const colors = {
    purple: 'text-purple-400 bg-purple-500/10',
    blue:   'text-blue-400 bg-blue-500/10',
    green:  'text-green-400 bg-green-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
  }
  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-dark-400 text-sm">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  )
}

function RequestCard({ req, onAccept, onDecline }) {
  const { currentUser } = useApp()
  const [busy, setBusy] = useState(false)
  const ath = req.athlete || {}

  const act = async (status) => {
    setBusy(true)
    try {
      await updateEnrollmentStatus(req.id, status)
      onAccept(req.id, status)
      const coachName = currentUser.name || currentUser.username
      if (status === 'accepted') {
        createNotification(
          req.athlete_id,
          'enrollment_accepted',
          'Your coaching request was accepted!',
          `${coachName} is now your coach.`,
          '/profile'
        ).catch(() => {})
      } else {
        createNotification(
          req.athlete_id,
          'enrollment_declined',
          'Coaching request update',
          'Your request was not accepted at this time.',
          '/coaches'
        ).catch(() => {})
      }
    } finally {
      setBusy(false)
    }
  }

  const phase = ath.phase || 'offseason'
  const pc = phaseColors[phase] || phaseColors.offseason
  const total = (ath.squat_max || 0) + (ath.bench_max || 0) + (ath.deadlift_max || 0)

  return (
    <div className="bg-dark-900 rounded-xl border border-dark-700 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-600/20 border border-brand-600/30 flex items-center justify-center font-bold text-sm text-brand-400 shrink-0">
          {((ath.name || ath.username || '?')[0]).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white text-sm font-medium">{ath.name || ath.username}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${pc.bg} ${pc.border} ${pc.text}`}>
              {phaseLabels[phase]}
            </span>
          </div>
          <div className="text-dark-400 text-xs mt-0.5">@{ath.username}</div>
          {total > 0 && (
            <div className="text-dark-500 text-xs mt-1">
              SBD: {ath.squat_max}/{ath.bench_max}/{ath.deadlift_max} {ath.weight_unit}
            </div>
          )}
          {req.message && (
            <p className="text-dark-300 text-xs mt-2 italic bg-dark-800 rounded-lg px-2 py-1.5">"{req.message}"</p>
          )}
          <div className="flex items-center gap-1.5 mt-1 text-dark-600 text-xs">
            <Clock className="w-3 h-3" />
            {format(parseISO(req.created_at), 'MMM d, yyyy')}
          </div>
        </div>
      </div>
      {req.status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button onClick={() => act('declined')} disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dark-600 bg-dark-800 text-dark-300 hover:text-red-400 hover:border-red-500/30 text-xs font-medium transition-colors disabled:opacity-50">
            <XCircle className="w-4 h-4" />Decline
          </button>
          <button onClick={() => act('accepted')} disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors disabled:opacity-50">
            <CheckCircle className="w-4 h-4" />Accept
          </button>
        </div>
      )}
      {req.status === 'accepted' && (
        <div className="mt-3 flex items-center gap-1.5 text-green-400 text-xs">
          <CheckCircle className="w-3.5 h-3.5" />Accepted
        </div>
      )}
      {req.status === 'declined' && (
        <div className="mt-3 flex items-center gap-1.5 text-dark-500 text-xs">
          <XCircle className="w-3.5 h-3.5" />Declined
        </div>
      )}
    </div>
  )
}

function MenteeRow({ enrollment }) {
  const ath = enrollment.athlete || {}
  const phase = ath.phase || 'offseason'
  const pc = phaseColors[phase] || phaseColors.offseason
  const total = (ath.squat_max || 0) + (ath.bench_max || 0) + (ath.deadlift_max || 0)

  return (
    <Link to={`/mentee/${ath.id}`}
      className="flex items-center gap-3 p-3 rounded-xl bg-dark-900 border border-dark-700 hover:border-dark-500 transition-colors">
      <div className="w-9 h-9 rounded-full bg-brand-600/20 border border-brand-600/30 flex items-center justify-center font-bold text-sm text-brand-400 shrink-0">
        {((ath.name || ath.username || '?')[0]).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium">{ath.name || ath.username}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded border ${pc.bg} ${pc.border} ${pc.text}`}>
            {phaseLabels[phase]}
          </span>
          {total > 0 && <span className="text-dark-500 text-xs">Total: {total} {ath.weight_unit}</span>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-dark-500 shrink-0" />
    </Link>
  )
}

export default function CoachDashboard() {
  const { currentUser } = useApp()

  const [requests, setRequests] = useState([])
  const [mentees,  setMentees]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [reqs, ms] = await Promise.all([
          getEnrollmentRequests(currentUser.id),
          getMentees(currentUser.id),
        ])
        setRequests(reqs)
        setMentees(ms)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentUser.id])

  const handleStatusChange = (id, newStatus) => {
    setRequests((rs) => rs.map((r) => r.id === id ? { ...r, status: newStatus } : r))
    if (newStatus === 'accepted') {
      // Reload mentees to get the new one
      getMentees(currentUser.id).then(setMentees).catch(console.error)
    }
  }

  const pending = requests.filter((r) => r.status === 'pending')
  const firstName = (currentUser.name || currentUser.username || 'Coach').split(' ')[0]

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hey, {firstName} 👋</h1>
          <p className="text-dark-400 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-purple-500/10 border-purple-500/30">
          <div className="w-2 h-2 rounded-full bg-purple-400" />
          <span className="text-sm font-semibold text-purple-400">Coach</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}         label="Active mentees"    value={loading ? '…' : mentees.length}  accent="purple" />
        <StatCard icon={UserPlus}      label="Pending requests"  value={loading ? '…' : pending.length}  accent="blue"   />
        <StatCard icon={ClipboardList} label="Your profile"       value={currentUser.is_available ? 'Open' : 'Closed'} accent="green" />
        <StatCard icon={TrendingUp}    label="Total coached"      value={loading ? '…' : requests.filter((r) => r.status === 'accepted').length} accent="orange" />
      </div>

      {/* Pending requests */}
      {!loading && pending.length > 0 && (
        <div className="bg-dark-800 rounded-2xl border border-blue-500/20 p-6">
          <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-blue-400" />
            Enrollment requests
            <span className="ml-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {pending.length}
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pending.map((req) => (
              <RequestCard key={req.id} req={req} onAccept={handleStatusChange} onDecline={handleStatusChange} />
            ))}
          </div>
        </div>
      )}

      {/* Past requests (accepted/declined) */}
      {!loading && requests.filter((r) => r.status !== 'pending').length > 0 && (
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
          <h2 className="font-semibold text-white flex items-center gap-2 mb-4 text-sm">
            <Clock className="w-4 h-4 text-dark-400" />Past requests
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {requests.filter((r) => r.status !== 'pending').map((req) => (
              <RequestCard key={req.id} req={req} onAccept={handleStatusChange} onDecline={handleStatusChange} />
            ))}
          </div>
        </div>
      )}

      {/* Mentee roster */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Your mentees
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : mentees.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-dark-700 border border-dark-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-dark-500" />
            </div>
            <h3 className="text-white font-semibold mb-1 text-sm">No mentees yet</h3>
            <p className="text-dark-400 text-xs max-w-xs mx-auto">
              Athletes can find and request you from the coach directory. Accept a request to add them here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {mentees.map((enrollment) => (
              <MenteeRow key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
