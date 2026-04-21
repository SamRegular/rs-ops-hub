import { useState } from 'react'
import { Plus, Edit2, Trash2, Receipt, Pause, Play, XCircle } from 'lucide-react'
import { Modal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { generateRetainerInvoice } from '../ai/anthropic.js'

function fmt(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(n)
}

function Badge({ status }) {
  return <span className={`badge badge-${status ?? 'draft'}`}>{status}</span>
}

// ─── Retainer Form ────────────────────────────────────────────────────────────
function RetainerForm({ initial = {}, clients, onSave, onClose }) {
  const [form, setForm] = useState({
    clientId: '', description: '', monthlyFee: '',
    invoiceDayOfMonth: 1, startDate: '', status: 'active',
    ...initial,
    monthlyFee: initial.monthlyFee ?? '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inp = (k) => ({ value: form[k] ?? '', onChange: e => set(k, e.target.value) })

  return (
    <>
      <div className="form-grid form-grid-2">
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Client *</label>
          <select className="form-select" {...inp('clientId')}>
            <option value="">— Select client —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Description *</label>
          <input className="form-input" {...inp('description')} placeholder="e.g. Social media management, Brand retainer…" />
        </div>
        <div className="form-group">
          <label className="form-label">Monthly Fee (ex VAT) £</label>
          <input className="form-input" type="number" min="0" step="100" {...inp('monthlyFee')} style={{ fontFamily: 'var(--font-mono)' }} />
        </div>
        <div className="form-group">
          <label className="form-label">Invoice Day of Month</label>
          <input className="form-input" type="number" min="1" max="28" {...inp('invoiceDayOfMonth')} />
        </div>
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input className="form-input" type="date" {...inp('startDate')} />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" {...inp('status')}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="ended">Ended</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { if (form.clientId && form.description && form.monthlyFee) onSave(form) }}>
          {initial.id ? 'Save Changes' : 'Add Retainer'}
        </button>
      </div>
    </>
  )
}

// ─── Generate Retainer Invoice Modal ─────────────────────────────────────────
function GenerateRetainerInvoiceModal({ retainer, client, store, onClose, onCreated }) {
  const toast = useToast()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [generating, setGenerating] = useState(false)

  const invoiceNumber = store.getNextInvoiceNumber()
  const vat = retainer.monthlyFee * 0.2
  const total = retainer.monthlyFee + vat

  async function handleGenerate() {
    setGenerating(true)
    try {
      const result = await generateRetainerInvoice({
        client, retainer, invoiceNumber, month, year, dueDate,
      })
      const monthLabel = new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      const doc = await store.createDocument({
        type: 'invoice',
        invoiceNumber,
        clientId: client.id,
        retainerId: retainer.id,
        status: 'draft',
        content: result.content,
        amount: retainer.monthlyFee,
        vat: result.vat,
        total: result.total,
        dueDate,
        description: `${retainer.description} — ${monthLabel}`,
        projectName: `Retainer: ${retainer.description}`,
      })
      toast(`Invoice ${invoiceNumber} generated`, 'success')
      onCreated(doc)
      onClose()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']

  return (
    <Modal title={`Retainer Invoice — ${invoiceNumber}`} onClose={onClose}>
      {generating ? (
        <div className="generating-overlay">
          <div className="spinner" />
          <span className="generating-text">Generating invoice with Claude…</span>
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--bg)', padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: '0.875rem', marginBottom: 4 }}>
            <strong>{retainer.description}</strong> — {fmt(retainer.monthlyFee)}/mo ex VAT
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input className="form-input" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div style={{ background: 'var(--bg)', padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="text-muted">Monthly fee</span><span className="currency">{fmt(retainer.monthlyFee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="text-muted">VAT (20%)</span><span className="currency">{fmt(vat)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Total</span><span className="currency">{fmt(total)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-accent" onClick={handleGenerate}><Receipt size={14} /> Generate Invoice</button>
          </div>
        </>
      )}
    </Modal>
  )
}

// ─── Retainers Tab ─────────────────────────────────────────────────────────────
export default function Retainers({ store, onNav }) {
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editRetainer, setEditRetainer] = useState(null)
  const [invoiceModal, setInvoiceModal] = useState(null)
  const [statusFilter, setStatusFilter] = useState('active')

  const { clients, retainers, createRetainer, updateRetainer, deleteRetainer } = store

  const filtered = retainers.filter(r => !statusFilter || r.status === statusFilter)

  const activeRetainers = retainers.filter(r => r.status === 'active')
  const mrr = activeRetainers.reduce((s, r) => s + Number(r.monthlyFee || 0), 0)
  const arr = mrr * 12
  const mrrWithVat = mrr * 1.2

  async function handleSave(data) {
    try {
      const payload = { ...data, monthlyFee: Number(data.monthlyFee), invoiceDayOfMonth: Number(data.invoiceDayOfMonth) }
      if (editRetainer) {
        await updateRetainer(editRetainer.id, payload)
        toast('Retainer updated', 'success')
      } else {
        await createRetainer(payload)
        toast('Retainer added', 'success')
      }
      setShowForm(false)
      setEditRetainer(null)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this retainer?')) return
    await deleteRetainer(id)
    toast('Retainer deleted', 'info')
  }

  async function handleStatusChange(id, status) {
    await updateRetainer(id, { status })
    toast(`Retainer ${status}`, 'info')
  }

  const ordinal = (n) => {
    const s = ['th','st','nd','rd']
    const v = n % 100
    return n + (s[(v-20)%10] || s[v] || s[0])
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Retainers</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add Retainer</button>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Active Retainers</span>
          <span className="stat-value">{activeRetainers.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">MRR (ex VAT)</span>
          <span className="stat-value accent">{mrr ? fmt(mrr) : '—'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">MRR (inc VAT)</span>
          <span className="stat-value">{mrr ? fmt(mrrWithVat) : '—'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Annual Run Rate</span>
          <span className="stat-value">{arr ? fmt(arr) : '—'}</span>
        </div>
      </div>

      <div className="filter-row">
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="ended">Ended</option>
        </select>
      </div>

      {filtered.length === 0
        ? (
          <div className="empty-state">
            <p className="empty-state-title">No retainers yet</p>
            <p className="text-muted">Add recurring client work as a retainer to track MRR.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Description</th>
                  <th>Monthly Fee</th>
                  <th>Inc VAT</th>
                  <th>Invoice Day</th>
                  <th>Start Date</th>
                  <th>Status</th>
                  <th style={{ width: 180 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const client = clients.find(c => c.id === r.clientId)
                  return (
                    <tr key={r.id} style={{ cursor: 'default' }}>
                      <td style={{ fontWeight: 500 }}>{client?.name ?? '—'}</td>
                      <td className="text-muted">{r.description}</td>
                      <td className="currency">{fmt(r.monthlyFee)}</td>
                      <td className="currency" style={{ color: 'var(--ink-muted)' }}>{fmt(r.monthlyFee * 1.2)}</td>
                      <td className="text-mono" style={{ color: 'var(--ink-muted)' }}>{ordinal(r.invoiceDayOfMonth)}</td>
                      <td className="text-muted">{r.startDate ? new Date(r.startDate).toLocaleDateString('en-GB') : '—'}</td>
                      <td><Badge status={r.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => { if (client) setInvoiceModal({ retainer: r, client }) }}
                            title="Generate invoice"
                          >
                            <Receipt size={12} />
                          </button>
                          <button className="btn btn-sm btn-ghost" onClick={() => { setEditRetainer(r); setShowForm(true) }} title="Edit">
                            <Edit2 size={12} />
                          </button>
                          {r.status === 'active' && (
                            <button className="btn btn-sm btn-ghost" onClick={() => handleStatusChange(r.id, 'paused')} title="Pause">
                              <Pause size={12} />
                            </button>
                          )}
                          {r.status === 'paused' && (
                            <button className="btn btn-sm btn-ghost" onClick={() => handleStatusChange(r.id, 'active')} title="Resume">
                              <Play size={12} />
                            </button>
                          )}
                          {r.status !== 'ended' && (
                            <button className="btn btn-sm btn-ghost" onClick={() => handleStatusChange(r.id, 'ended')} title="End retainer">
                              <XCircle size={12} />
                            </button>
                          )}
                          <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(r.id)} title="Delete" style={{ color: '#C0392B' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }

      {showForm && (
        <Modal title={editRetainer ? 'Edit Retainer' : 'Add Retainer'} onClose={() => { setShowForm(false); setEditRetainer(null) }}>
          <RetainerForm
            initial={editRetainer ?? {}}
            clients={clients}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditRetainer(null) }}
          />
        </Modal>
      )}

      {invoiceModal && (
        <GenerateRetainerInvoiceModal
          retainer={invoiceModal.retainer}
          client={invoiceModal.client}
          store={store}
          onClose={() => setInvoiceModal(null)}
          onCreated={(doc) => { onNav('documents', doc.id); setInvoiceModal(null) }}
        />
      )}
    </div>
  )
}
