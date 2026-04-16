import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Dumbbell, Apple, TrendingUp, User, LogOut, Menu, X, ChevronRight
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { phaseColors, phaseLabels } from '../../utils/calculations'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/workout', icon: Dumbbell, label: 'Workout' },
  { to: '/nutrition', icon: Apple, label: 'Nutrition' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function Layout() {
  const { currentUser, logout } = useApp()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const phase = currentUser?.phase || 'offseason'
  const pc = phaseColors[phase] || phaseColors.offseason

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinkCls = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
      isActive
        ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
        : 'text-dark-300 hover:bg-dark-700 hover:text-white'
    }`

  return (
    <div className="flex min-h-screen">
      {/* Sidebar – desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-dark-900 border-r border-dark-700 p-4 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow shadow-brand-600/30">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">PowerTrack</span>
        </div>

        {/* Phase badge */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border mb-6 ${pc.bg} ${pc.border}`}>
          <div className={`w-2 h-2 rounded-full ${pc.text.replace('text-', 'bg-')}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${pc.text}`}>
            {phaseLabels[phase]}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={navLinkCls}>
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t border-dark-700 pt-4 mt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand-600/20 border border-brand-600/30 flex items-center justify-center text-brand-400 font-bold text-sm">
              {(currentUser?.name || currentUser?.username || '?')[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-white text-sm font-medium truncate">{currentUser?.name || currentUser?.username}</div>
              <div className="text-dark-400 text-xs truncate">@{currentUser?.username}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-dark-400 hover:bg-dark-700 hover:text-red-400 transition-all text-sm">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-dark-900 border-b border-dark-700 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">PowerTrack</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-dark-300 hover:text-white transition-colors">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-20 bg-dark-950/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-dark-900 border-b border-dark-700 p-4"
            onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border mb-4 ${pc.bg} ${pc.border}`}>
              <div className={`w-2 h-2 rounded-full ${pc.text.replace('text-', 'bg-')}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${pc.text}`}>{phaseLabels[phase]}</span>
            </div>
            <nav className="space-y-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} className={navLinkCls} onClick={() => setMobileOpen(false)}>
                  <Icon className="w-5 h-5 shrink-0" />
                  {label}
                  <ChevronRight className="w-4 h-4 ml-auto text-dark-500" />
                </NavLink>
              ))}
            </nav>
            <button onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-dark-400 hover:bg-dark-700 hover:text-red-400 transition-all text-sm mt-2">
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:overflow-y-auto">
        <div className="pt-14 lg:pt-0 min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
