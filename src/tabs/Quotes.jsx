import { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { Modal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'

function fmt(n) {
  if (!n && n !== 0) return '—'
  return '£' + Math.round(n).toLocaleString('en-GB')
}

function fmtK(n) {
  return n >= 1000 ? '£' + (n / 1000).toFixed(1) + 'k' : fmt(n)
}

function fmtDays(d) {
  if (d === 0) return '0'
  const w = Math.floor(d)
  const f = Math.round((d - w) * 100) / 100
  const fm = { 0.25: '¼', 0.5: '½', 0.75: '¾' }
  const fs = fm[f] || ''
  return w === 0 ? fs : fs ? `${w}${fs}` : `${w}`
}

const RATES = { cd: 825, ds: 425, cw: 425 }
const RLABELS = { cd: 'Creative Director', ds: 'Designer', cw: 'Copywriter' }

// Quote builder modal
function QuoteFormModal({ isOpen, onClose, quote, clients, onSave, onCreateClient }) {
  const [days, setDays] = useState({ cd: 0, ds: 0, cw: 0 })
  const [selectedClientId, setSelectedClientId] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [jobDesc, setJobDesc] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)

  useEffect(() => {
    if (quote) {
      setDays(quote.days)
      setSelectedClientId(quote.client_id)
      setJobDesc(quote.job)
      setShowNewClient(false)
      setNewClientName('')
    } else {
      setDays({ cd: 0, ds: 0, cw: 0 })
      setSelectedClientId('')
      setJobDesc('')
      setShowNewClient(false)
      setNewClientName('')
    }
  }, [quote, isOpen])

  function calcTotals(d) {
    const fee = Object.entries(RATES).reduce((s, [r, rate]) => s + d[r] * rate, 0)
    const pm = fee * 0.125
    const project_fee = fee + pm
    const vat = project_fee * 0.20
    return { fee, pm, project_fee, vat, grand: project_fee + vat }
  }

  function adj(role, delta) {
    setDays(prev => ({ ...prev, [role]: Math.max(0, Math.round((prev[role] + delta) * 100) / 100) }))
  }

  async function handleSave() {
    if (!showNewClient && !selectedClientId) {
      alert('Select a client'); return
    }
    if (showNewClient && !newClientName.trim()) {
      alert('Enter client name'); return
    }
    const { fee, pm, grand } = calcTotals(days)
    if (fee === 0) {
      alert('Add at least one day'); return
    }

    let client_id = selectedClientId
    if (showNewClient) {
      const newClient = await onCreateClient({ name: newClientName.trim() })
      client_id = newClient.id
    }

    const totals = calcTotals(days)
    onSave({
      client_id,
      job: jobDesc || 'No description',
      days: { ...days },
      project_fee: totals.project_fee,
      pm: totals.pm,
      grand: totals.grand
    })
    onClose()
  }

  if (!isOpen) return null

  const { fee, pm, project_fee, vat, grand } = calcTotals(days)
  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <Modal title={quote ? 'Edit Quote' : 'New Quote'} onClose={onClose}>
      <div style={{ paddingBottom: 20 }}>
        <label className="form-label">Client</label>
        {!showNewClient ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <select className="form-input" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} style={{ flex: 1 }}>
              <option value="">— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
            </select>
            <button className="btn" onClick={() => setShowNewClient(true)}>+ New</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input className="form-input" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Client name" style={{ flex: 1 }} />
            <button className="btn" onClick={() => setShowNewClient(false)}>Cancel</button>
          </div>
        )}

        <label className="form-label">Job Description</label>
        <textarea className="form-input" value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="e.g. Brand identity refresh" style={{ minHeight: 80, marginBottom: 14 }} />

        <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Team &amp; Days</label>
        {Object.entries(RATES).map(([role, rate]) => (
          <div key={role} className="card" style={{ marginBottom: 10, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 500 }}>{RLABELS[role]}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>£{rate} / day</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px' }}>
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="btn" style={{ width: 34, height: 34, padding: 0, fontSize: '0.75rem' }} onClick={() => adj(role, -1)}>−</button>
                <button className="btn" style={{ width: 34, height: 34, padding: 0, fontSize: '0.75rem' }} onClick={() => adj(role, -0.25)}>−¼</button>
                <span style={{ fontSize: '1.125rem', fontWeight: 600, minWidth: 44, textAlign: 'center' }}>{fmtDays(days[role])}</span>
                <button className="btn" style={{ width: 34, height: 34, padding: 0, fontSize: '0.75rem' }} onClick={() => adj(role, 0.25)}>+¼</button>
                <button className="btn" style={{ width: 34, height: 34, padding: 0, fontSize: '0.75rem' }} onClick={() => adj(role, 1)}>+</button>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600, color: days[role] > 0 ? 'var(--accent)' : 'var(--subtle)' }}>
                {days[role] > 0 ? fmt(days[role] * rate) : '—'}
              </span>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>PM (12.5%)</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{fmt(pm)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>Project fee</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{fmt(project_fee)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>VAT (20%)</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{fmt(vat)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--accent-dim)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--accent)' }}>Total (inc VAT)</span>
            <span style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent)' }}>{fmt(grand)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>Save Quote</button>
      </div>
    </Modal>
  )
}

// Quote detail modal with revision log
function QuoteDetailModal({ isOpen, onClose, quote, clients, onStatusChange, onConvertToProject, onRevise }) {
  if (!isOpen || !quote) return null

  const client = clients.find(c => c.id === quote.client_id)
  const current = quote.revision || quote
  const hasRevisions = quote.revisions && quote.revisions.length > 0

  return (
    <Modal title={`Quote Details`} onClose={onClose} size="lg">
      <div style={{ paddingBottom: 20 }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>Client</h3>
          <p style={{ fontSize: '0.875rem' }}>{client?.company || client?.name || '—'}</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>Job Description</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-muted)' }}>{quote.job}</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>Breakdown</h3>
          <div style={{ background: 'var(--surface)', borderRadius: 8, overflow: 'hidden' }}>
            {Object.entries(RATES).map(([role, rate]) => {
              const d = current.days[role]
              if (d === 0) return null
              return (
                <div key={role} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                  <span>{RLABELS[role]} × {fmtDays(d)}d</span>
                  <span style={{ fontFamily: 'monospace' }}>{fmt(d * rate)}</span>
                </div>
              )
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
              <span>PM (12.5%)</span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(current.pm)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', background: 'var(--surface)', color: 'var(--ink-muted)', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <span>Project fee</span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(current.project_fee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', background: 'var(--surface)', color: 'var(--ink-muted)' }}>
              <span>VAT (20%)</span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(current.grand - (current.project_fee + current.pm))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--accent-dim)', fontWeight: 600 }}>
              <span>Total (inc VAT)</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{fmt(current.grand)}</span>
            </div>
          </div>
        </div>

        {hasRevisions && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>Revision History</h3>
            <div style={{ background: 'var(--surface)', borderRadius: 8, overflow: 'hidden' }}>
              {quote.revisions.map((rev, i) => (
                <div key={i} style={{ padding: '10px 12px', borderBottom: i < quote.revisions.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>Revision {i + 1}</span>
                    <span style={{ color: 'var(--ink-muted)' }}>{fmt(rev.grand)}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{rev.date}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {quote.status === 'waiting' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => onStatusChange('denied')}>Deny</button>
            <button className="btn btn-sm" style={{ color: 'var(--accent)' }} onClick={() => onRevise()}>Revise</button>
            <button className="btn btn-sm" style={{ color: '#4CAF78', borderColor: 'rgba(76,175,120,0.3)' }} onClick={() => onConvertToProject()}>Sign Off</button>
          </div>
        )}

        {quote.status === 'signed' && (
          <button className="btn btn-primary" onClick={() => onConvertToProject()}>Convert to Project</button>
        )}

        <button className="btn" style={{ marginTop: 8, width: '100%' }} onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}

export default function Quotes({ store, onNav }) {
  const toast = useToast()
  const [currentFilter, setCurrentFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingQuote, setEditingQuote] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [detailQuote, setDetailQuote] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [revisingQuote, setRevisingQuote] = useState(null)

  async function handleSaveQuote(data) {
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    try {
      if (editingQuote) {
        await store.updateQuote(editingQuote.id, { ...data, updated_at: today })
        toast('Quote updated')
      } else {
        await store.createQuote({
          ...data,
          date: today,
          status: 'waiting',
          revisions: [],
          created_at: today
        })
        toast('Quote created')
      }
      setEditingQuote(null)
      setShowForm(false)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function handleCreateClient(data) {
    const newClient = await store.createClient(data)
    return newClient
  }

  async function handleStatusChange(quoteId, status) {
    try {
      await store.updateQuote(quoteId, { status })
      toast(`Quote marked as ${status}`)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function handleConvertToProject(quote) {
    const client = store.clients.find(c => c.id === quote.client_id)
    if (!client) {
      toast('Client not found', 'error')
      return
    }

    try {
      const project = await store.createProject({
        name: `${quote.job} — ${quote.date}`,
        client_id: quote.client_id,
        status: 'Quoted',
        value: quote.grand,
        description: quote.job,
        quoteId: quote.id
      })
      handleStatusChange(quote.id, 'signed')
      setShowDetailModal(false)
      toast('Quote converted to project')
      onNav('projects', project.id)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  function handleRevise(quote) {
    setRevisingQuote(quote)
    setShowForm(true)
  }

  async function handleSaveRevision(data) {
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const quote = revisingQuote
    try {
      const revisions = [...(quote.revisions || []), { grand: quote.grand, date: today }]
      await store.updateQuote(quote.id, { ...data, revisions, status: 'waiting' })
      toast('Quote revised')
      setRevisingQuote(null)
      setShowForm(false)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function deleteQuote(id) {
    try {
      await store.deleteQuote(id)
      toast('Quote deleted')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const filtered = currentFilter === 'all' ? store.quotes : store.quotes.filter(q => q.status === currentFilter)
  const counts = { waiting: 0, signed: 0, denied: 0 }
  store.quotes.forEach(q => { if (counts[q.status] !== undefined) counts[q.status]++ })

  const total = store.quotes.reduce((s, q) => s + q.grand, 0)
  const signedTotal = store.quotes.filter(q => q.status === 'signed').reduce((s, q) => s + (q.revision ? q.revision.grand : q.grand), 0)
  const avg = store.quotes.length ? total / store.quotes.length : 0

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Quote Builder</h1>
        <button className="btn btn-primary" onClick={() => { setEditingQuote(null); setRevisingQuote(null); setShowForm(true) }}>
          <Plus size={14} /> New Quote
        </button>
      </div>

      <QuoteFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingQuote(null); setRevisingQuote(null) }}
        quote={editingQuote || revisingQuote}
        clients={store.clients}
        onSave={revisingQuote ? handleSaveRevision : handleSaveQuote}
        onCreateClient={handleCreateClient}
      />

      {detailQuote && (
        <QuoteDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          quote={detailQuote}
          clients={store.clients}
          onStatusChange={(status) => handleStatusChange(detailQuote.id, status)}
          onConvertToProject={() => handleConvertToProject(detailQuote)}
          onRevise={() => handleRevise(detailQuote)}
        />
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
          {['all', 'waiting', 'signed', 'denied'].map(status => (
            <button
              key={status}
              className="btn"
              onClick={() => setCurrentFilter(status)}
              style={{
                padding: '7px 12px',
                fontSize: '0.75rem',
                background: currentFilter === status ? 'var(--accent-dim)' : 'var(--surface)',
                color: currentFilter === status ? 'var(--text)' : 'var(--ink-muted)',
                border: currentFilter === status ? '1px solid var(--accent)' : '1px solid var(--border)',
                whiteSpace: 'nowrap'
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} <span style={{ fontSize: '0.7rem' }}>({status === 'all' ? store.quotes.length : counts[status]})</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginBottom: 20, borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ padding: '12px 10px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Quoted</div>
          <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>{store.quotes.length ? fmtK(total) : '£0'}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: 2 }}>+ VAT</div>
        </div>
        <div style={{ padding: '12px 10px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Signed</div>
          <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: 600, color: '#4CAF78' }}>{signedTotal ? fmtK(signedTotal) : '£0'}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: 2 }}>+ VAT</div>
        </div>
        <div style={{ padding: '12px 10px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Avg</div>
          <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>{store.quotes.length ? fmtK(avg) : '—'}</div>
        </div>
        <div style={{ padding: '12px 10px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Count</div>
          <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>{store.quotes.length}</div>
        </div>
      </div>

      <div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No quotes yet</p>
            <p className="text-muted">Build your first quote to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(q => {
              const isExpanded = expandedId === q.id
              const client = store.clients.find(c => c.id === q.client_id)
              const current = q.revision || q
              return (
                <div key={q.id} className="card" style={{ borderLeft: `3px solid ${q.status === 'waiting' ? '#E09B3D' : q.status === 'signed' ? '#4CAF78' : '#E06C6C'}` }}>
                  <div
                    style={{
                      padding: '13px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      background: 'var(--surface)',
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{client?.company || client?.name || 'Unknown Client'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '190px' }}>{q.job}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                        <span>{q.date}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', padding: '2px 7px', borderRadius: 3, background: q.status === 'waiting' ? 'var(--amber-dim)' : q.status === 'signed' ? 'var(--green-dim)' : 'var(--red-dim)', color: q.status === 'waiting' ? '#E09B3D' : q.status === 'signed' ? '#4CAF78' : '#E06C6C' }}>
                          {q.status}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: 10, flexShrink: 0 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)' }}>{fmtK(current.project_fee)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: 2 }}>+ VAT</div>
                      <div style={{ fontSize: '0.7rem', marginTop: 4 }}>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.8rem', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 500, marginBottom: 8 }}>Breakdown</div>
                        {Object.entries(RATES).map(([role, rate]) => {
                          const d = current.days[role]
                          if (d === 0) return null
                          return (
                            <div key={role} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4, color: 'var(--ink-muted)' }}>
                              <span>{RLABELS[role]} × {fmtDays(d)}d</span>
                              <span style={{ fontFamily: 'monospace' }}>{fmt(d * rate)}</span>
                            </div>
                          )
                        })}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4, color: 'var(--ink-muted)' }}>
                          <span>PM (12.5%)</span>
                          <span style={{ fontFamily: 'monospace' }}>{fmt(current.pm)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2, color: 'var(--ink-muted)', padding: '4px 0', background: 'var(--surface)', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                          <span>Project fee</span>
                          <span style={{ fontFamily: 'monospace' }}>{fmt(current.project_fee)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4, color: 'var(--ink-muted)', padding: '4px 0', background: 'var(--surface)' }}>
                          <span>VAT (20%)</span>
                          <span style={{ fontFamily: 'monospace' }}>{fmt(current.grand - (current.project_fee + current.pm))}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                          <span>Total (inc VAT)</span>
                          <span style={{ fontFamily: 'monospace' }}>{fmt(current.grand)}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                        <button className="btn btn-sm" onClick={() => { setEditingQuote(q); setShowForm(true) }}><Edit2 size={12} /></button>
                        <button className="btn btn-sm" style={{ color: '#E06C6C' }} onClick={() => deleteQuote(q.id)}><Trash2 size={12} /></button>
                        {q.status === 'waiting' && (
                          <>
                            <button className="btn btn-sm" style={{ color: 'var(--ink-muted)' }} onClick={() => handleStatusChange(q.id, 'denied')}>Deny</button>
                            <button className="btn btn-sm" style={{ color: 'var(--accent)' }} onClick={() => handleRevise(q)}>Revise</button>
                          </>
                        )}
                        {(q.status === 'waiting' || q.status === 'signed') && (
                          <button className="btn btn-sm" style={{ color: '#4CAF78', borderColor: 'rgba(76,175,120,0.3)' }} onClick={() => { setDetailQuote(q); setShowDetailModal(true) }}>Details</button>
                        )}
                      </div>

                      {q.revisions && q.revisions.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                          <div style={{ fontWeight: 500, marginBottom: 4 }}>Negotiation history:</div>
                          {q.revisions.map((rev, i) => <div key={i}>Revision {i + 1}: {fmt(rev.grand)} ({rev.date})</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
