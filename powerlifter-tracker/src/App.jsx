import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { supabase } from './lib/supabase'
import { createProfile } from './lib/db'
import Layout from './components/Layout/Layout'
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import Dashboard from './components/Dashboard/Dashboard'
import WorkoutLog from './components/Workout/WorkoutLog'
import NutritionLog from './components/Nutrition/NutritionLog'
import Profile from './components/Profile/Profile'
import Progress from './components/Progress/Progress'

/**
 * After email confirmation Supabase redirects back here.
 * If there's a pending profile in localStorage (set by Register.jsx when email
 * confirmation was required), create it now and clear the pending data.
 */
function EmailConfirmHandler() {
  const navigate = useNavigate()
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const pending = localStorage.getItem('pt_pending_profile')
        if (pending) {
          try {
            const profile = JSON.parse(pending)
            profile.id = session.user.id   // make sure ID matches confirmed user
            await createProfile(profile)
          } catch {
            // Profile may already exist — ignore
          }
          localStorage.removeItem('pt_pending_profile')
          navigate('/dashboard', { replace: true })
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])
  return null
}

function ProtectedRoute({ children }) {
  const { currentUser, isLoading } = useApp()
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!currentUser) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { currentUser, isLoading } = useApp()
  if (isLoading) return null
  if (currentUser) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <>
    <EmailConfirmHandler />
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="workout" element={<WorkoutLog />} />
        <Route path="nutrition" element={<NutritionLog />} />
        <Route path="progress" element={<Progress />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
