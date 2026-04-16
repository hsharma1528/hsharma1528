import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/db'

const AppContext = createContext(null)

const initialState = {
  currentUser: null,   // Supabase auth user merged with profile row
  isLoading: true,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload, isLoading: false }
    case 'LOGOUT':
      return { ...state, currentUser: null, isLoading: false }
    case 'UPDATE_USER':
      return { ...state, currentUser: { ...state.currentUser, ...action.payload } }
    case 'DONE_LOADING':
      return { ...state, isLoading: false }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Listen to Supabase auth state – fires on page load and on every sign-in/out
  useEffect(() => {
    let mounted = true

    const loadProfile = async (authUser) => {
      if (!authUser) {
        if (mounted) dispatch({ type: 'LOGOUT' })
        return
      }
      try {
        const profile = await getProfile(authUser.id)
        // Merge auth user with profile so components get one object
        if (mounted) dispatch({ type: 'SET_USER', payload: { ...authUser, ...profile } })
      } catch {
        // Profile doesn't exist yet (shouldn't happen) – still mark loaded
        if (mounted) dispatch({ type: 'DONE_LOADING' })
      }
    }

    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session?.user ?? null)
    })

    // Subscribe to future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        loadProfile(session?.user ?? null)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const logout = () => supabase.auth.signOut()

  // Call after a profile update to keep context in sync
  const refreshUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const profile = await getProfile(user.id)
    dispatch({ type: 'SET_USER', payload: { ...user, ...profile } })
  }

  return (
    <AppContext.Provider value={{ ...state, logout, refreshUser, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
