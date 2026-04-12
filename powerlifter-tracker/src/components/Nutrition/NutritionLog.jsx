import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { format, parseISO, subDays, addDays } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import { Plus, Trash2, ChevronLeft, ChevronRight, X, Droplets, Flame, Search } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getNutritionByDate, saveNutritionLog } from '../../lib/db'

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout']

const COMMON_FOODS = [
  { name: 'Chicken breast (100g)',      calories: 165, protein: 31,   carbs: 0,    fat: 3.6 },
  { name: 'Brown rice (100g cooked)',   calories: 123, protein: 2.7,  carbs: 25.6, fat: 0.97 },
  { name: 'Whole egg (large)',          calories: 72,  protein: 6,    carbs: 0.4,  fat: 5 },
  { name: 'Greek yogurt (170g)',        calories: 100, protein: 17,   carbs: 6,    fat: 0.7 },
  { name: 'Oats (100g dry)',            calories: 389, protein: 16.9, carbs: 66,   fat: 6.9 },
  { name: 'Banana (medium)',            calories: 105, protein: 1.3,  carbs: 27,   fat: 0.4 },
  { name: 'Sweet potato (100g)',        calories: 86,  protein: 1.6,  carbs: 20,   fat: 0.1 },
  { name: 'Ground beef 90/10 (100g)',   calories: 176, protein: 20,   carbs: 0,    fat: 10 },
  { name: 'Salmon (100g)',              calories: 208, protein: 20,   carbs: 0,    fat: 13 },
  { name: 'Whey protein (1 scoop 30g)', calories: 120, protein: 25,   carbs: 3,    fat: 1.5 },
  { name: 'Peanut butter (2 tbsp)',     calories: 190, protein: 8,    carbs: 6,    fat: 16 },
  { name: 'White rice (100g cooked)',   calories: 130, protein: 2.7,  carbs: 28,   fat: 0.3 },
  { name: 'Broccoli (100g)',            calories: 34,  protein: 2.8,  carbs: 7,    fat: 0.4 },
  { name: 'Almonds (28g / 1 oz)',       calories: 164, protein: 6,    carbs: 6,    fat: 14 },
  { name: 'Cottage cheese (226g)',      calories: 207, protein: 25,   carbs: 8,    fat: 9 },
  { name: 'Tuna (100g canned)',         calories: 116, protein: 26,   carbs: 0,    fat: 1 },
  { name: 'Whole milk (240ml)',         calories: 149, protein: 8,    carbs: 12,   fat: 8 },
  { name: 'Avocado (100g)',             calories: 160, protein: 2,    carbs: 9,    fat: 15 },
]

function FoodPicker({ onAdd, onClose }) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('search')
  const [manual, setManual] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' })

  const filtered = COMMON_FOODS.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
  const inputCls = "w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-brand-500"

  const addManual = () => {
    if (!manual.name.trim() || !manual.calories) return
    onAdd({ id: uuidv4(), name: manual.name.trim(), calories: parseFloat(manual.calories) || 0, protein: parseFloat(manual.protein) || 0, carbs: parseFloat(manual.carbs) || 0, fat: parseFloat(manual.fat) || 0 })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-dark-950/80 backdrop-blur-sm px-4 pb-4">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-md max-h-[75vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h3 className="text-white font-semibold">Add food</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex border-b border-dark-700">
          {['search', 'manual'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? 'text-brand-400 border-b-2 border-brand-500' : 'text-dark-400 hover:text-white'}`}>
              {t === 'search' ? 'Common foods' : 'Custom entry'}
            </button>
          ))}
        </div>
        {tab === 'search' && (
          <>
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-brand-500"
                  placeholder="Search foods…" autoFocus />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2 scrollbar-thin">
              {filtered.map((food) => (
                <button key={food.name} onClick={() => { onAdd({ id: uuidv4(), ...food }); onClose() }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-dark-700 transition-colors text-left">
                  <div>
                    <div className="text-white text-sm">{food.name}</div>
                    <div className="text-dark-400 text-xs mt-0.5">P: {food.protein}g · C: {food.carbs}g · F: {food.fat}g</div>
                  </div>
                  <div className="text-brand-400 font-medium text-sm ml-2">{food.calories} kcal</div>
                </button>
              ))}
            </div>
          </>
        )}
        {tab === 'manual' && (
          <div className="p-4 space-y-3 overflow-y-auto">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Food name *</label>
              <input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })}
                className={inputCls} placeholder="e.g. Chicken rice bowl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['calories','Calories (kcal) *'],['protein','Protein (g)'],['carbs','Carbs (g)'],['fat','Fat (g)']].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-xs text-dark-400 mb-1">{label}</label>
                  <input type="number" value={manual[k]} onChange={(e) => setManual({ ...manual, [k]: e.target.value })}
                    className={inputCls} placeholder="0" min="0" step="0.1" />
                </div>
              ))}
            </div>
            <button onClick={addManual} disabled={!manual.name.trim() || !manual.calories}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
              Add food
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function MealSection({ meal, onUpdateFoods, onDelete, onChangeName }) {
  const [showPicker, setShowPicker] = useState(false)

  const totals = meal.foods.reduce(
    (acc, f) => ({ calories: acc.calories + (f.calories || 0), protein: acc.protein + (f.protein || 0), carbs: acc.carbs + (f.carbs || 0), fat: acc.fat + (f.fat || 0) }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      {showPicker && <FoodPicker onAdd={(food) => { onUpdateFoods([...meal.foods, food]); setShowPicker(false) }} onClose={() => setShowPicker(false)} />}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <select value={meal.name} onChange={(e) => onChangeName(e.target.value)}
          className="bg-transparent text-white font-semibold text-sm border-none focus:outline-none cursor-pointer">
          {MEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex items-center gap-3">
          {totals.calories > 0 && <span className="text-dark-400 text-xs">{Math.round(totals.calories)} kcal</span>}
          <button onClick={onDelete} className="text-dark-500 hover:text-red-400 transition-colors p-1">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-3 space-y-1">
        {meal.foods.map((food) => (
          <div key={food.id} className="flex items-center justify-between bg-dark-900 rounded-xl px-3 py-2">
            <div>
              <div className="text-white text-sm">{food.name}</div>
              <div className="text-dark-500 text-xs mt-0.5">P: {Math.round(food.protein)}g · C: {Math.round(food.carbs)}g · F: {Math.round(food.fat)}g</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-dark-300 text-sm">{Math.round(food.calories)} kcal</span>
              <button onClick={() => onUpdateFoods(meal.foods.filter((f) => f.id !== food.id))}
                className="text-dark-500 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        <button onClick={() => setShowPicker(true)} className="flex items-center gap-2 text-dark-400 hover:text-white text-sm py-1.5 pl-2 transition-colors">
          <Plus className="w-4 h-4" />Add food
        </button>
      </div>
    </div>
  )
}

export default function NutritionLog() {
  const { currentUser } = useApp()
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [log, setLog] = useState(null)
  const [water, setWater] = useState(0)
  const [loading, setLoading] = useState(true)

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd')

  const loadLog = useCallback(async () => {
    setLoading(true)
    try {
      const existing = await getNutritionByDate(currentUser.id, selectedDate)
      setLog(existing || { date: selectedDate, user_id: currentUser.id, meals: [], water: 0 })
      setWater(existing?.water || 0)
    } finally {
      setLoading(false)
    }
  }, [currentUser.id, selectedDate])

  useEffect(() => { loadLog() }, [loadLog])

  // Persist any changes
  const persist = useCallback(async (updatedLog) => {
    const toSave = { ...updatedLog, water, updated_at: new Date().toISOString() }
    setLog(toSave)
    try { await saveNutritionLog(toSave) }
    catch (err) { console.error('Save nutrition failed', err) }
  }, [water])

  const persistWithWater = useCallback(async (val) => {
    setWater(val)
    if (log) {
      const toSave = { ...log, water: val, updated_at: new Date().toISOString() }
      setLog(toSave)
      try { await saveNutritionLog(toSave) }
      catch (err) { console.error('Save water failed', err) }
    }
  }, [log])

  const addMeal = () => persist({ ...log, meals: [...(log.meals || []), { id: uuidv4(), name: MEAL_TYPES[Math.min((log.meals?.length || 0), MEAL_TYPES.length - 1)], foods: [] }] })
  const updateMealFoods = (mealId, foods) => persist({ ...log, meals: log.meals.map((m) => m.id === mealId ? { ...m, foods } : m) })
  const updateMealName  = (mealId, name)  => persist({ ...log, meals: log.meals.map((m) => m.id === mealId ? { ...m, name }  : m) })
  const deleteMeal      = (mealId)        => persist({ ...log, meals: log.meals.filter((m) => m.id !== mealId) })

  const totals = useMemo(() => {
    if (!log?.meals) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    return log.meals.reduce(
      (acc, meal) => { meal.foods.forEach((f) => { acc.calories += f.calories || 0; acc.protein += f.protein || 0; acc.carbs += f.carbs || 0; acc.fat += f.fat || 0 }); return acc },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }, [log])

  const targets = { calories: currentUser.target_calories || 2500, protein: currentUser.target_protein || 180, carbs: currentUser.target_carbs || 300, fat: currentUser.target_fat || 80 }
  const calPct = Math.min((totals.calories / targets.calories) * 100, 100)
  const remaining = Math.max(targets.calories - Math.round(totals.calories), 0)

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Nutrition</h1>

      {/* Date nav */}
      <div className="flex items-center justify-between bg-dark-800 border border-dark-700 rounded-2xl p-3 mb-6">
        <button onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
          className="text-dark-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-dark-700">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="text-white font-semibold">{isToday ? 'Today' : format(parseISO(selectedDate), 'EEEE')}</div>
          <div className="text-dark-400 text-xs">{format(parseISO(selectedDate), 'MMMM d, yyyy')}</div>
        </div>
        <button onClick={() => { const next = addDays(parseISO(selectedDate), 1); if (next <= new Date()) setSelectedDate(format(next, 'yyyy-MM-dd')) }}
          disabled={isToday} className="text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-2 rounded-xl hover:bg-dark-700 disabled:hover:bg-transparent">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5 mb-6">
            <div className="flex items-end justify-between mb-3">
              <div>
                <span className="text-3xl font-bold text-white">{Math.round(totals.calories)}</span>
                <span className="text-dark-400 text-sm ml-2">/ {targets.calories} kcal</span>
              </div>
              <div className={`text-sm font-medium ${remaining > 0 ? 'text-green-400' : 'text-orange-400'}`}>
                {remaining > 0 ? `${remaining} remaining` : `${Math.round(totals.calories) - targets.calories} over`}
              </div>
            </div>
            <div className="h-3 bg-dark-700 rounded-full overflow-hidden mb-4">
              <div className={`h-full rounded-full transition-all duration-500 ${calPct >= 100 ? 'bg-orange-500' : 'bg-brand-500'}`} style={{ width: `${calPct}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['Protein', totals.protein, targets.protein, 'bg-brand-500'], ['Carbs', totals.carbs, targets.carbs, 'bg-yellow-500'], ['Fat', totals.fat, targets.fat, 'bg-blue-500']].map(([label, val, target, barColor]) => (
                <div key={label} className="bg-dark-700 rounded-xl p-3">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-dark-400 text-xs">{label}</span>
                    <span className="text-xs text-dark-400">{target}g</span>
                  </div>
                  <div className="text-white font-bold text-lg">{Math.round(val)}g</div>
                  <div className="h-1.5 bg-dark-600 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min((val / target) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Water */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dark-700">
              <Droplets className="w-5 h-5 text-blue-400 shrink-0" />
              <span className="text-dark-300 text-sm flex-1">Water (oz)</span>
              <div className="flex items-center gap-2">
                <button onClick={() => persistWithWater(Math.max(0, water - 8))}
                  className="w-7 h-7 rounded-lg bg-dark-700 hover:bg-dark-600 text-white flex items-center justify-center font-bold">−</button>
                <span className="text-white font-semibold w-10 text-center">{water}</span>
                <button onClick={() => persistWithWater(water + 8)}
                  className="w-7 h-7 rounded-lg bg-dark-700 hover:bg-dark-600 text-white flex items-center justify-center font-bold">+</button>
              </div>
            </div>
          </div>

          {/* Meals */}
          <div className="space-y-4">
            {log?.meals?.map((meal) => (
              <MealSection key={meal.id} meal={meal}
                onUpdateFoods={(foods) => updateMealFoods(meal.id, foods)}
                onChangeName={(name) => updateMealName(meal.id, name)}
                onDelete={() => deleteMeal(meal.id)} />
            ))}
          </div>

          <button onClick={addMeal}
            className="flex items-center gap-2 w-full border-2 border-dashed border-dark-600 hover:border-brand-600 rounded-2xl py-4 text-dark-400 hover:text-brand-400 transition-all justify-center mt-4">
            <Plus className="w-5 h-5" />Add meal
          </button>
        </>
      )}
    </div>
  )
}
