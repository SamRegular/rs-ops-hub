import { useState } from 'react'
import { Plus, ArrowLeft, Edit2, Trash2, Trash, ExternalLink, Receipt } from 'lucide-react'
import { Modal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { PIPELINE_STAGES, PROJECT_TYPES } from '../config/studio.js'

const PROJECT_STAGES = ['Quoted', 'Confirmed', 'Active', 'Complete']

const STAGE_COLORS = {
  Lead: 'lead', Quoted: 'quoted', Confirmed: 'confirmed',
  Active: 'active', Complete: 'complete', Lost: 'lost',
}

function fmt(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(n)
}

function Badge({ stage }) {
  const key = (stage ?? '').toLowerCase().replace(/\s/g, '-')
  return <span className={`badge badge-${STAGE_COLORS[stage] ?? key}`}>{stage}</span>
}

// ─── Deliverables Editor ──────────────────────────────────────────────────────
function DeliverablesEditor({ deliverables, onChange }) {
  const add = () => onChange([...deliverables, { id: crypto.randomUUID(), name: '' }])
  const remove = (id) => onChange(deliverables.filter(d => d.id !== id))
  const set = (id, v) => onChange(deliverables.map(d => d.id === id ? { ...d, name: v } : d))

  return (
    <div>
      <div className="phases-list">
        {deliverables.map(d => (
          <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 32px', gap: 8, marginBottom: 6 }}>
            <input className="form-input" placeholder="Deliverable name" value={d.name} onChange={e => set(d.id, e.target.value)} />
            <button className="btn btn-ghost btn-sm" onClick={() => remove(d.id)} style={{ padding: '4px', color: 'var(--ink-muted)' }}>
              <Trash size={14} />
            </button>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={add} style={{ marginTop: 8 }}>
        <Plus size={13} /> Add Deliverable
      </button>
    </div>
  )
}

// ─── Payment Tranches Editor ───────────────────────────────────────────────────
function PaymentTranchesEditor({ tranches, onChange }) {
  const add = () => onChange([...tranches, { id: crypto.randomUUID(), label: '', month: '', amount: '' }])
  const remove = (id) => onChange(tranches.filter(t => t.id !== id))
  const set = (id, k, v) => onChange(tranches.map(t => t.id === id ? { ...t, [k]: v } : t))
  const total = tranches.reduce((s, t) => s + (Number(t.amount) || 0), 0)

  return (
    <div>
      {tranches.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 32px', gap: 8, marginBottom: 6 }}>
          <span className="form-label">Label</span>
          <span className="form-label">Month</span>
          <span className="form-label">Amount (£)</span>
          <span />
        </div>
      )}
      <div className="phases-list">
        {tranches.map(t => (
          <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 32px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <input className="form-input" placeholder="e.g. Deposit" value={t.label} onChange={e => set(t.id, 'label', e.target.value)} />
            <input className="form-input" type="month" value={t.month} onChange={e => set(t.id, 'month', e.target.value)} />
            <input className="form-input" type="number" min="0" step="100" placeholder="0" value={t.amount} onChange={e => set(t.id, 'amount', e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }} />
            <button className="btn btn-ghost btn-sm" onClick={() => remove(t.id)} style={{ padding: '4px', color: 'var(--ink-muted)' }}>
              <Trash size={14} />
            </button>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={add} style={{ marginTop: 8 }}>
        <Plus size={13} /> Add Tranche
      </button>
      {tranches.length > 0 && (
        <div className="phase-total">
          <span className="text-mono" style={{ color: 'var(--ink-muted)' }}>Total</span>
          <span className="currency" style={{ fontWeight: 500 }}>{fmt(total)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Project Form ─────────────────────────────────────────────────────────────
function ProjectForm({ initial = {}, clients, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', clientId: '', projectType: '', status: 'Lead',
    brief: '', startDate: '',
    ...initial,
    deliverables: (initial.deliverables ?? initial.phases?.map(p => ({ id: p.id, name: p.name })) ?? []).map(d => ({ ...d })),
    paymentTranches: (initial.paymentTranches ?? []).map(t => ({ ...t })),
  })

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v }
    // Auto-set win chance to 100% when status changes to Active or Confirmed
    if (k === 'status' && ['Active', 'Confirmed'].includes(v)) {
      updated.winChance = 100
    }
    return updated
  })
  const inp = (k) => ({ value: form[k] ?? '', onChange: e => set(k, e.target.value) })

  return (
    <>
      <div className="form-grid form-grid-2">
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Project Name *</label>
          <input className="form-input" {...inp('name')} />
        </div>
        <div className="form-group">
          <label className="form-label">Client *</label>
          <select className="form-select" {...inp('clientId')}>
            <option value="">— Select client —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Project Type</label>
          <select className="form-select" {...inp('projectType')}>
            <option value="">— Select type —</option>
            {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" {...inp('status')}>
            {PIPELINE_STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input className="form-input" type="date" {...inp('startDate')} />
        </div>
        {['Lead', 'Quoted', 'Confirmed'].includes(form.status) && (
          <>
            <div className="form-group">
              <label className="form-label">Lead Source</label>
              <input className="form-input" placeholder="e.g., Referral, LinkedIn, Inbound" {...inp('leadSource')} />
            </div>
            <div className="form-group">
              <label className="form-label">Win Chance %</label>
              <input className="form-input" type="number" min="0" max="100" placeholder="e.g., 75" {...inp('winChance')} />
            </div>
            <div className="form-group">
              <label className="form-label">Expected Close Date</label>
              <input className="form-input" type="date" {...inp('expectedCloseDate')} />
            </div>
          </>
        )}
        {form.status === 'Lost' && (
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Why Lost?</label>
            <textarea className="form-textarea" rows={2} placeholder="Reason for losing this project..." {...inp('lossReason')} />
          </div>
        )}
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Brief / Description</label>
          <textarea className="form-textarea" rows={3} {...inp('brief')} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Deliverables</label>
        <DeliverablesEditor deliverables={form.deliverables} onChange={v => set('deliverables', v)} />
      </div>

      <div className="form-group" style={{ marginTop: 16 }}>
        <label className="form-label">Payment Structure</label>
        <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginBottom: 8 }}>Define when payments are due. These inform the cash flow timeline.</p>
        <PaymentTranchesEditor tranches={form.paymentTranches} onChange={v => set('paymentTranches', v)} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { if (form.name.trim() && form.clientId) onSave(form) }}>
          {initial.id ? 'Save Changes' : 'Add Project'}
        </button>
      </div>
    </>
  )
}

// ─── Project Detail ──────────────────────────────────────────────────────────
function ProjectDetail({ project, clients, store, onBack, onEdit, onDelete, onNav }) {

  const client = clients.find(c => c.id === project.clientId)
  const projectDocs = store.documents.filter(d => d.projectId === project.id)
  const total = (project.paymentTranches ?? []).reduce((s, t) => s + Number(t.amount || 0), 0)

  return (
    <div>
      <button className="detail-back" onClick={onBack}><ArrowLeft size={12} /> Projects</button>
      <div className="detail-header">
        <div>
          <h1 className="detail-title">{project.name}</h1>
          {client && (
            <p className="detail-sub" style={{ cursor: 'pointer' }} onClick={() => onNav('clients', client.id)}>
              {client.company || client.name}{client.name && client.company && client.name !== client.company ? ` · ${client.name}` : ''}
            </p>
          )}
        </div>
        <div className="detail-actions">
          <button className="btn" onClick={onEdit}><Edit2 size={13} /> Edit</button>
          <button className="btn btn-danger" onClick={onDelete}><Trash2 size={13} /> Delete</button>
        </div>
      </div>

      <div className="meta-grid">
        <div className="meta-item">
          <span className="meta-key">Type</span>
          <span className="meta-val">{project.projectType || '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-key">Status</span>
          <span className="meta-val"><Badge stage={project.status} /></span>
        </div>
        <div className="meta-item">
          <span className="meta-key">Start Date</span>
          <span className="meta-val">{project.startDate ? new Date(project.startDate).toLocaleDateString('en-GB') : '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-key">Total Value</span>
          <span className="meta-val currency" style={{ fontSize: '1rem', fontWeight: 500 }}>{total ? fmt(total) : '—'}</span>
        </div>
        {project.brief && (
          <div className="meta-item" style={{ gridColumn: '1/-1' }}>
            <span className="meta-key">Brief</span>
            <span className="meta-val" style={{ whiteSpace: 'pre-wrap' }}>{project.brief}</span>
          </div>
        )}
      </div>

      {/* Deliverables */}
      {(project.deliverables?.length > 0 || project.phases?.length > 0) && (
        <>
          <p className="section-label">Deliverables</p>
          <ul style={{ marginBottom: 24, paddingLeft: 20 }}>
            {(project.deliverables ?? project.phases?.map(p => ({ id: p.id, name: p.name })) ?? []).map(d => (
              <li key={d.id} style={{ fontSize: '0.9rem', marginBottom: 4 }}>{d.name}</li>
            ))}
          </ul>
        </>
      )}

      {/* Payment Structure */}
      {project.paymentTranches?.length > 0 && (
        <>
          <p className="section-label">Payment Structure</p>
          <div className="table-wrap" style={{ marginBottom: 32 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tranche</th>
                  <th>Month</th>
                  <th>Amount (ex VAT)</th>
                </tr>
              </thead>
              <tbody>
                {project.paymentTranches.map((t, i) => (
                  <tr key={t.id} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 500 }}>{t.label || `Tranche ${i + 1}`}</td>
                    <td>{t.month ? new Date(t.month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'}</td>
                    <td className="currency">{fmt(Number(t.amount || 0))}</td>
                  </tr>
                ))}
                <tr style={{ cursor: 'default', background: 'var(--bg)' }}>
                  <td colSpan={2} style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.65rem', color: 'var(--ink-muted)' }}>Total</td>
                  <td className="currency" style={{ fontWeight: 600 }}>{fmt(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Linked Documents */}
      <p className="section-label">Documents ({projectDocs.length})</p>
      {projectDocs.length === 0
        ? <p className="text-muted">Create documents from the Documents tab.</p>
        : (
          <div className="linked-list">
            {projectDocs.map(d => (
              <div key={d.id} className="linked-item" onClick={() => onNav('documents', d.id)}>
                <div>
                  <span className="text-mono" style={{ marginRight: 10 }}>{d.invoiceNumber ?? d.type?.toUpperCase()}</span>
                  <span style={{ fontWeight: 500 }}>{d.phaseName ?? d.type}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {d.total && <span className="currency">{fmt(d.total)}</span>}
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

// ─── Stage Detail View ────────────────────────────────────────────────────────
function StageDetailView({ stage, projects, clients, projectTotalValue, onBack, onNavProject }) {
  const stageProjects = projects.filter(p => p.status === stage)
  const stageTotal = stageProjects.reduce((s, p) => s + projectTotalValue(p), 0)

  return (
    <div>
      <button className="detail-back" onClick={onBack}><ArrowLeft size={12} /> Projects</button>

      <div className="detail-header">
        <div>
          <h1 className="detail-title">{stage}</h1>
          <p className="detail-sub">{stageProjects.length} {stageProjects.length === 1 ? 'project' : 'projects'} · {fmt(stageTotal)}</p>
        </div>
      </div>

      {stageProjects.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No projects in this stage</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {stageProjects.map(p => {
            const client = clients.find(c => c.id === p.clientId)
            const projTotal = projectTotalValue(p)

            return (
              <div
                key={p.id}
                onClick={() => onNavProject(p.id)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--ink)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{p.name}</h3>
                    {client && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--ink-muted)' }}>{client.company || client.name}{client.name && client.company && client.name !== client.company ? ` · ${client.name}` : ''}</p>}
                  </div>
                  <span className="currency" style={{ fontWeight: 600, fontSize: '1rem' }}>{fmt(projTotal)}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
                  {p.projectType && (
                    <div>
                      <span className="text-mono" style={{ color: 'var(--ink-muted)', fontSize: '0.7rem' }}>TYPE</span>
                      <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>{p.projectType}</p>
                    </div>
                  )}
                  {p.phases?.length > 0 && (
                    <div>
                      <span className="text-mono" style={{ color: 'var(--ink-muted)', fontSize: '0.7rem' }}>PHASES</span>
                      <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>{p.phases.length}</p>
                    </div>
                  )}
                </div>

                {p.startDate && (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                    Starts {new Date(p.startDate).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Projects Tab ─────────────────────────────────────────────────────────────
export default function Projects({ store, onNav, initialSelectedId }) {
  const toast = useToast()
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? null)
  const [showForm, setShowForm] = useState(false)
  const [editProject, setEditProject] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedStage, setSelectedStage] = useState('')

  const { clients, projects, createProject, updateProject, deleteProject, projectTotalValue } = store

  // Compute stage metrics
  const stageCounts = {}
  const stageTotals = {}
  PROJECT_STAGES.forEach(stage => {
    const stageProjects = projects.filter(p => p.status === stage)
    stageCounts[stage] = stageProjects.length
    stageTotals[stage] = stageProjects.reduce((s, p) => s + projectTotalValue(p), 0)
  })

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const client = clients.find(c => c.id === p.clientId)
    const matches = !q || [p.name, p.projectType, client?.name, client?.company].some(v => v?.toLowerCase().includes(q))
    const stageOk = !selectedStage || p.status === selectedStage
    return matches && stageOk
  })

  const selected = projects.find(p => p.id === selectedId)

  async function handleSave(data) {
    try {
      if (editProject) {
        await updateProject(editProject.id, data)
        toast('Project updated', 'success')
      } else {
        await createProject(data)
        toast('Project added', 'success')
      }
      setShowForm(false)
      setEditProject(null)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this project?')) return
    await deleteProject(id)
    setSelectedId(null)
    toast('Project deleted', 'info')
  }

  // Show ProjectDetail if a project is selected
  if (selected) {
    return (
      <>
        <ProjectDetail
          project={selected}
          clients={clients}
          store={store}
          onBack={() => setSelectedId(null)}
          onEdit={() => { setEditProject(selected); setShowForm(true) }}
          onDelete={() => handleDelete(selected.id)}
          onNav={onNav}
        />
        {showForm && (
          <Modal title="Edit Project" onClose={() => { setShowForm(false); setEditProject(null) }} size="lg">
            <ProjectForm initial={editProject} clients={clients} onSave={handleSave} onClose={() => { setShowForm(false); setEditProject(null) }} />
          </Modal>
        )}
      </>
    )
  }

  // Show StageDetailView if a stage is selected but no specific project
  if (selectedStage) {
    return (
      <StageDetailView
        stage={selectedStage}
        projects={projects}
        clients={clients}
        projectTotalValue={projectTotalValue}
        onBack={() => setSelectedStage('')}
        onNavProject={(projectId) => setSelectedId(projectId)}
      />
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add Project</button>
      </div>

      <div style={{ marginBottom: 32 }}>
        <input className="search-input" placeholder="Search by name, client, type…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 24, width: '100%', minWidth: '300px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {PROJECT_STAGES.map(stage => {
            const stageName = stage.toLowerCase().replace(/\s/g, '-')
            return (
              <div
                key={stage}
                onClick={() => setSelectedStage(stage)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  borderLeft: `3px solid var(--stage-${stageName})`,
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg)';
                  e.currentTarget.style.borderColor = 'var(--ink)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <h3 style={{ margin: '0 0 12px', fontWeight: 600, fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontStyle: 'normal' }}>{stage}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <span className="text-mono" style={{ color: 'var(--ink-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Projects</span>
                    <p style={{ margin: '4px 0 0', fontSize: '0.9rem', fontWeight: 600 }}>{stageCounts[stage]}</p>
                  </div>
                  <div>
                    <span className="text-mono" style={{ color: 'var(--ink-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Value</span>
                    <p className="currency" style={{ margin: '4px 0 0', fontSize: '0.9rem', fontWeight: 600 }}>{fmt(stageTotals[stage])}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showForm && (
        <Modal title={editProject ? 'Edit Project' : 'Add Project'} onClose={() => { setShowForm(false); setEditProject(null) }} size="lg">
          <ProjectForm initial={editProject ?? {}} clients={clients} onSave={handleSave} onClose={() => { setShowForm(false); setEditProject(null) }} />
        </Modal>
      )}
    </div>
  )
}
