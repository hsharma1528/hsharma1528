import React, { useEffect, useState } from 'react'
import { BookMarked, Trash2, Play, Eye, X, Tag, Dumbbell } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getTemplates, deleteTemplate } from '../../lib/db'
import ApplyTemplateModal from './ApplyTemplateModal'
import { CATEGORY_COLORS } from '../Workout/ExercisePicker'

function TemplatePreviewModal({ template, onClose, onApply }) {
  const days = template.days || []
  return (
    <>
      <div className="fixed inset-0 z-40 bg-dark-950/70" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between p-5 border-b border-dark-700 shrink-0">
            <div>
              <h3 className="text-white font-semibold">{template.title}</h3>
              {template.description && <p className="text-dark-400 text-xs mt-0.5">{template.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onApply}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
                <Play className="w-3.5 h-3.5" />Apply
              </button>
              <button onClick={onClose} className="text-dark-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="overflow-y-auto p-5 space-y-4">
            {days.length === 0 ? (
              <p className="text-dark-400 text-sm text-center py-8">No days in this template.</p>
            ) : (
              days.map((day, idx) => (
                <div key={day.id || idx} className="bg-dark-900 rounded-xl border border-dark-700">
                  <div className="px-4 py-3 border-b border-dark-700">
                    <span className="text-white font-medium text-sm">{day.day_label || `Day ${idx + 1}`}</span>
                    <span className="text-dark-500 text-xs ml-2">· {(day.exercises || []).length} exercises</span>
                  </div>
                  <div className="px-4 divide-y divide-dark-700">
                    {(day.exercises || []).map((ex, ei) => {
                      const cc = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.other
                      return (
                        <div key={ex.id || ei} className="flex items-center gap-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-lg border text-xs shrink-0 ${cc}`}>{ex.category}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm">{ex.name}</div>
                            <div className="text-dark-400 text-xs mt-0.5">
                              {ex.sets} sets × {ex.target_reps || '—'} reps
                              {ex.target_weight ? <span className="text-dark-500"> @ {ex.target_weight}</span> : ''}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function TemplateCard({ template, onPreview, onApply, onDelete }) {
  const days      = template.days || []
  const exCount   = days.reduce((n, d) => n + (d.exercises || []).length, 0)
  const cats      = [...new Set(days.flatMap((d) => (d.exercises || []).map((e) => e.category)))]

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4 flex flex-col gap-3 hover:border-dark-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">{template.title}</h3>
          {template.description && (
            <p className="text-dark-400 text-xs mt-0.5 line-clamp-2">{template.description}</p>
          )}
        </div>
        {!template.is_system && (
          <button onClick={() => onDelete(template.id)}
            className="text-dark-500 hover:text-red-400 p-1 transition-colors shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-3 text-dark-400 text-xs">
        <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{days.length} day{days.length !== 1 ? 's' : ''}</span>
        <span>{exCount} exercises</span>
        <div className="flex gap-1 ml-auto">
          {cats.slice(0, 3).map((cat) => {
            const cc = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other
            return (
              <span key={cat} className={`px-1.5 py-0.5 rounded border text-xs ${cc}`}>{cat}</span>
            )
          })}
        </div>
      </div>

      {/* Tags */}
      {(template.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {template.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 text-xs text-dark-400 bg-dark-700 border border-dark-600 rounded-full px-2 py-0.5">
              <Tag className="w-2.5 h-2.5" />{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={() => onPreview(template)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-dark-300 hover:text-white bg-dark-700 hover:bg-dark-600 border border-dark-600 py-2 rounded-xl transition-colors">
          <Eye className="w-3.5 h-3.5" />Preview
        </button>
        <button onClick={() => onApply(template)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-white bg-brand-600 hover:bg-brand-500 py-2 rounded-xl transition-colors font-semibold">
          <Play className="w-3.5 h-3.5" />Apply
        </button>
      </div>
    </div>
  )
}

export default function TemplateLibrary() {
  const { currentUser } = useApp()
  const [templates, setTemplates]   = useState([])
  const [loading,   setLoading]     = useState(true)
  const [tab,       setTab]         = useState('mine')   // 'mine' | 'system'
  const [preview,   setPreview]     = useState(null)
  const [applying,  setApplying]    = useState(null)

  useEffect(() => {
    getTemplates(currentUser.id)
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [currentUser.id])

  const handleDelete = async (templateId) => {
    if (!confirm('Delete this template?')) return
    await deleteTemplate(templateId).catch(console.error)
    setTemplates((ts) => ts.filter((t) => t.id !== templateId))
  }

  const mine   = templates.filter((t) => !t.is_system && t.coach_id === currentUser.id)
  const system = templates.filter((t) => t.is_system)

  const displayed = tab === 'mine' ? mine : system

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      {preview && (
        <TemplatePreviewModal
          template={preview}
          onClose={() => setPreview(null)}
          onApply={() => { setApplying(preview); setPreview(null) }}
        />
      )}
      {applying && (
        <ApplyTemplateModal
          template={applying}
          onClose={() => setApplying(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-brand-400" />Template library
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">Reuse programmes across athletes. Save any plan as a template from the plan editor.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[['mine', 'My templates'], ['system', 'Starter programs']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-brand-600 text-white'
                : 'bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:bg-dark-700'
            }`}>
            {label}
            {key === 'mine' && mine.length > 0 && (
              <span className="ml-1.5 text-xs bg-brand-500/20 text-brand-400 rounded-full px-1.5">{mine.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 bg-dark-800 rounded-2xl border border-dark-700">
          <BookMarked className="w-10 h-10 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">
            {tab === 'mine'
              ? 'No templates yet. Open any plan and click "Save as template" to add one.'
              : 'No starter programs found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onPreview={setPreview}
              onApply={setApplying}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
