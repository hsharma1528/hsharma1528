import React, { useState } from 'react'
import { Search, X, ChevronRight } from 'lucide-react'

export const PRESET_EXERCISES = [
  { name: 'Squat',               category: 'squat' },
  { name: 'Bench Press',         category: 'bench' },
  { name: 'Deadlift',            category: 'deadlift' },
  { name: 'Romanian Deadlift',   category: 'deadlift' },
  { name: 'Pause Squat',         category: 'squat' },
  { name: 'Close-Grip Bench',    category: 'bench' },
  { name: 'Sumo Deadlift',       category: 'deadlift' },
  { name: 'Front Squat',         category: 'squat' },
  { name: 'Incline Bench Press', category: 'bench' },
  { name: 'Stiff-Leg Deadlift',  category: 'deadlift' },
  { name: 'Overhead Press',      category: 'other' },
  { name: 'Barbell Row',         category: 'other' },
  { name: 'Pull-ups',            category: 'other' },
  { name: 'Dips',                category: 'other' },
  { name: 'Lat Pulldown',        category: 'other' },
  { name: 'Leg Press',           category: 'other' },
  { name: 'Hip Thrust',          category: 'other' },
  { name: 'Cable Row',           category: 'other' },
  { name: 'DB Curl',             category: 'other' },
  { name: 'Tricep Pushdown',     category: 'other' },
]

export const CATEGORY_COLORS = {
  squat:    'text-blue-400 bg-blue-500/10 border-blue-500/30',
  bench:    'text-green-400 bg-green-500/10 border-green-500/30',
  deadlift: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  other:    'text-purple-400 bg-purple-500/10 border-purple-500/30',
}

export default function ExercisePicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [custom, setCustom] = useState('')
  const filtered = PRESET_EXERCISES.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-dark-950/80 backdrop-blur-sm px-4 pb-4">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h3 className="text-white font-semibold">Select exercise</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-3 border-b border-dark-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-900 border border-dark-600 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-brand-500"
              placeholder="Search exercises…" autoFocus />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {filtered.map((ex) => {
            const cc = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.other
            return (
              <button key={ex.name} onClick={() => { onSelect(ex); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-dark-700 transition-colors text-left">
                <span className={`px-2 py-0.5 rounded-lg border text-xs ${cc}`}>{ex.category}</span>
                <span className="text-white text-sm">{ex.name}</span>
                <ChevronRight className="w-4 h-4 text-dark-500 ml-auto" />
              </button>
            )
          })}
          {search && (
            <div className="p-3 border-t border-dark-700 mt-2">
              <p className="text-dark-400 text-xs mb-2">Or add custom:</p>
              <div className="flex gap-2">
                <input value={custom || search} onChange={(e) => setCustom(e.target.value)}
                  className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                  placeholder="Custom exercise name" />
                <button
                  onClick={() => {
                    const name = (custom || search).trim()
                    if (name) { onSelect({ name, category: 'other' }); onClose() }
                  }}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
