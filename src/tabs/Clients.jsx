import { useState } from 'react'
import { Plus, ArrowLeft, Edit2, Trash2, Phone, Mail, MapPin, ExternalLink, Upload } from 'lucide-react'
import { Modal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { CSVImporter } from '../components/CSVImporter.jsx'
import { PIPELINE_STAGES, SECTORS, SOURCES } from '../config/studio.js'

const STAGE_COLORS = {
  Lead: 'lead', Quoted: 'quoted', Confirmed: 'confirmed',
  Active: 'active', Complete: 'complete', Lost: 'lost',
}

function fmt(n) {
  if (!n) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(n)
}

function fmtExVAT(total, vat) {
  if (!total && total !== 0) return '—'
  const exVAT = total && vat ? total - vat : total
  const fmtd = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(exVAT)
  return `${fmtd} + VAT`
}

function projectValue(p) {
  if (p.paymentTranches?.length) return p.paymentTranches.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  return (p.phases ?? []).reduce((s, ph) => s + (Number(ph.value) || 0), 0)
}

function Badge({ stage }) {
  const key = (stage ?? '').toLowerCase().replace(/\s/g, '-')
  return <span className={`badge badge-${STAGE_COLORS[stage] ?? key}`}>{stage}</span>
}

// ─── Client Form ─────────────────────────────────────────────────────────────
function ClientForm({ initial = {}, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', company: '', role: '', email: '', phone: '',
    pipelineStage: 'Lead', sector: '', source: '', address: '',
    lastContactDate: '', notes: '',
    ...initial,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inp = (k) => ({ value: form[k] ?? '', onChange: e => set(k, e.target.value) })

  return (
    <>
      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" {...inp('name')} />
        </div>
        <div className="form-group">
          <label className="form-label">Company</label>
          <input className="form-input" {...inp('company')} />
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <input className="form-input" {...inp('role')} />
        </div>
        <div className="form-group">
          <label className="form-label">Pipeline Stage</label>
          <select className="form-select" {...inp('pipelineStage')}>
            {PIPELINE_STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" {...inp('email')} />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" type="tel" {...inp('phone')} />
        </div>
        <div className="form-group">
          <label className="form-label">Sector</label>
          <select className="form-select" {...inp('sector')}>
            <option value="">— Select —</option>
            {SECTORS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Source / Referrer</label>
          <select className="form-select" {...inp('source')}>
            <option value="">— Select —</option>
            {SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Last Contact Date</label>
          <input className="form-input" type="date" {...inp('lastContactDate')} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Address</label>
        <input className="form-input" {...inp('address')} />
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" rows={4} {...inp('notes')} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { if (form.name.trim()) onSave(form) }}>
          {initial.id ? 'Save Changes' : 'Add Client'}
        </button>
      </div>
    </>
  )
}

// ─── Client Detail ────────────────────────────────────────────────────────────
function ClientDetail({ client, projects, documents, onBack, onEdit, onDelete, onNav }) {
  const ltv = projects
    .filter(p => p.clientId === client.id && p.status === 'Active')
    .reduce((s, p) => {
      if (p.paymentTranches?.length) return s + p.paymentTranches.reduce((ts, t) => ts + (Number(t.amount) || 0), 0)
      return s + (p.phases ?? []).reduce((ps, ph) => ps + (Number(ph.value) || 0), 0)
    }, 0)

  const clientProjects = projects.filter(p => p.clientId === client.id)
  const clientDocs = documents.filter(d => d.clientId === client.id)

  return (
    <div>
      <button className="detail-back" onClick={onBack}>
        <ArrowLeft size={12} /> Clients
      </button>
      <div className="detail-header">
        <div>
          <h1 className="detail-title">{client.company || client.name}</h1>
          {client.company
            ? <p className="detail-sub">{client.name}{client.role ? ` · ${client.role}` : ''}</p>
            : client.role && <p className="detail-sub">{client.role}</p>
          }
        </div>
        <div className="detail-actions">
          <button className="btn" onClick={onEdit}><Edit2 size={13} /> Edit</button>
          <button className="btn btn-danger" onClick={onDelete}><Trash2 size={13} /> Delete</button>
        </div>
      </div>

      <div className="meta-grid">
        <div className="meta-item">
          <span className="meta-key">Stage</span>
          <span className="meta-val"><Badge stage={client.pipelineStage} /></span>
        </div>
        <div className="meta-item">
          <span className="meta-key">Sector</span>
          <span className="meta-val">{client.sector || '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-key">Source</span>
          <span className="meta-val">{client.source || '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-key">Lifetime Value</span>
          <span className="meta-val ltv">{ltv ? fmt(ltv) : '—'}</span>
        </div>
        {client.email && (
          <div className="meta-item">
            <span className="meta-key">Email</span>
            <a href={`mailto:${client.email}`} className="meta-val" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Mail size={13} />{client.email}
            </a>
          </div>
        )}
        {client.phone && (
          <div className="meta-item">
            <span className="meta-key">Phone</span>
            <a href={`tel:${client.phone}`} className="meta-val" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Phone size={13} />{client.phone}
            </a>
          </div>
        )}
        {client.lastContactDate && (
          <div className="meta-item">
            <span className="meta-key">Last Contact</span>
            <span className="meta-val">{new Date(client.lastContactDate).toLocaleDateString('en-GB')}</span>
          </div>
        )}
        {client.address && (
          <div className="meta-item" style={{ gridColumn: '1/-1' }}>
            <span className="meta-key">Address</span>
            <span className="meta-val" style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
              <MapPin size={13} style={{ marginTop: 2, flexShrink: 0 }} />{client.address}
            </span>
          </div>
        )}
        {client.notes && (
          <div className="meta-item" style={{ gridColumn: '1/-1' }}>
            <span className="meta-key">Notes</span>
            <span className="meta-val" style={{ whiteSpace: 'pre-wrap' }}>{client.notes}</span>
          </div>
        )}
      </div>

      <div className="divider" />

      <p className="section-label">Projects ({clientProjects.length})</p>
      {clientProjects.length === 0
        ? <p className="text-muted" style={{ marginBottom: 24 }}>No projects yet.</p>
        : (
          <div className="linked-list" style={{ marginBottom: 32 }}>
            {clientProjects.map(p => {
              const total = projectValue(p)
              return (
                <div key={p.id} className="linked-item" onClick={() => onNav('projects', p.id)}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                    {p.projectType && <span className="text-muted" style={{ marginLeft: 8 }}>{p.projectType}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {total > 0 && <span className="currency">{fmt(total)} + VAT</span>}
                    <Badge stage={p.status} />
                    <ExternalLink size={13} style={{ color: 'var(--ink-muted)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )
      }

      <p className="section-label">Documents ({clientDocs.length})</p>
      {clientDocs.length === 0
        ? <p className="text-muted">No documents yet.</p>
        : (
          <div className="linked-list">
            {clientDocs.map(d => (
              <div key={d.id} className="linked-item" onClick={() => onNav('documents', d.id)}>
                <div>
                  <span className="text-mono" style={{ marginRight: 10 }}>
                    {d.invoiceNumber ? `${d.invoiceNumber} /` : ''} {d.type?.toUpperCase()}
                  </span>
                  <span style={{ fontWeight: 500 }}>{d.projectName ?? d.type}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {d.total != null && <span className="currency">{fmtExVAT(d.total, d.vat)}</span>}
                  <Badge stage={d.status} />
                  <ExternalLink size={13} style={{ color: 'var(--ink-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

// ─── Clients Tab ─────────────────────────────────────────────────────────────
export default function Clients({ store, onNav }) {
  const toast = useToast()
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')

  const { clients, projects, documents, createClient, updateClient, deleteClient, clientLTV } = store

  // Classify clients by their project statuses
  const classifyClient = (clientId) => {
    const clientProjects = projects.filter(p => p.clientId === clientId)
    const statuses = clientProjects.map(p => p.status)
    if (statuses.includes('Active')) return 'Existing'
    if (statuses.some(s => ['Confirmed', 'Quoted', 'Lead'].includes(s))) return 'Leads'
    return 'Previous'
  }

  // Only show Existing and Previous clients — Leads are tracked in Pipeline
  const filtered = clients.filter(c => {
    const classification = classifyClient(c.id)
    if (classification === 'Leads') return false
    const q = search.toLowerCase()
    const matches = !q || [c.name, c.company, c.email, c.role].some(v => v?.toLowerCase().includes(q))
    const sectorOk = !sectorFilter || c.sector === sectorFilter
    return matches && sectorOk
  })

  const selected = clients.find(c => c.id === selectedId)

  async function handleSave(data) {
    try {
      if (editClient) {
        await updateClient(editClient.id, data)
        toast('Client updated', 'success')
      } else {
        await createClient(data)
        toast('Client added', 'success')
      }
      setShowForm(false)
      setEditClient(null)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this client? This cannot be undone.')) return
    await deleteClient(id)
    setSelectedId(null)
    toast('Client deleted', 'info')
  }

  async function handleImport(clientsToImport) {
    try {
      for (const data of clientsToImport) {
        await createClient(data)
      }
    } catch (e) {
      toast(e.message, 'error')
      throw e
    }
  }

  // Show ClientDetail if a client is selected
  if (selected) {
    return (
      <>
        <ClientDetail
          client={selected}
          projects={projects}
          documents={documents}
          onBack={() => setSelectedId(null)}
          onEdit={() => { setEditClient(selected); setShowForm(true) }}
          onDelete={() => handleDelete(selected.id)}
          onNav={onNav}
        />
        {showForm && (
          <Modal title="Edit Client" onClose={() => { setShowForm(false); setEditClient(null) }}>
            <ClientForm
              initial={editClient}
              onSave={handleSave}
              onClose={() => { setShowForm(false); setEditClient(null) }}
            />
          </Modal>
        )}
      </>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Clients</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setShowImport(true)}>
            <Upload size={14} /> Import CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Add Client
          </button>
        </div>
      </div>

      <div className="filter-row">
        <input
          className="search-input"
          placeholder="Search by name, company, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter-select" value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}>
          <option value="">All Sectors</option>
          {SECTORS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No clients yet</p>
          <p className="text-muted">Add your first client to get started.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Sector</th>
                <th>Source</th>
                <th>Last Contact</th>
                <th>LTV</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} onClick={() => setSelectedId(c.id)}>
                  <td style={{ fontWeight: 500 }}>{c.company || c.name}</td>
                  <td className="text-muted">{c.company ? c.name : '—'}</td>
                  <td><span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{classifyClient(c.id)}</span></td>
                  <td className="text-muted">{c.sector || '—'}</td>
                  <td className="text-muted">{c.source || '—'}</td>
                  <td className="text-muted">
                    {c.lastContactDate ? new Date(c.lastContactDate).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="ltv">{clientLTV(c.id) ? fmt(clientLTV(c.id)) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal
          title={editClient ? 'Edit Client' : 'Add Client'}
          onClose={() => { setShowForm(false); setEditClient(null) }}
        >
          <ClientForm
            initial={editClient ?? {}}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditClient(null) }}
          />
        </Modal>
      )}

      {showImport && (
        <Modal title="Import Clients from CSV" onClose={() => setShowImport(false)} size="lg">
          <CSVImporter onImport={handleImport} onClose={() => setShowImport(false)} />
        </Modal>
      )}
    </div>
  )
}
