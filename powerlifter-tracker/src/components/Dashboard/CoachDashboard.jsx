import React from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Users, ClipboardList, TrendingUp, MessageSquare, ChevronRight, Dumbbell, Apple, UserPlus } from 'lucide-react'
import { useApp } from '../../context/AppContext'

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

function StepCard({ number, title, desc, done = false }) {
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
      done ? 'border-green-500/30 bg-green-500/5' : 'border-dark-700 bg-dark-900'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        done ? 'bg-green-500 text-white' : 'bg-dark-700 text-dark-300'
      }`}>
        {done ? '✓' : number}
      </div>
      <div>
        <div className={`font-medium text-sm ${done ? 'text-green-400' : 'text-white'}`}>{title}</div>
        <div className="text-dark-400 text-xs mt-0.5">{desc}</div>
      </div>
    </div>
  )
}

export default function CoachDashboard() {
  const { currentUser } = useApp()

  // These will be real counts once S2–S3 are built
  const stats = {
    mentees:  0,
    pending:  0,
    plans:    0,
    messages: 0,
  }

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
        <StatCard icon={Users}         label="Active mentees"    value={stats.mentees}  accent="purple" />
        <StatCard icon={UserPlus}      label="Pending requests"  value={stats.pending}  accent="blue"   />
        <StatCard icon={ClipboardList} label="Plans created"     value={stats.plans}    accent="green"  />
        <StatCard icon={MessageSquare} label="Unread comments"   value={stats.messages} accent="orange" />
      </div>

      {/* Mentee roster (empty state) */}
      <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Your mentees
          </h2>
          {/* Will link to /mentees once S3 is built */}
        </div>

        <div className="text-center py-10">
          <div className="w-16 h-16 rounded-2xl bg-dark-700 border border-dark-600 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-dark-500" />
          </div>
          <h3 className="text-white font-semibold mb-2">No mentees yet</h3>
          <p className="text-dark-400 text-sm max-w-xs mx-auto">
            Athletes on the platform can search for coaches and send you an enrollment request.
            Once you accept, they'll appear here.
          </p>
        </div>
      </div>

      {/* Two column: quick actions + getting started */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Quick actions */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5">
          <h2 className="font-semibold text-white mb-4">Quick actions</h2>
          <div className="space-y-2">
            {[
              { icon: Users,         label: 'View mentee roster',    sub: 'See all athletes under you',         to: '/mentees',  available: false },
              { icon: ClipboardList, label: 'Create a workout plan',  sub: 'Build a weekly plan for an athlete', to: '/plans',    available: false },
              { icon: Apple,         label: 'Set nutrition targets',  sub: 'Configure macros for an athlete',    to: '/plans',    available: false },
              { icon: TrendingUp,    label: 'View athlete progress',  sub: 'Charts and compliance data',         to: '/progress', available: false },
            ].map(({ icon: Icon, label, sub, to, available }) => (
              <div key={label}
                className="flex items-center gap-3 px-3 py-3 rounded-xl border border-dark-700 bg-dark-900 opacity-50 cursor-not-allowed">
                <div className="w-9 h-9 rounded-xl bg-dark-700 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-dark-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-dark-300 text-sm font-medium">{label}</div>
                  <div className="text-dark-500 text-xs">{sub}</div>
                </div>
                <span className="text-xs text-dark-600 shrink-0">Coming soon</span>
              </div>
            ))}
          </div>
        </div>

        {/* Getting started */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5">
          <h2 className="font-semibold text-white mb-4">Getting started</h2>
          <div className="space-y-3">
            <StepCard number={1} title="Account created" desc="You're registered as a coach on PowerTrack." done />
            <StepCard number={2} title="Complete your coach profile" desc="Add a bio and specialties so athletes can find you. (S2.1)" />
            <StepCard number={3} title="Accept your first mentee" desc="Approve an enrollment request from an athlete. (S2.4)" />
            <StepCard number={4} title="Build a workout plan" desc="Create a weekly training plan for your mentee. (S4.1)" />
          </div>
        </div>

      </div>
    </div>
  )
}
