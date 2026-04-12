import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { getSession, getUserById, clearSession, setSession } from '../utils/storage'

const AppContext = createContext(null)

const initialState = {
  currentUser: null,
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

  useEffect(() => {
    const session = getSession()
    if (session?.userId) {
      const user = getUserById(session.userId)
      if (user) {
        dispatch({ type: 'SET_USER', payload: user })
      } else {
        clearSession()
        dispatch({ type: 'DONE_LOADING' })
      }
    } else {
      dispatch({ type: 'DONE_LOADING' })
    }
  }, [])

  const login = (user) => {
    setSession(user.id)
    dispatch({ type: 'SET_USER', payload: user })
  }

  const logout = () => {
    clearSession()
    dispatch({ type: 'LOGOUT' })
  }

  const refreshUser = () => {
    if (state.currentUser) {
      const user = getUserById(state.currentUser.id)
      if (user) dispatch({ type: 'SET_USER', payload: user })
    }
  }

  return (
    <AppContext.Provider value={{ ...state, login, logout, refreshUser, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
