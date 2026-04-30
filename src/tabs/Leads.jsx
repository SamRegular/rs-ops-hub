import { useState } from 'react'
import { Plus, Edit2, Trash2, ArrowLeft, Zap, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react'
import { Modal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { SOURCES, SECTORS, LEAD_TEMPERATURES, NEXT_ACTIONS, NEXT_ACTION_LABELS, DOCUMENT_SENT_OPTIONS } from '../config/studio.js'

function fmt(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(n)
}

function Badge({ temperature }) {
  const colors = {
    Hot: 'badge-hot',
    Warm: 'badge-warm',
    Cold: 'badge-cold',
  }
  return <span className={`badge ${colors[temperature] ?? 'badge-cold'}`}>{temperature}</span>
}

function getDaysUntil(dateString) {
  if (!dateString) return null
  const date = new Date(dateString)
  const today = new Date()
  const diff = date - today
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getWeekRanges() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const thisWeekEnd = new Date(today)
  thisWeekEnd.setDate(today.getDate() + (6 - today.getDay()))

  const nextWeekStart = new Date(thisWeekEnd)
  nextWeekStart.setDate(thisWeekEnd.getDate() + 1)

  const nextWeekEnd = new Date(nextWeekStart)
  nextWeekEnd.setDate(nextWeekStart.getDate() + 6)

  return { today, thisWeekEnd, nextWeekStart, nextWeekEnd }
}

// ─── Lead Form ────────────────────────────────────────────────────────────
function LeadForm({ initial = {}, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', role: '', company: '', location: '', industry: '', source: '', temperature: 'Cold',
    details: '', estimated_value: '', next_action: 'waiting', next_action_date: '', document_sent: '', notes: '',
    ...initial,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inp = (k) => ({ value: form[k] ?? '', onChange: e => set(k, e.target.value) })

  return (
    <>
      <div className="form-grid form-grid-2">
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Name *</label>
          <input className="form-input" {...inp('name')} placeholder="e.g. John Smith" />
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <input className="form-input" {...inp('role')} placeholder="e.g. CMO, Marketing Director" />
        </div>
        <div className="form-group">
          <label className="form-label">Company *</label>
          <input className="form-input" {...inp('company')} placeholder="e.g. ACME Inc." />
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" {...inp('location')} placeholder="e.g. London, New York" />
        </div>
        <div className="form-group">
          <label className="form-label">Industry</label>
          <select className="form-select" {...inp('industry')}>
            <option value="">— Select industry —</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Source</label>
          <select className="form-select" {...inp('source')}>
            <option value="">— Select source —</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Lead Temperature</label>
          <select className="form-select" {...inp('temperature')}>
            {LEAD_TEMPERATURES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Document Sent</label>
          <select className="form-select" {...inp('document_sent')}>
            <option value="">— Select document —</option>
            {DOCUMENT_SENT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Details / Work Type</label>
          <textarea className="form-input" {...inp('details')} placeholder="e.g. Website redesign, brand refresh, social media strategy…" rows={3} />
        </div>
        <div className="form-group">
          <label className="form-label">Estimated Value (£)</label>
          <input className="form-input" type="number" min="0" step="1000" {...inp('estimated_value')} style={{ fontFamily: 'var(--font-mono)' }} />
        </div>
        <div className="form-group">
          <label className="form-label">Next Action</label>
          <select className="form-select" {...inp('next_action')}>
            {NEXT_ACTIONS.map(a => <option key={a} value={a}>{NEXT_ACTION_LABELS[a]}</option>)}
          </select>
        </div>
        {['call_booked', 'proposal_sent', 'sow_sent'].includes(form.next_action) && (
          <div className="form-group">
            <label className="form-label">Action Date</label>
            <input className="form-input" type="date" {...inp('next_action_date')} />
          </div>
        )}
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Notes</label>
          <textarea className="form-input" {...inp('notes')} placeholder="Any additional notes…" rows={2} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { if (form.name.trim() && form.company.trim()) onSave(form) }}>
          {initial.id ? 'Save Changes' : 'Add Lead'}
        </button>
      </div>
    </>
  )
}

// ─── Convert Lead Modal ────────────────────────────────────────────────────
function ConvertLeadModal({ lead, onConfirm, onClose }) {
  return (
    <Modal title="Convert Lead to Client" onClose={onClose}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ marginBottom: 8 }}>This will create a new client from this lead data:</p>
        <div style={{ background: 'var(--bg)', padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: '0.875rem', marginBottom: 16 }}>
          <strong>{lead.name}</strong>
          {lead.role && <div style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>{lead.role}</div>}
          {lead.company && <div style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>{lead.company}</div>}
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>The lead will be removed from the Leads tab after conversion.</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={onConfirm}>Convert to Client</button>
      </div>
    </Modal>
  )
}

// ─── Lead List / Detail ────────────────────────────────────────────────────
export default function Leads({ store, onNav }) {
  const toast = useToast()
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [convertModal, setConvertModal] = useState(null)
  const [completedCalls, setCompletedCalls] = useState({})

  const { leads, createLead, updateLead, deleteLead, convertLead } = store

  const selected = selectedId ? leads.find(l => l.id === selectedId) : null
  const coldCount = leads.filter(l => l.temperature === 'Cold').length
  const warmCount = leads.filter(l => l.temperature === 'Warm').length
  const hotCount = leads.filter(l => l.temperature === 'Hot').length
  const totalValue = leads.reduce((s, l) => s + (Number(l.estimated_value) || 0), 0)

  const ranges = getWeekRanges()
  const callsThisWeek = leads.filter(l =>
    l.next_action === 'call_booked' &&
    l.next_action_date &&
    new Date(l.next_action_date) >= ranges.today &&
    new Date(l.next_action_date) <= ranges.thisWeekEnd
  ).sort((a, b) => new Date(a.next_action_date) - new Date(b.next_action_date))

  const callsNextWeek = leads.filter(l =>
    l.next_action === 'call_booked' &&
    l.next_action_date &&
    new Date(l.next_action_date) >= ranges.nextWeekStart &&
    new Date(l.next_action_date) <= ranges.nextWeekEnd
  ).sort((a, b) => new Date(a.next_action_date) - new Date(b.next_action_date))

  const proposalsPending = leads.filter(l => l.next_action === 'proposal_sent').length
  const sowsPending = leads.filter(l => l.next_action === 'sow_sent').length

  async function handleSave(data) {
    try {
      if (editLead) {
        await updateLead(editLead.id, data)
        toast('Lead updated', 'success')
      } else {
        await createLead(data)
        toast('Lead added', 'success')
      }
      setShowForm(false)
      setEditLead(null)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this lead?')) return
    try {
      await deleteLead(id)
      toast('Lead deleted', 'info')
      if (selectedId === id) setSelectedId(null)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function handleConvert() {
    try {
      const clientData = {
        name: selected.name,
        role: selected.role,
        company: selected.company,
        sector: selected.industry,
        source: selected.source,
        notes: selected.notes,
      }
      await convertLead(selected.id, clientData)
      toast(`${selected.name} converted to client`, 'success')
      setConvertModal(null)
      setSelectedId(null)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const toggleCallDone = (leadId) => {
    setCompletedCalls(prev => ({ ...prev, [leadId]: !prev[leadId] }))
  }

  if (selected && !editLead && !convertModal) {
    // Detail view
    return (
      <div>
        <div className="detail-header">
          <button className="btn btn-sm btn-ghost" onClick={() => setSelectedId(null)}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        <div style={{ padding: '0 16px' }}>
          <div className="detail-title">{selected.name}</div>
          {selected.company && <div className="detail-sub">{selected.company}</div>}

          <div style={{ marginTop: 32, marginBottom: 32 }}>
            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-label">Role</span>
                <span className="stat-value">{selected.role || '—'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Location</span>
                <span className="stat-value">{selected.location || '—'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Industry</span>
                <span className="stat-value">{selected.industry || '—'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Source</span>
                <span className="stat-value">{selected.source || '—'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Temperature</span>
                <span className="stat-value"><Badge temperature={selected.temperature} /></span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Document Sent</span>
                <span className="stat-value" style={{ fontSize: '0.8rem' }}>{selected.document_sent || '—'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Est. Value</span>
                <span className="stat-value accent">{fmt(selected.estimated_value)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Next Action</span>
                <span className="stat-value">{NEXT_ACTION_LABELS[selected.next_action] || selected.next_action}</span>
              </div>
            </div>
          </div>

          {selected.details && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>Details</h3>
              <p style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-muted)' }}>{selected.details}</p>
            </div>
          )}

          {selected.next_action_date && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>Action Date</h3>
              <p>{new Date(selected.next_action_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          )}

          {selected.notes && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>Notes</h3>
              <p style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-muted)' }}>{selected.notes}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <button className="btn btn-accent" onClick={() => setConvertModal(selected)}>
              <Zap size={14} /> Convert to Client
            </button>
            <button className="btn btn-ghost" onClick={() => { setEditLead(selected); setShowForm(true) }}>
              <Edit2 size={14} /> Edit
            </button>
            <button className="btn btn-ghost" onClick={() => handleDelete(selected.id)} style={{ color: '#C0392B' }}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        {convertModal && (
          <ConvertLeadModal
            lead={convertModal}
            onConfirm={handleConvert}
            onClose={() => setConvertModal(null)}
          />
        )}

        {showForm && (
          <Modal title={editLead ? 'Edit Lead' : 'Add Lead'} onClose={() => { setShowForm(false); setEditLead(null) }}>
            <LeadForm
              initial={editLead ?? {}}
              onSave={handleSave}
              onClose={() => { setShowForm(false); setEditLead(null) }}
            />
          </Modal>
        )}
      </div>
    )
  }

  // List view with tracker
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Leads</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add Lead
        </button>
      </div>

      {/* Temperature Pipeline */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Cold Leads</span>
          <span className="stat-value">{coldCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Warm Leads</span>
          <span className="stat-value accent">{warmCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Hot Leads</span>
          <span className="stat-value" style={{ color: '#E74C3C' }}>{hotCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Lead Value</span>
          <span className="stat-value accent">{fmt(totalValue)}</span>
        </div>
      </div>

      {/* Calls This Week */}
      {callsThisWeek.length > 0 && (
        <section style={{ marginTop: 32, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', flex: 1 }}>
              Calls This Week
            </h2>
            <span style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-muted)' }}>
              {callsThisWeek.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {callsThisWeek.map(lead => {
              const done = completedCalls[lead.id]
              const daysUntil = getDaysUntil(lead.next_action_date)
              return (
                <div key={lead.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: 'var(--bg)', borderRadius: 'var(--radius)',
                  opacity: done ? 0.6 : 1,
                  textDecoration: done ? 'line-through' : 'none'
                }}>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => toggleCallDone(lead.id)}
                    style={{ flex: 'none' }}
                    title={done ? 'Mark pending' : 'Mark done'}
                  >
                    <CheckCircle2 size={16} style={{ color: done ? '#27AE60' : 'var(--ink-muted)' }} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{lead.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>{lead.company}</div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', textAlign: 'right' }}>
                    <div>{new Date(lead.next_action_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</div>
                    {daysUntil === 0 && <div style={{ color: '#E74C3C', fontWeight: 600 }}>Today</div>}
                    {daysUntil === 1 && <div style={{ color: '#F39C12', fontWeight: 600 }}>Tomorrow</div>}
                    {daysUntil > 1 && <div>{daysUntil} days</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Calls Next Week */}
      {callsNextWeek.length > 0 && (
        <section style={{ marginTop: 32, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', flex: 1 }}>
              Calls Next Week
            </h2>
            <span style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-muted)' }}>
              {callsNextWeek.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {callsNextWeek.map(lead => (
              <div key={lead.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: 'var(--bg)', borderRadius: 'var(--radius)'
              }}>
                <div style={{ color: 'var(--ink-muted)' }}>
                  <TrendingUp size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{lead.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>{lead.company}</div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                  {new Date(lead.next_action_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending Actions */}
      {(proposalsPending > 0 || sowsPending > 0) && (
        <section style={{ marginTop: 32, marginBottom: 32 }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>
            Pending Actions
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {proposalsPending > 0 && (
              <div style={{
                padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius)',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <AlertCircle size={20} style={{ color: '#F39C12' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                    Proposals Waiting
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{proposalsPending}</div>
                </div>
              </div>
            )}
            {sowsPending > 0 && (
              <div style={{
                padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius)',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <AlertCircle size={20} style={{ color: '#E74C3C' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                    SOWs Pending
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{sowsPending}</div>
                </div>
              </div>
            )}
          </div>

          {proposalsPending > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>Awaiting Proposal Response</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {leads.filter(l => l.next_action === 'proposal_sent').map(lead => (
                  <div key={lead.id} style={{
                    padding: '8px 12px', background: 'var(--bg)', borderRadius: '4px',
                    fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{lead.name}</div>
                      <div style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>{lead.company}</div>
                    </div>
                    {lead.next_action_date && (
                      <div style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
                        {new Date(lead.next_action_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {sowsPending > 0 && (
            <div>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>Awaiting SOW Review</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {leads.filter(l => l.next_action === 'sow_sent').map(lead => (
                  <div key={lead.id} style={{
                    padding: '8px 12px', background: 'var(--bg)', borderRadius: '4px',
                    fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{lead.name}</div>
                      <div style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>{lead.company}</div>
                    </div>
                    {lead.next_action_date && (
                      <div style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
                        {new Date(lead.next_action_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Leads Table */}
      {leads.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No leads yet</p>
          <p className="text-muted">Add prospects to start tracking your pipeline.</p>
        </div>
      ) : (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>All Leads</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Role</th>
                  <th>Temp</th>
                  <th>Document</th>
                  <th>Est. Value</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} onClick={() => setSelectedId(l.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500 }}>{l.name}</td>
                    <td className="text-muted">{l.company || '—'}</td>
                    <td className="text-muted">{l.location || '—'}</td>
                    <td className="text-muted">{l.role || '—'}</td>
                    <td><Badge temperature={l.temperature} /></td>
                    <td className="text-muted" style={{ fontSize: '0.8rem' }}>{l.document_sent || '—'}</td>
                    <td className="currency">{fmt(l.estimated_value)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(l.id)} title="Delete" style={{ color: '#C0392B' }}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showForm && (
        <Modal title={editLead ? 'Edit Lead' : 'Add Lead'} onClose={() => { setShowForm(false); setEditLead(null) }}>
          <LeadForm
            initial={editLead ?? {}}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditLead(null) }}
          />
        </Modal>
      )}
    </div>
  )
}
