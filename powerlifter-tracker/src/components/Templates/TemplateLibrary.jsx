import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookMarked, Trash2, Play, Eye, X, Tag, Dumbbell, Layers, Globe, ShoppingBag, Plus, DollarSign } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  getTemplates, deleteTemplate, createTemplate,
  getBlockTemplates, createBlockTemplate, deleteBlockTemplate,
  getPaidTemplates, getPurchasedTemplates, recordPurchase, createStripeCheckout,
} from '../../lib/db'
import ApplyTemplateModal from './ApplyTemplateModal'
import ApplyBlockTemplateModal from './ApplyBlockTemplateModal'
import { CATEGORY_COLORS } from '../Workout/ExercisePicker'

// ── Shared helpers ──────────────────────────────────────────────────

function TagChip({ label }) {
  return (
    <span className="flex items-center gap-1 text-xs text-dark-400 bg-dark-700 border border-dark-600 rounded-full px-2 py-0.5">
      <Tag className="w-2.5 h-2.5" />{label}
    </span>
  )
}

// ── Plan template preview modal ─────────────────────────────────────
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
              {onApply && (
                <button onClick={onApply}
                  className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
                  <Play className="w-3.5 h-3.5" />Apply
                </button>
              )}
              <button onClick={onClose} className="text-dark-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="overflow-y-auto p-5 space-y-4">
            {days.map((day, idx) => (
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
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Plan template card ─────────────────────────────────────────────
function TemplateCard({ template, onPreview, onApply, onDelete, showPrice }) {
  const days    = template.days || []
  const exCount = days.reduce((n, d) => n + (d.exercises || []).length, 0)
  const cats    = [...new Set(days.flatMap((d) => (d.exercises || []).map((e) => e.category)))]

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4 flex flex-col gap-3 hover:border-dark-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">{template.title}</h3>
          {template.description && <p className="text-dark-400 text-xs mt-0.5 line-clamp-2">{template.description}</p>}
          {template.coach && <p className="text-dark-500 text-xs mt-0.5">by {template.coach.name || template.coach.username}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showPrice && template.is_paid && template.price_cents && (
            <span className="text-green-400 text-sm font-bold">${(template.price_cents / 100).toFixed(2)}</span>
          )}
          {onDelete && !template.is_system && (
            <button onClick={() => onDelete(template.id)} className="text-dark-500 hover:text-red-400 p-1 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-dark-400 text-xs">
        <span><Dumbbell className="w-3 h-3 inline mr-1" />{days.length} day{days.length !== 1 ? 's' : ''}</span>
        <span>{exCount} exercises</span>
        <div className="flex gap-1 ml-auto">
          {cats.slice(0, 3).map((cat) => (
            <span key={cat} className={`px-1.5 py-0.5 rounded border text-xs ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.other}`}>{cat}</span>
          ))}
        </div>
      </div>
      {(template.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1">{template.tags.map((t) => <TagChip key={t} label={t} />)}</div>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={() => onPreview(template)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-dark-300 hover:text-white bg-dark-700 hover:bg-dark-600 border border-dark-600 py-2 rounded-xl transition-colors">
          <Eye className="w-3.5 h-3.5" />Preview
        </button>
        <button onClick={() => onApply(template)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-white bg-brand-600 hover:bg-brand-500 py-2 rounded-xl transition-colors font-semibold">
          <Play className="w-3.5 h-3.5" />{template.is_paid ? 'Purchase' : 'Apply'}
        </button>
      </div>
    </div>
  )
}

// ── Block template card ────────────────────────────────────────────
function BlockTemplateCard({ template, onApply, onDelete }) {
  const weekCount = template.plans?.length || 0
  const unit = template.goal_squat ? 'kg' : ''
  return (
    <div className="bg-dark-800 border border-brand-500/20 rounded-2xl p-4 flex flex-col gap-3 hover:border-brand-500/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-brand-400 shrink-0" />
            <h3 className="text-white font-semibold text-sm truncate">{template.title}</h3>
          </div>
          {template.description && <p className="text-dark-400 text-xs line-clamp-2">{template.description}</p>}
        </div>
        {onDelete && !template.is_system && (
          <button onClick={() => onDelete(template.id)} className="text-dark-500 hover:text-red-400 p-1 transition-colors shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-dark-400">
        <span>{template.duration_weeks || weekCount} week{(template.duration_weeks || weekCount) !== 1 ? 's' : ''}</span>
        <span>{weekCount} plan{weekCount !== 1 ? 's' : ''}</span>
        {template.goal_squat && <span>S{template.goal_squat}/{template.goal_bench}/{template.goal_deadlift} {unit}</span>}
      </div>
      {(template.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1">{template.tags.map((t) => <TagChip key={t} label={t} />)}</div>
      )}
      <button onClick={() => onApply(template)}
        className="flex items-center justify-center gap-1.5 text-xs text-white bg-brand-600 hover:bg-brand-500 py-2 rounded-xl transition-colors font-semibold">
        <Play className="w-3.5 h-3.5" />Apply to athlete
      </button>
    </div>
  )
}

// ── Save block template modal ──────────────────────────────────────
function SaveBlockTemplateModal({ block, plans, coachId, onClose }) {
  const [title, setTitle]   = useState(block.label)
  const [desc,  setDesc]    = useState('')
  const [tags,  setTags]    = useState('')
  const [saving, setSaving] = useState(false)
  const [done,  setDone]    = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await createBlockTemplate({
        coach_id:        coachId,
        title:           title.trim(),
        description:     desc.trim() || null,
        tags:            tags.split(',').map((t) => t.trim()).filter(Boolean),
        goal_squat:      block.goal_squat      || null,
        goal_bench:      block.goal_bench      || null,
        goal_deadlift:   block.goal_deadlift   || null,
        goal_bodyweight: block.goal_bodyweight || null,
        goal_notes:      block.goal_notes      || null,
        duration_weeks:  plans.length || null,
        plans:           plans.map((p, i) => ({
          week_offset: i,
          title:       p.title,
          days:        p.days || [],
        })),
      })
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 text-sm"
  return (
    <>
      <div className="fixed inset-0 z-40 bg-dark-950/60" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2"><Layers className="w-4 h-4 text-brand-400" />Save block as template</h3>
            <button onClick={onClose} className="text-dark-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
          </div>
          {done ? <p className="text-green-400 text-sm text-center py-4">Block template saved!</p> : (
            <>
              <div><label className="block text-dark-400 text-xs mb-1">Name</label><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></div>
              <div><label className="block text-dark-400 text-xs mb-1">Description</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className={inputCls + ' resize-none'} placeholder="Optional description…" /></div>
              <div><label className="block text-dark-400 text-xs mb-1">Tags</label><input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="strength, 4-week" /></div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 py-2.5 rounded-xl text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── Set price modal (for coaches making a paid template) ───────────
function SetPriceModal({ template, onClose, onSaved }) {
  const [price, setPrice] = useState(template.price_cents ? (template.price_cents / 100).toString() : '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const cents = Math.round(parseFloat(price) * 100)
    if (isNaN(cents) || cents < 0) return
    setSaving(true)
    try {
      const { supabase } = await import('../../lib/supabase')
      await supabase.from('plan_templates')
        .update({ is_paid: cents > 0, price_cents: cents || null })
        .eq('id', template.id)
      onSaved({ ...template, is_paid: cents > 0, price_cents: cents || null })
      onClose()
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-dark-950/60" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-xs shadow-2xl space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-400" />Set price</h3>
          <p className="text-dark-400 text-xs">Leave blank or 0 for a free public programme.</p>
          <div>
            <label className="block text-dark-400 text-xs mb-1">Price (USD)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500"
              placeholder="0.00" min="0" step="0.01" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-200 py-2.5 rounded-xl text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function TemplateLibrary() {
  const { currentUser } = useApp()
  const isCoach = currentUser.role === 'coach'
  const [searchParams] = useSearchParams()

  const [templates,      setTemplates]      = useState([])
  const [blockTemplates, setBlockTemplates] = useState([])
  const [marketplaceTemplates, setMarketplace] = useState([])
  const [purchased,      setPurchased]      = useState([])
  const [loading,        setLoading]        = useState(true)
  const [tab,            setTab]            = useState('mine')

  const [preview,        setPreview]        = useState(null)
  const [applying,       setApplying]       = useState(null)
  const [applyingBlock,  setApplyingBlock]  = useState(null)
  const [settingPrice,   setSettingPrice]   = useState(null)

  // Handle Stripe return
  useEffect(() => {
    const success    = searchParams.get('success')
    const templateId = searchParams.get('template')
    if (success && templateId) {
      recordPurchase(currentUser.id, templateId).catch(console.error)
    }
  }, [])

  useEffect(() => {
    const loads = [
      getTemplates(currentUser.id).then(setTemplates),
      isCoach
        ? getBlockTemplates(currentUser.id).then(setBlockTemplates)
        : Promise.resolve(),
      !isCoach
        ? getPaidTemplates().then(setMarketplace)
        : Promise.resolve(),
      !isCoach
        ? getPurchasedTemplates(currentUser.id).then((rows) => setPurchased(new Set(rows.map((r) => r.template_id))))
        : Promise.resolve(),
    ]
    Promise.all(loads).catch(console.error).finally(() => setLoading(false))
  }, [currentUser.id, isCoach])

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return
    await deleteTemplate(id).catch(console.error)
    setTemplates((ts) => ts.filter((t) => t.id !== id))
  }
  const handleDeleteBlock = async (id) => {
    if (!confirm('Delete this block template?')) return
    await deleteBlockTemplate(id).catch(console.error)
    setBlockTemplates((bs) => bs.filter((b) => b.id !== id))
  }

  const handleMarketplaceApply = async (template) => {
    if (template.is_paid && template.price_cents > 0 && !purchased.has(template.id)) {
      if (!template.stripe_price_id) {
        alert('This plan has no Stripe price configured. Contact the coach.')
        return
      }
      try {
        const { url } = await createStripeCheckout(template.id, template.stripe_price_id, currentUser.id)
        window.location.href = url
      } catch (err) { alert('Checkout failed: ' + err.message) }
    } else {
      setApplying(template)
    }
  }

  const mine   = templates.filter((t) => !t.is_system && t.coach_id === currentUser.id)
  const system = templates.filter((t) => t.is_system)

  const TABS = isCoach
    ? [['mine', 'My templates'], ['blocks', 'Block templates'], ['system', 'Starter programs']]
    : [['system', 'Starter programs'], ['marketplace', 'Marketplace']]

  const displayed =
    tab === 'mine'        ? mine :
    tab === 'blocks'      ? blockTemplates :
    tab === 'system'      ? system :
    marketplaceTemplates

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      {preview && (
        <TemplatePreviewModal template={preview} onClose={() => setPreview(null)}
          onApply={isCoach ? () => { setApplying(preview); setPreview(null) } : null} />
      )}
      {applying && <ApplyTemplateModal template={applying} onClose={() => setApplying(null)} />}
      {applyingBlock && <ApplyBlockTemplateModal template={applyingBlock} onClose={() => setApplyingBlock(null)} />}
      {settingPrice && (
        <SetPriceModal template={settingPrice} onClose={() => setSettingPrice(null)}
          onSaved={(updated) => setTemplates((ts) => ts.map((t) => t.id === updated.id ? updated : t))} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-brand-400" />Template Library
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">
            {isCoach ? 'Reuse programmes across athletes. Save any plan as a template from the plan editor.'
                     : 'Browse and apply coaching programmes.'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-brand-600 text-white'
                : 'bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:bg-dark-700'
            }`}>
            {label}
            {key === 'mine'   && mine.length > 0         && <span className="ml-1.5 text-xs bg-brand-500/20 text-brand-400 rounded-full px-1.5">{mine.length}</span>}
            {key === 'blocks' && blockTemplates.length > 0 && <span className="ml-1.5 text-xs bg-brand-500/20 text-brand-400 rounded-full px-1.5">{blockTemplates.length}</span>}
          </button>
        ))}
      </div>

      {/* Set price / publish toggle for "mine" tab */}
      {tab === 'mine' && isCoach && mine.length > 0 && (
        <div className="text-dark-400 text-xs bg-dark-800 border border-dark-700 rounded-xl px-4 py-2.5">
          Tip: click <DollarSign className="w-3 h-3 inline" /> on a template card to set a price and publish to the marketplace.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 bg-dark-800 rounded-2xl border border-dark-700">
          {tab === 'blocks' ? <Layers className="w-10 h-10 text-dark-600 mx-auto mb-3" />
           : tab === 'marketplace' ? <ShoppingBag className="w-10 h-10 text-dark-600 mx-auto mb-3" />
           : <BookMarked className="w-10 h-10 text-dark-600 mx-auto mb-3" />}
          <p className="text-dark-400 text-sm">
            {tab === 'mine'        ? 'No templates yet. Click "Save as template" in the plan editor.'
             : tab === 'blocks'    ? 'No block templates yet. Save a block from the mentee detail view.'
             : tab === 'system'    ? 'No starter programs found.'
             : 'No paid programmes available yet.'}
          </p>
        </div>
      ) : tab === 'blocks' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((t) => (
            <BlockTemplateCard key={t.id} template={t}
              onApply={setApplyingBlock}
              onDelete={handleDeleteBlock} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((t) => (
            <div key={t.id} className="relative">
              <TemplateCard
                template={t}
                onPreview={setPreview}
                onApply={tab === 'marketplace' ? handleMarketplaceApply : setApplying}
                onDelete={tab === 'mine' ? handleDeleteTemplate : null}
                showPrice={tab === 'marketplace'}
              />
              {tab === 'mine' && (
                <button onClick={() => setSettingPrice(t)}
                  title="Set price / publish"
                  className="absolute top-3 right-10 text-dark-500 hover:text-green-400 p-1 transition-colors">
                  <DollarSign className="w-3.5 h-3.5" />
                </button>
              )}
              {tab === 'marketplace' && purchased.has(t.id) && (
                <div className="absolute top-3 right-3 bg-green-500/20 border border-green-500/30 text-green-400 text-xs px-2 py-0.5 rounded-full">Purchased</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
