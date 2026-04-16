/**
 * db.js – all Supabase database operations
 * Replaces the old localStorage-based storage.js
 * Every function is async and throws on error.
 */
import { supabase } from './supabase'

// ── Auth ──────────────────────────────────────────────────────────

export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ── Profiles ──────────────────────────────────────────────────────

export async function isUsernameTaken(username) {
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .ilike('username', username)
    .maybeSingle()
  return !!data
}

export async function createProfile(profile) {
  const { error } = await supabase.from('profiles').insert(profile)
  if (error) throw error
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  if (error) throw error
}

// ── Workouts ──────────────────────────────────────────────────────

export async function getWorkouts(userId) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(200)
  if (error) throw error
  return data ?? []
}

export async function addWorkout(workout) {
  const { data, error } = await supabase
    .from('workouts')
    .insert(workout)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWorkout(workoutId, updates) {
  const { error } = await supabase
    .from('workouts')
    .update(updates)
    .eq('id', workoutId)
  if (error) throw error
}

export async function deleteWorkout(workoutId) {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)
  if (error) throw error
}

// ── Nutrition ─────────────────────────────────────────────────────

export async function getNutritionLogs(userId) {
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(365)
  if (error) throw error
  return data ?? []
}

export async function getNutritionByDate(userId, date) {
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveNutritionLog(log) {
  // Upsert on (user_id, date) unique constraint
  const { error } = await supabase
    .from('nutrition_logs')
    .upsert(log, { onConflict: 'user_id,date' })
  if (error) throw error
}

// ── Coaches ───────────────────────────────────────────────────────

export async function getCoaches() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, name, bio, experience_years, is_available, coaching_phases, coaching_weight_classes, coaching_specialties')
    .eq('role', 'coach')
    .order('experience_years', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ── Weight log ────────────────────────────────────────────────────

export async function getWeightLog(userId) {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(365)
  if (error) throw error
  return data ?? []
}

export async function addWeightEntry(entry) {
  const { error } = await supabase
    .from('weight_logs')
    .upsert(entry, { onConflict: 'user_id,date' })
  if (error) throw error
}
