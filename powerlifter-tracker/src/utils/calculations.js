// Powerlifting calculation utilities

// Epley formula for estimated 1RM
export const calc1RM = (weight, reps) => {
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

// RPE-based 1RM (Tuchscherer table simplified)
export const calcRPE1RM = (weight, reps, rpe) => {
  const rpeTable = {
    10: [1, 0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739],
    9.5:[1.012, 0.966, 0.933, 0.902, 0.874, 0.847, 0.821, 0.796, 0.772, 0.748],
    9:  [1.022, 0.978, 0.944, 0.913, 0.885, 0.857, 0.831, 0.806, 0.782, 0.758],
    8.5:[1.034, 0.989, 0.955, 0.924, 0.895, 0.868, 0.842, 0.817, 0.792, 0.768],
    8:  [1.047, 1.0,   0.966, 0.935, 0.906, 0.879, 0.853, 0.828, 0.803, 0.779],
    7.5:[1.059, 1.013, 0.978, 0.947, 0.918, 0.890, 0.864, 0.839, 0.815, 0.790],
    7:  [1.072, 1.025, 0.990, 0.959, 0.930, 0.902, 0.876, 0.851, 0.826, 0.802],
  }
  const rpeRow = rpeTable[rpe] || rpeTable[10]
  const repIndex = Math.min(reps - 1, 9)
  return Math.round(weight / rpeRow[repIndex])
}

// Wilks score (updated 2020 coefficients)
export const calcWilks = (totalKg, bodyweightKg, isMale) => {
  if (!totalKg || !bodyweightKg) return 0
  const a = isMale
    ? [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8]
    : [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8]

  const bw = bodyweightKg
  const denom =
    a[0] + a[1] * bw + a[2] * bw ** 2 + a[3] * bw ** 3 + a[4] * bw ** 4 + a[5] * bw ** 5

  return Math.round((totalKg / denom) * 600 * 100) / 100
}

// DOTS score
export const calcDOTS = (totalKg, bodyweightKg, isMale) => {
  if (!totalKg || !bodyweightKg) return 0
  const a = isMale
    ? [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093]
    : [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706]

  const bw = bodyweightKg
  const denom =
    a[0] + a[1] * bw + a[2] * bw ** 2 + a[3] * bw ** 3 + a[4] * bw ** 4

  return Math.round((500 / denom) * totalKg * 100) / 100
}

// Daily calorie targets based on phase and stats
export const calcCalorieTargets = (profile) => {
  const { weight, height, age, gender, phase, weightUnit } = profile
  if (!weight || !height || !age) return { calories: 2500, protein: 180, carbs: 300, fat: 80 }

  const weightKg = weightUnit === 'lbs' ? weight * 0.453592 : weight
  const heightCm = height // assume cm

  // Mifflin-St Jeor BMR
  const bmr =
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161

  // Activity multiplier (moderate-heavy for powerlifters)
  const tdee = Math.round(bmr * 1.55)

  const phaseAdjustments = {
    offseason: { calMod: 200, proteinMult: 1.8, carbMult: 4.0, fatMult: 1.0 },
    bulk: { calMod: 400, proteinMult: 2.0, carbMult: 5.0, fatMult: 1.0 },
    cut: { calMod: -400, proteinMult: 2.4, carbMult: 3.0, fatMult: 0.8 },
    meet_prep: { calMod: 0, proteinMult: 2.2, carbMult: 4.5, fatMult: 0.9 },
  }

  const adj = phaseAdjustments[phase] || phaseAdjustments.offseason
  const calories = tdee + adj.calMod
  const protein = Math.round(weightKg * adj.proteinMult)
  const fat = Math.round((calories * 0.25) / 9)
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4)

  return { calories, protein, carbs, fat }
}

export const lbsToKg = (lbs) => Math.round(lbs * 0.453592 * 10) / 10
export const kgToLbs = (kg) => Math.round(kg * 2.20462 * 10) / 10

export const formatWeight = (weight, unit) =>
  `${weight} ${unit}`

export const phaseColors = {
  offseason: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  bulk: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  cut: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  meet_prep: { bg: 'bg-brand-500/20', text: 'text-brand-400', border: 'border-brand-500/30' },
}

export const phaseLabels = {
  offseason: 'Off-Season',
  bulk: 'Bulk',
  cut: 'Cut',
  meet_prep: 'Meet Prep',
}
