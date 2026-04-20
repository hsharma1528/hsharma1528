/**
 * db.js – all Supabase database operations
 * Every function is async and throws on error.
 */
import { supabase } from './supabase'

// ── Avatar upload (Supabase Storage) ──────────────────────────────
export async function uploadAvatar(userId, file) {
  const ext  = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

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

// ── Training Blocks ────────────────────────────────────────────────

export async function createTrainingBlock(block) {
  const { data, error } = await supabase
    .from('training_blocks')
    .insert(block)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getTrainingBlocks(coachId, athleteId) {
  const { data, error } = await supabase
    .from('training_blocks')
    .select('*')
    .eq('coach_id', coachId)
    .eq('athlete_id', athleteId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateTrainingBlock(blockId, updates) {
  const { error } = await supabase
    .from('training_blocks')
    .update(updates)
    .eq('id', blockId)
  if (error) throw error
}

export async function deleteTrainingBlock(blockId) {
  const { error } = await supabase
    .from('training_blocks')
    .delete()
    .eq('id', blockId)
  if (error) throw error
}

// ── Plan Templates ─────────────────────────────────────────────────

export async function getTemplates(coachId) {
  const { data, error } = await supabase
    .from('plan_templates')
    .select('*')
    .or(`coach_id.eq.${coachId},is_system.eq.true`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createTemplate(template) {
  const { data, error } = await supabase
    .from('plan_templates')
    .insert(template)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTemplate(templateId) {
  const { error } = await supabase
    .from('plan_templates')
    .delete()
    .eq('id', templateId)
  if (error) throw error
}

// Resolve percentage-based weights using athlete 1RMs, then create a plan
export async function applyTemplate(template, { coachId, athleteId, weekStart, athleteProfile }) {
  const unit = athleteProfile?.weight_unit || 'kg'
  const maxMap = {
    squat:    parseFloat(athleteProfile?.squat_max)    || 0,
    bench:    parseFloat(athleteProfile?.bench_max)    || 0,
    deadlift: parseFloat(athleteProfile?.deadlift_max) || 0,
  }

  const resolvedDays = (template.days || []).map((day) => ({
    ...day,
    exercises: (day.exercises || []).map((ex) => {
      const match = /^(\d+(?:\.\d+)?)%$/.exec((ex.target_weight || '').trim())
      if (!match) return ex
      const pct = parseFloat(match[1])
      const onerm = maxMap[ex.category] || 0
      if (!onerm) return ex
      const resolved = Math.round((onerm * pct) / 100 / 2.5) * 2.5
      return {
        ...ex,
        target_weight: String(resolved),
        notes: ex.notes
          ? `${ex.notes} (${pct}% of ${onerm} ${unit})`
          : `${pct}% of ${onerm} ${unit}`,
      }
    }),
  }))

  return createWorkoutPlan({
    coach_id:   coachId,
    athlete_id: athleteId,
    title:      template.title,
    week_start: weekStart,
    is_active:  false,
    days:       resolvedDays,
  })
}

// ── Coach custom exercises (Epic 15) ──────────────────────────────

export async function getCoachExercises(coachId) {
  const { data, error } = await supabase
    .from('coach_exercises')
    .select('*')
    .eq('coach_id', coachId)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createCoachExercise(exercise) {
  const { data, error } = await supabase
    .from('coach_exercises')
    .insert(exercise)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCoachExercise(id) {
  const { error } = await supabase.from('coach_exercises').delete().eq('id', id)
  if (error) throw error
}

// ── Block templates (Epic 9) ───────────────────────────────────────

export async function getBlockTemplates(coachId) {
  const { data, error } = await supabase
    .from('block_templates')
    .select('*')
    .or(`coach_id.eq.${coachId},is_system.eq.true`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createBlockTemplate(template) {
  const { data, error } = await supabase
    .from('block_templates')
    .insert(template)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBlockTemplate(id) {
  const { error } = await supabase.from('block_templates').delete().eq('id', id)
  if (error) throw error
}

// Apply a block template: creates the block record + all weekly plans
export async function applyBlockTemplate(template, { coachId, athleteId, blockStartDate }) {
  const addDays = (dateStr, days) => {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  const block = await createTrainingBlock({
    coach_id:        coachId,
    athlete_id:      athleteId,
    label:           template.title,
    goal_squat:      template.goal_squat      || null,
    goal_bench:      template.goal_bench      || null,
    goal_deadlift:   template.goal_deadlift   || null,
    goal_bodyweight: template.goal_bodyweight || null,
    goal_notes:      template.goal_notes      || null,
    start_date:      blockStartDate,
    end_date:        template.duration_weeks
      ? addDays(blockStartDate, template.duration_weeks * 7 - 1)
      : null,
  })

  await Promise.all((template.plans || []).map((planTpl) =>
    createWorkoutPlan({
      coach_id:   coachId,
      athlete_id: athleteId,
      block_id:   block.id,
      title:      planTpl.title,
      week_start: addDays(blockStartDate, (planTpl.week_offset || 0) * 7),
      is_active:  false,
      days:       planTpl.days || [],
    })
  ))

  return block
}

// ── Public programs (Epic 13) ──────────────────────────────────────

export async function getPublicTemplates() {
  const { data, error } = await supabase
    .from('plan_templates')
    .select('*, coach:coach_id(id, name, username)')
    .eq('is_public', true)
    .eq('is_paid', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getProgramSubscriptions(athleteId) {
  const { data, error } = await supabase
    .from('program_subscriptions')
    .select('template_id')
    .eq('athlete_id', athleteId)
  if (error) throw error
  return new Set((data ?? []).map((r) => r.template_id))
}

export async function subscribeToProgram(athleteId, template) {
  const weekStart = new Date().toISOString().split('T')[0]
  await createWorkoutPlan({
    coach_id:   athleteId, // self-coached
    athlete_id: athleteId,
    title:      template.title,
    week_start: weekStart,
    is_active:  true,
    days:       template.days || [],
  })
  const { error } = await supabase
    .from('program_subscriptions')
    .upsert({ athlete_id: athleteId, template_id: template.id }, { onConflict: 'athlete_id,template_id' })
  if (error) throw error
}

// ── Marketplace / paid programs (Epic 18) ─────────────────────────

export async function getPaidTemplates() {
  const { data, error } = await supabase
    .from('plan_templates')
    .select('*, coach:coach_id(id, name, username, bio, experience_years)')
    .eq('is_paid', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getPurchasedTemplates(athleteId) {
  const { data, error } = await supabase
    .from('plan_purchases')
    .select('*, template:template_id(*)')
    .eq('athlete_id', athleteId)
    .order('purchased_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function recordPurchase(athleteId, templateId, amountCents = 0, stripeSessionId = null) {
  const { error } = await supabase
    .from('plan_purchases')
    .upsert({ athlete_id: athleteId, template_id: templateId, amount_cents: amountCents, stripe_session_id: stripeSessionId },
      { onConflict: 'athlete_id,template_id' })
  if (error) throw error
}

export async function getTemplatePurchasers(templateId) {
  const { data, error } = await supabase
    .from('plan_purchases')
    .select('*, athlete:athlete_id(id, name, username, squat_max, bench_max, deadlift_max, weight, weight_unit)')
    .eq('template_id', templateId)
    .order('purchased_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// Call Supabase Edge Function to create Stripe Checkout session
export async function createStripeCheckout(templateId, priceId, athleteId) {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: {
      templateId,
      priceId,
      athleteId,
      successUrl: `${window.location.origin}/marketplace?success=1&template=${templateId}`,
      cancelUrl:  `${window.location.origin}/marketplace`,
    },
  })
  if (error) throw error
  return data
}

// ── In-app messaging (Epic 17) ────────────────────────────────────

export async function getMessages(userId1, userId2) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:sender_id(id, name, username, avatar_url, role)')
    .or(`and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) throw error
  return data ?? []
}

export async function sendMessage(senderId, recipientId, body) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, body })
    .select('*, sender:sender_id(id, name, username, avatar_url, role)')
    .single()
  if (error) throw error
  return data
}

export async function getUnreadMessageCount(userId) {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

export async function markMessagesRead(userId, senderId) {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .eq('sender_id', senderId)
    .is('read_at', null)
  if (error) throw error
}

// ── Coach analytics (Epic 11) ─────────────────────────────────────

export async function getCoachAnalytics(coachId) {
  const mentees = await getMentees(coachId)
  const analytics = await Promise.all(mentees.map(async (m) => {
    const athleteId = m.athlete_id
    const [plans, checkIns, wl] = await Promise.all([
      getWorkoutPlansForMentee(coachId, athleteId),
      getCheckIns(athleteId, 8).catch(() => []),
      getMenteeWeightLog(athleteId).catch(() => []),
    ])

    let totalDays = 0, completedDays = 0
    await Promise.all(plans.slice(0, 6).map(async (plan) => {
      const ws = await getPlanWorkouts(plan.id)
      totalDays    += (plan.days || []).length
      completedDays += new Set(ws.map((w) => w.plan_day_index).filter((i) => i != null)).size
    }))

    const complianceRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : null

    const allScores = checkIns.flatMap((ci) =>
      [ci.energy, ci.sleep_quality, ci.soreness, ci.motivation].filter(Boolean)
    )
    const avgCheckIn = allScores.length > 0
      ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
      : null

    const weightChange = wl.length >= 2
      ? (wl[0].weight - wl[wl.length - 1].weight).toFixed(1)
      : null

    return {
      mentee:          m,
      complianceRate,
      avgCheckIn:      avgCheckIn ? parseFloat(avgCheckIn) : null,
      weightChange:    weightChange ? parseFloat(weightChange) : null,
      weightUnit:      m.athlete?.weight_unit || 'kg',
      lastCheckIn:     checkIns[0] || null,
      activePlanCount: plans.filter((p) => p.is_active).length,
    }
  }))
  return analytics
}

// ── Phone notifications via Edge Function (Epic 12) ───────────────

export async function sendPhoneNotification(to, message, channel = 'sms') {
  const { data, error } = await supabase.functions.invoke('send-notification', {
    body: { to, message, channel },
  })
  if (error) throw error
  return data
}
