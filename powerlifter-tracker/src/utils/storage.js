// LocalStorage helpers with namespaced keys

const NS = 'pt_'

export const storage = {
  get: (key) => {
    try {
      const val = localStorage.getItem(NS + key)
      return val ? JSON.parse(val) : null
    } catch {
      return null
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value))
    } catch {
      console.error('Storage write failed', key)
    }
  },
  remove: (key) => localStorage.removeItem(NS + key),
}

// ── Users ──────────────────────────────────────────────
export const getUsers = () => storage.get('users') || []
export const saveUsers = (users) => storage.set('users', users)

export const getUserByUsername = (username) =>
  getUsers().find((u) => u.username.toLowerCase() === username.toLowerCase())

export const createUser = (userData) => {
  const users = getUsers()
  users.push(userData)
  saveUsers(users)
}

export const updateUser = (userId, updates) => {
  const users = getUsers()
  const idx = users.findIndex((u) => u.id === userId)
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updates }
    saveUsers(users)
  }
}

export const getUserById = (id) => getUsers().find((u) => u.id === id)

// ── Session ────────────────────────────────────────────
export const getSession = () => storage.get('session')
export const setSession = (userId) => storage.set('session', { userId })
export const clearSession = () => storage.remove('session')

// ── Workouts ───────────────────────────────────────────
export const getWorkouts = (userId) =>
  (storage.get(`workouts_${userId}`) || []).sort((a, b) =>
    b.date.localeCompare(a.date)
  )

export const saveWorkouts = (userId, workouts) =>
  storage.set(`workouts_${userId}`, workouts)

export const addWorkout = (userId, workout) => {
  const workouts = storage.get(`workouts_${userId}`) || []
  workouts.push(workout)
  storage.set(`workouts_${userId}`, workouts)
}

export const updateWorkout = (userId, workoutId, updates) => {
  const workouts = storage.get(`workouts_${userId}`) || []
  const idx = workouts.findIndex((w) => w.id === workoutId)
  if (idx !== -1) {
    workouts[idx] = { ...workouts[idx], ...updates }
    storage.set(`workouts_${userId}`, workouts)
  }
}

export const deleteWorkout = (userId, workoutId) => {
  const workouts = (storage.get(`workouts_${userId}`) || []).filter(
    (w) => w.id !== workoutId
  )
  storage.set(`workouts_${userId}`, workouts)
}

// ── Nutrition ──────────────────────────────────────────
export const getNutritionLogs = (userId) =>
  (storage.get(`nutrition_${userId}`) || []).sort((a, b) =>
    b.date.localeCompare(a.date)
  )

export const getNutritionByDate = (userId, date) =>
  (storage.get(`nutrition_${userId}`) || []).find((n) => n.date === date)

export const saveNutritionLog = (userId, log) => {
  const logs = storage.get(`nutrition_${userId}`) || []
  const idx = logs.findIndex((l) => l.date === log.date)
  if (idx !== -1) {
    logs[idx] = log
  } else {
    logs.push(log)
  }
  storage.set(`nutrition_${userId}`, logs)
}

// ── Weight Log ─────────────────────────────────────────
export const getWeightLog = (userId) =>
  (storage.get(`weights_${userId}`) || []).sort((a, b) =>
    b.date.localeCompare(a.date)
  )

export const addWeightEntry = (userId, entry) => {
  const log = storage.get(`weights_${userId}`) || []
  const idx = log.findIndex((e) => e.date === entry.date)
  if (idx !== -1) {
    log[idx] = entry
  } else {
    log.push(entry)
  }
  storage.set(`weights_${userId}`, log)
}
