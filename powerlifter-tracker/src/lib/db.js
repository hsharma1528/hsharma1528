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

// ── Coach enrollments ─────────────────────────────────────────────

export async function requestEnrollment(athleteId, coachId, message = '') {
  const { error } = await supabase
    .from('coach_enrollments')
    .insert({ athlete_id: athleteId, coach_id: coachId, message })
  if (error) throw error
}

export async function getMyEnrollments(athleteId) {
  const { data, error } = await supabase
    .from('coach_enrollments')
    .select('*, coach:coach_id(id, username, name, bio, experience_years, coaching_specialties, is_available)')
    .eq('athlete_id', athleteId)
    .neq('status', 'declined')
  if (error) throw error
  return data ?? []
}

export async function cancelEnrollment(enrollmentId) {
  const { error } = await supabase.from('coach_enrollments').delete().eq('id', enrollmentId)
  if (error) throw error
}

export async function getEnrollmentRequests(coachId) {
  const { data, error } = await supabase
    .from('coach_enrollments')
    .select('*, athlete:athlete_id(id, username, name, weight, weight_unit, phase, squat_max, bench_max, deadlift_max)')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateEnrollmentStatus(enrollmentId, status) {
  const { error } = await supabase
    .from('coach_enrollments')
    .update({ status })
    .eq('id', enrollmentId)
  if (error) throw error
}

export async function getMentees(coachId) {
  const { data, error } = await supabase
    .from('coach_enrollments')
    .select('*, athlete:athlete_id(id, username, name, weight, weight_unit, phase, squat_max, bench_max, deadlift_max, target_calories, target_protein)')
    .eq('coach_id', coachId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getMenteeProfile(athleteId) {
  return getProfile(athleteId)
}

export async function getMenteeWorkouts(athleteId) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', athleteId)
    .order('date', { ascending: false })
    .limit(20)
  if (error) throw error
  return data ?? []
}

export async function getMenteeNutrition(athleteId) {
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('user_id', athleteId)
    .order('date', { ascending: false })
    .limit(14)
  if (error) throw error
  return data ?? []
}

export async function getMenteeWeightLog(athleteId) {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', athleteId)
    .order('date', { ascending: false })
    .limit(30)
  if (error) throw error
  return data ?? []
}

// ── Workout plans ─────────────────────────────────────────────────

export async function createWorkoutPlan(plan) {
  const { data, error } = await supabase
    .from('workout_plans')
    .insert(plan)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWorkoutPlan(planId, updates) {
  const { error } = await supabase
    .from('workout_plans')
    .update(updates)
    .eq('id', planId)
  if (error) throw error
}

export async function deleteWorkoutPlan(planId) {
  const { error } = await supabase.from('workout_plans').delete().eq('id', planId)
  if (error) throw error
}

export async function getWorkoutPlansForMentee(coachId, athleteId) {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('coach_id', coachId)
    .eq('athlete_id', athleteId)
    .order('week_start', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getPlan(planId) {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('id', planId)
    .single()
  if (error) throw error
  return data
}

export async function getActivePlan(athleteId) {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('is_active', true)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getPlanWorkouts(planId) {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, date, plan_day_index, exercises')
    .eq('plan_id', planId)
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

// ── Notifications ─────────────────────────────────────────────────

export async function createNotification(userId, type, title, body = null, link = null) {
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, title, body, link })
  if (error) throw error
}

export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data ?? []
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
  if (error) throw error
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw error
}

export async function getUnreadCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw error
  return count ?? 0
}

// ── Personal Records ───────────────────────────────────────────────

export async function getPersonalRecords(userId) {
  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .order('exercise_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function upsertPersonalRecord(record) {
  // record: { user_id, exercise_name, rep_count, weight, workout_id, achieved_date }
  const { data, error } = await supabase
    .from('personal_records')
    .upsert(record, { onConflict: 'user_id,exercise_name,rep_count' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function checkAndUpsertPR(userId, exerciseName, repCount, weight, workoutId, date) {
  // Returns { isPR: bool, record } — only upserts if this is a new best
  const { data: existing } = await supabase
    .from('personal_records')
    .select('weight')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .eq('rep_count', repCount)
    .maybeSingle()

  if (existing && existing.weight >= weight) return { isPR: false, record: existing }

  const record = await upsertPersonalRecord({
    user_id: userId, exercise_name: exerciseName, rep_count: repCount,
    weight, workout_id: workoutId, achieved_date: date,
  })
  return { isPR: true, record }
}

// ── Workout Comments ───────────────────────────────────────────────

export async function getWorkoutComments(workoutId) {
  const { data, error } = await supabase
    .from('workout_comments')
    .select('*, author:author_id(id, name, username, role)')
    .eq('workout_id', workoutId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addWorkoutComment(workoutId, authorId, body) {
  const { data, error } = await supabase
    .from('workout_comments')
    .insert({ workout_id: workoutId, author_id: authorId, body })
    .select('*, author:author_id(id, name, username, role)')
    .single()
  if (error) throw error
  return data
}

export async function deleteWorkoutComment(commentId) {
  const { error } = await supabase
    .from('workout_comments')
    .delete()
    .eq('id', commentId)
  if (error) throw error
}

// ── Check-ins ──────────────────────────────────────────────────────

export async function upsertCheckIn(checkIn) {
  // checkIn: { user_id, week_start, energy, sleep_quality, soreness, motivation, notes }
  const { data, error } = await supabase
    .from('check_ins')
    .upsert(checkIn, { onConflict: 'user_id,week_start' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getCheckIns(userId, limit = 12) {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getLatestCheckIn(userId) {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateCheckInReply(checkInId, coachReply) {
  const { error } = await supabase
    .from('check_ins')
    .update({ coach_reply: coachReply })
    .eq('id', checkInId)
  if (error) throw error
}

// ── Coach Nutrition Targets ────────────────────────────────────────

export async function setMenteeNutritionTargets(coachId, athleteId, targets) {
  // targets: { custom_calories, custom_protein, custom_carbs, custom_fat }
  const { error } = await supabase
    .from('coach_enrollments')
    .update(targets)
    .eq('coach_id', coachId)
    .eq('athlete_id', athleteId)
    .eq('status', 'accepted')
  if (error) throw error
}

export async function getMenteeEnrollment(coachId, athleteId) {
  const { data, error } = await supabase
    .from('coach_enrollments')
    .select('*')
    .eq('coach_id', coachId)
    .eq('athlete_id', athleteId)
    .eq('status', 'accepted')
    .maybeSingle()
  if (error) throw error
  return data
}
