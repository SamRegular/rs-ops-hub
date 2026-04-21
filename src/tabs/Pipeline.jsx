import { useState } from 'react'
import { Plus, Trash } from 'lucide-react'
import { Modal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { SOURCES, PROJECT_TYPES, SECTORS } from '../config/studio.js'

const LEAD_STAGES = ['Lead', 'Quoted', 'Confirmed', 'Active']

const STAGE_COLORS = {
  Lead: 'lead', Quoted: 'quoted', Confirmed: 'confirmed', Active: 'confirmed',
}

const STAGE_HEX = {
  Lead: '#8E8E93',
  Quoted: '#60A5FA',
  Confirmed: '#34D399',
  Active: '#34D399',
}

function fmt(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(n)
}

function Badge({ stage }) {
  return <span className={`badge badge-${STAGE_COLORS[stage] ?? 'draft'}`}>{stage}</span>
}

function projectValue(p) {
  return (p.phases ?? []).reduce((s, ph) => s + Number(ph.value || 0), 0)
}

function daysInPipeline(p) {
  if (!p.createdAt) return null
  const start = new Date(p.createdAt)
  const end = new Date()
  return Math.floor((end - start) / (1000 * 60 * 60 * 24))
}

// ─── Lead Form ───────────────────────────────────────────────────────────────
function LeadForm({ clients, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', projectType: '', brief: '', status: 'Lead',
    leadSource: '', winChance: '', expectedCloseDate: '', startDate: '',
    phases: [],
    clientMode: 'existing',
    clientId: '',
    clientName: '', clientCompany: '', clientEmail: '', clientSector: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inp = (k) => ({ value: form[k] ?? '', onChange: e => set(k, e.target.value) })

  const addPhase = () => set('phases', [...form.phases, { id: crypto.randomUUID(), name: '', value: '' }])
  const removePhase = (id) => set('phases', form.phases.filter(p => p.id !== id))
  const setPhase = (id, k, v) => set('phases', form.phases.map(p => p.id === id ? { ...p, [k]: v } : p))
  const phaseTotal = form.phases.reduce((s, p) => s + (Number(p.value) || 0), 0)

  const canSave = form.name.trim() && (form.clientMode === 'existing' ? form.clientId : form.clientName.trim())

  return (
    <>
      <p className="section-label">Client</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['existing', 'new'].map(mode => (
          <button key={mode} type="button" className="btn btn-sm"
            style={{
              background: form.clientMode === mode ? 'var(--ink)' : 'var(--surface)',
              color: form.clientMode === mode ? 'var(--bg)' : 'inherit',
              border: `1px solid ${form.clientMode === mode ? 'var(--ink)' : 'var(--border)'}`,
              fontSize: '0.8rem',
            }}
            onClick={() => set('clientMode', mode)}>
            {mode === 'existing' ? 'Existing Client' : 'New Client'}
          </button>
        ))}
      </div>

      {form.clientMode === 'existing' ? (
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">Select Client *</label>
          <select className="form-select" {...inp('clientId')}>
            <option value="">— Select client —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
          </select>
        </div>
      ) : (
        <div className="form-grid form-grid-2" style={{ marginBottom: 24 }}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" placeholder="Contact name" {...inp('clientName')} />
          </div>
          <div className="form-group">
            <label className="form-label">Company</label>
            <input className="form-input" placeholder="Company name" {...inp('clientCompany')} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" {...inp('clientEmail')} />
          </div>
          <div className="form-group">
            <label className="form-label">Sector</label>
            <select className="form-select" {...inp('clientSector')}>
              <option value="">— Select —</option>
              {SECTORS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      <p className="section-label">Project</p>
      <div className="form-grid form-grid-2" style={{ marginBottom: 16 }}>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Project Name *</label>
          <input className="form-input" placeholder="e.g. Brand Identity for Acme" {...inp('name')} />
        </div>
        <div className="form-group">
          <label className="form-label">Project Type</label>
          <select className="form-select" {...inp('projectType')}>
            <option value="">— Select type —</option>
            {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Stage</label>
          <select className="form-select" {...inp('status')}>
            {LEAD_STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Lead Source</label>
          <select className="form-select" {...inp('leadSource')}>
            <option value="">— Select source —</option>
            {SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Win Chance %</label>
          <input className="form-input" type="number" min="0" max="100" placeholder="e.g. 70" {...inp('winChance')} />
        </div>
        <div className="form-group">
          <label className="form-label">Expected Close</label>
          <input className="form-input" type="date" {...inp('expectedCloseDate')} />
        </div>
        <div className="form-group">
          <label className="form-label">Estimated Start</label>
          <input className="form-input" type="date" {...inp('startDate')} />
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Brief</label>
          <textarea className="form-textarea" rows={2} placeholder="Summary of the opportunity…" {...inp('brief')} />
        </div>
      </div>

      <p className="section-label">Phases / Value</p>
      <div style={{ marginBottom: 16 }}>
        {form.phases.map(p => (
          <div key={p.id} className="phase-row">
            <input className="form-input" placeholder="Phase name" value={p.name} onChange={e => setPhase(p.id, 'name', e.target.value)} />
            <input className="form-input" placeholder="£ value" type="number" min="0" step="100" value={p.value} onChange={e => setPhase(p.id, 'value', e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }} />
            <button className="btn btn-ghost btn-sm" onClick={() => removePhase(p.id)} style={{ padding: '4px', color: 'var(--ink-muted)' }}><Trash size={14} /></button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addPhase} style={{ marginTop: 8 }}>
          <Plus size={13} /> Add Phase
        </button>
        {form.phases.length > 0 && (
          <div className="phase-total">
            <span className="text-mono" style={{ color: 'var(--ink-muted)' }}>Total Value</span>
            <span className="currency" style={{ fontWeight: 500 }}>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(phaseTotal)}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!canSave} onClick={() => onSave(form)}>Add Lead</button>
      </div>
    </>
  )
}

// ─── Lead Card ────────────────────────────────────────────────────────────────
function LeadCard({ project, client, onClick }) {
  const value = projectValue(project)
  const winChance = Number(project.winChance) || 0
  const weighted = value * (winChance / 100)
  const days = daysInPipeline(project)

  const expectedDate = project.expectedCloseDate
    ? new Date(project.expectedCloseDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : null

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid var(--stage-${STAGE_COLORS[project.status] ?? 'lead'})`,
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--ink)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, marginRight: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{project.name}</h3>
            <Badge stage={project.status} />
          </div>
          {client && (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
              {client.company || client.name}
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p className="currency" style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem' }}>{fmt(value)}</p>
          {winChance > 0 && (
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
              {fmt(weighted)} weighted
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <div>
          <span className="text-mono" style={{ color: 'var(--ink-muted)', fontSize: '0.65rem' }}>Win Chance</span>
          <p style={{ margin: '3px 0 0', fontSize: '0.9rem', fontWeight: 600, color: winChance >= 70 ? 'var(--stage-active)' : winChance >= 40 ? 'var(--stage-quoted)' : 'inherit' }}>
            {winChance > 0 ? `${winChance}%` : '—'}
          </p>
        </div>
        {project.leadSource && (
          <div>
            <span className="text-mono" style={{ color: 'var(--ink-muted)', fontSize: '0.65rem' }}>Source</span>
            <p style={{ margin: '3px 0 0', fontSize: '0.9rem' }}>{project.leadSource}</p>
          </div>
        )}
        {expectedDate && (
          <div>
            <span className="text-mono" style={{ color: 'var(--ink-muted)', fontSize: '0.65rem' }}>Expected</span>
            <p style={{ margin: '3px 0 0', fontSize: '0.9rem' }}>{expectedDate}</p>
          </div>
        )}
        {project.projectType && (
          <div>
            <span className="text-mono" style={{ color: 'var(--ink-muted)', fontSize: '0.65rem' }}>Type</span>
            <p style={{ margin: '3px 0 0', fontSize: '0.9rem' }}>{project.projectType}</p>
          </div>
        )}
        {days !== null && (
          <div>
            <span className="text-mono" style={{ color: 'var(--ink-muted)', fontSize: '0.65rem' }}>In Pipeline</span>
            <p style={{ margin: '3px 0 0', fontSize: '0.9rem' }}>{days}d</p>
          </div>
        )}
      </div>

      {project.lossReason && (
        <p style={{ margin: '10px 0 0', fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
          Lost: {project.lossReason}
        </p>
      )}
    </div>
  )
}

// ─── Sankey View ──────────────────────────────────────────────────────────────
function SankeyView({ leads }) {
  if (leads.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">No leads to display</p>
        <p className="text-muted">Add leads to see source concentration.</p>
      </div>
    )
  }

  const totalValue = leads.reduce((s, p) => s + projectValue(p), 0)
  const useCount = totalValue === 0
  const metric = (p) => useCount ? 1 : projectValue(p)

  // Aggregate
  const sources = {}
  const stages = {}
  const links = {}

  leads.forEach(p => {
    const src = p.leadSource || 'Unknown'
    const stage = p.status
    const val = metric(p)

    sources[src] = sources[src] || { value: 0, count: 0 }
    sources[src].value += val
    sources[src].count++

    stages[stage] = stages[stage] || { value: 0, count: 0 }
    stages[stage].value += val
    stages[stage].count++

    const key = `${src}→${stage}`
    links[key] = links[key] || { source: src, target: stage, value: 0, count: 0 }
    links[key].value += val
    links[key].count++
  })

  const svgW = 800
  const svgH = 340
  const nodeW = 12
  const leftX = 200
  const rightX = svgW - 200
  const padTop = 16
  const nodePad = 12

  const sortedSources = Object.entries(sources).sort((a, b) => b[1].value - a[1].value)
  const sortedStages = LEAD_STAGES.filter(s => stages[s])

  function layoutSide(entries) {
    const n = entries.length
    const availH = svgH - padTop * 2 - nodePad * Math.max(0, n - 1)
    const total = entries.reduce((s, [, d]) => s + d.value, 0) || 1
    let y = padTop
    return entries.map(([name, data]) => {
      const h = Math.max(24, (data.value / total) * availH)
      const node = { name, data, y, h }
      y += h + nodePad
      return node
    })
  }

  const sourceNodes = layoutSide(sortedSources)
  const stageNodes = layoutSide(sortedStages.map(s => [s, stages[s]]))

  const sourceNodeMap = Object.fromEntries(sourceNodes.map(n => [n.name, n]))
  const stageNodeMap = Object.fromEntries(stageNodes.map(n => [n.name, n]))

  // Compute flows with stacking offsets
  const srcOffsets = Object.fromEntries(sourceNodes.map(n => [n.name, 0]))
  const tgtOffsets = Object.fromEntries(stageNodes.map(n => [n.name, 0]))

  const flows = []
  sortedSources.forEach(([srcName]) => {
    sortedStages.forEach(stageName => {
      const key = `${srcName}→${stageName}`
      if (!links[key]) return
      const link = links[key]
      const srcNode = sourceNodeMap[srcName]
      const tgtNode = stageNodeMap[stageName]
      if (!srcNode || !tgtNode) return

      const srcFlowH = (link.value / sources[srcName].value) * srcNode.h
      const tgtFlowH = (link.value / stages[stageName].value) * tgtNode.h

      const sy1 = srcNode.y + srcOffsets[srcName]
      const sy2 = sy1 + srcFlowH
      const ty1 = tgtNode.y + tgtOffsets[stageName]
      const ty2 = ty1 + tgtFlowH

      srcOffsets[srcName] += srcFlowH
      tgtOffsets[stageName] += tgtFlowH

      const cpX = (leftX + nodeW + rightX) / 2
      const path = [
        `M ${leftX + nodeW} ${sy1}`,
        `C ${cpX} ${sy1} ${cpX} ${ty1} ${rightX} ${ty1}`,
        `L ${rightX} ${ty2}`,
        `C ${cpX} ${ty2} ${cpX} ${sy2} ${leftX + nodeW} ${sy2}`,
        `Z`,
      ].join(' ')

      flows.push({ path, stage: stageName, value: link.value, count: link.count })
    })
  })

  const fmtMetric = (d) => useCount
    ? `${d.count} lead${d.count !== 1 ? 's' : ''}`
    : `${d.count} · ${fmt(d.value)}`

  return (
    <div>
      <p className="section-label" style={{ marginBottom: 20 }}>Source → Stage Concentration</p>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: svgW, height: 'auto', display: 'block' }}>
          {/* Flows */}
          {flows.map((f, i) => (
            <path
              key={i}
              d={f.path}
              fill={STAGE_HEX[f.stage] + '30'}
              stroke={STAGE_HEX[f.stage] + '80'}
              strokeWidth={0.5}
            />
          ))}

          {/* Source nodes (left) */}
          {sourceNodes.map(({ name, data, y, h }) => (
            <g key={name}>
              <rect x={leftX} y={y} width={nodeW} height={h} fill="#48484A" rx={2} />
              <text
                x={leftX - 12} y={y + h / 2 - (data.count ? 7 : 0)}
                textAnchor="end" dominantBaseline="middle"
                fill="#F0F0F0" fontSize={11} fontFamily="monospace"
              >
                {name}
              </text>
              <text
                x={leftX - 12} y={y + h / 2 + 9}
                textAnchor="end" dominantBaseline="middle"
                fill="#8E8E93" fontSize={10} fontFamily="monospace"
              >
                {fmtMetric(data)}
              </text>
            </g>
          ))}

          {/* Stage nodes (right) */}
          {stageNodes.map(({ name, data, y, h }) => (
            <g key={name}>
              <rect x={rightX} y={y} width={nodeW} height={h} fill={STAGE_HEX[name]} rx={2} />
              <text
                x={rightX + nodeW + 12} y={y + h / 2 - (data.count ? 7 : 0)}
                dominantBaseline="middle"
                fill="#F0F0F0" fontSize={11} fontFamily="monospace"
              >
                {name}
              </text>
              <text
                x={rightX + nodeW + 12} y={y + h / 2 + 9}
                dominantBaseline="middle"
                fill="#8E8E93" fontSize={10} fontFamily="monospace"
              >
                {fmtMetric(data)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Stage legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
        {sortedStages.map(stage => (
          <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: STAGE_HEX[stage] }} />
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stage}</span>
          </div>
        ))}
        {useCount && (
          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', marginLeft: 'auto' }}>
            Sized by count (no values set)
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Timeline View ────────────────────────────────────────────────────────────
function TimelineView({ leads, clients }) {
  if (leads.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">No leads to display</p>
        <p className="text-muted">Add leads to see the close date distribution.</p>
      </div>
    )
  }

  const today = new Date()
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 5, 1)

  // Build timeline events: use paymentTranches if available, else expectedCloseDate
  // Each event: { project, month: 'YYYY-MM', amount }
  const timelineEvents = leads.flatMap(p => {
    if (p.paymentTranches?.length) {
      return p.paymentTranches
        .filter(t => t.month)
        .map(t => ({ project: p, month: t.month, amount: Number(t.amount) || 0, trancheLabel: t.label }))
    }
    if (p.expectedCloseDate) {
      const d = new Date(p.expectedCloseDate)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return [{ project: p, month, amount: projectValue(p), trancheLabel: null }]
    }
    return []
  })

  // Build month range
  let rangeStart = defaultStart
  let rangeEnd = defaultEnd

  timelineEvents.forEach(({ month }) => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1, 1)
    if (d < rangeStart) rangeStart = d
    if (d > rangeEnd) rangeEnd = d
  })

  const months = []
  const cursor = new Date(rangeStart)
  while (cursor <= rangeEnd) {
    months.push(new Date(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }

  // Group events by YYYY-MM key
  const mkKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const byMonth = Object.fromEntries(months.map(m => [mkKey(m), []]))
  timelineEvents.forEach(ev => {
    if (byMonth[ev.month]) byMonth[ev.month].push(ev)
  })

  const monthValues = Object.fromEntries(
    Object.entries(byMonth).map(([k, evs]) => [k, evs.reduce((s, ev) => s + ev.amount, 0)])
  )
  const maxVal = Math.max(...Object.values(monthValues), 1)

  // Leads with no date and no tranches
  const withoutDates = leads.filter(p => !p.paymentTranches?.some(t => t.month) && !p.expectedCloseDate)

  return (
    <div>
      <p className="section-label" style={{ marginBottom: 16 }}>Close Date Distribution by Month</p>

      {/* Mini bar chart across months */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48, marginBottom: 4 }}>
        {months.map(m => {
          const key = mkKey(m)
          const val = monthValues[key] || 0
          const barH = Math.max(val > 0 ? 3 : 0, (val / maxVal) * 44)
          const isCurrent = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth()
          const isPast = m < new Date(today.getFullYear(), today.getMonth(), 1)
          return (
            <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{
                height: barH,
                background: isCurrent ? 'var(--accent)' : isPast ? 'var(--border-dark)' : 'var(--stage-confirmed)',
                borderRadius: '2px 2px 0 0',
                opacity: isPast ? 0.5 : 1,
              }} />
            </div>
          )
        })}
      </div>

      {/* Month labels under bars */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 24 }}>
        {months.map(m => {
          const isCurrent = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth()
          return (
            <div key={mkKey(m)} style={{ flex: 1, textAlign: 'center' }}>
              <span style={{
                fontSize: '0.55rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: isCurrent ? 'var(--accent)' : 'var(--ink-muted)',
                whiteSpace: 'nowrap',
              }}>
                {m.toLocaleDateString('en-GB', { month: 'short' })}
              </span>
            </div>
          )
        })}
      </div>

      {/* Month columns */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, alignItems: 'flex-start' }}>
        {months.map(m => {
          const key = mkKey(m)
          const monthEvents = byMonth[key] || []
          const monthValue = monthValues[key] || 0
          const label = m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
          const isCurrent = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth()
          const isPast = m < new Date(today.getFullYear(), today.getMonth(), 1)

          return (
            <div key={key} style={{ flex: '0 0 176px', minWidth: 176 }}>
              {/* Column header */}
              <div style={{
                background: isCurrent ? 'rgba(129,140,248,0.1)' : 'var(--surface-2)',
                border: `1px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '4px 4px 0 0',
                padding: '10px 12px',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.63rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: isCurrent ? 'var(--accent)' : 'var(--ink-muted)' }}>
                  {label}{isCurrent ? ' · Now' : ''}
                </div>
                {monthValue > 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.92rem', marginTop: 4, color: isPast ? 'var(--ink-muted)' : 'var(--ink)' }}>
                    {fmt(monthValue)}
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: 2 }}>
                  {monthEvents.length} payment{monthEvents.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Cards */}
              <div style={{ border: `1px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'}`, borderTop: 'none', borderRadius: '0 0 4px 4px', padding: monthEvents.length > 0 ? 8 : 0, minHeight: 40 }}>
                {monthEvents.length === 0 ? (
                  <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--border-dark)', fontSize: '0.9rem' }}>—</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {monthEvents
                      .sort((a, b) => {
                        const stageOrder = { Confirmed: 0, Quoted: 1, Lead: 2 }
                        return (stageOrder[a.project.status] ?? 3) - (stageOrder[b.project.status] ?? 3)
                      })
                      .map((ev, idx) => {
                        const p = ev.project
                        const client = clients.find(c => c.id === p.clientId)
                        return (
                          <div key={`${p.id}-${idx}`} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${STAGE_HEX[p.status] ?? '#888'}`, borderRadius: 'var(--radius)', padding: '8px 10px', opacity: isPast ? 0.55 : 1 }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.3 }}>{p.name}</p>
                            {client && <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--ink-muted)' }}>{client.company || client.name}</p>}
                            {ev.trancheLabel && <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{ev.trancheLabel}</p>}
                            {ev.amount > 0 && <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem' }}>{fmt(ev.amount)}</p>}
                            <div style={{ display: 'flex', gap: 5, marginTop: 5, alignItems: 'center' }}>
                              <Badge stage={p.status} />
                              {p.winChance > 0 && <span style={{ fontSize: '0.68rem', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{p.winChance}%</span>}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Leads with no close date */}
      {withoutDates.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p className="section-label">No close date set · {withoutDates.length} lead{withoutDates.length !== 1 ? 's' : ''}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {withoutDates.map(p => {
              const client = clients.find(c => c.id === p.clientId)
              const val = projectValue(p)
              return (
                <div key={p.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${STAGE_HEX[p.status] ?? '#888'}`,
                  borderRadius: 'var(--radius)', padding: '10px 14px', minWidth: 160,
                }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem' }}>{p.name}</p>
                  {client && <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--ink-muted)' }}>{client.company || client.name}</p>}
                  {val > 0 && <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem' }}>{fmt(val)}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
export default function Pipeline({ store, onNav }) {
  const toast = useToast()
  const { clients, projects, createClient, createProject } = store
  const [viewMode, setViewMode] = useState('list')
  const [sortBy, setSortBy] = useState('stage')
  const [stageFilter, setStageFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function handleAddLead(form) {
    try {
      let clientId = form.clientId

      if (form.clientMode === 'new') {
        const newClient = await createClient({
          name: form.clientName,
          company: form.clientCompany,
          email: form.clientEmail,
          sector: form.clientSector,
          source: form.leadSource,
          pipelineStage: 'Lead',
        })
        clientId = newClient.id
      }

      await createProject({
        name: form.name,
        clientId,
        projectType: form.projectType,
        status: form.status,
        brief: form.brief,
        startDate: form.startDate,
        leadSource: form.leadSource,
        winChance: form.winChance,
        expectedCloseDate: form.expectedCloseDate,
        phases: form.phases,
      })

      setShowForm(false)
      toast('Lead added', 'success')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const leads = projects.filter(p => LEAD_STAGES.includes(p.status))

  const totalValue = leads.reduce((s, p) => s + projectValue(p), 0)
  const weightedValue = leads.reduce((s, p) => {
    const val = projectValue(p)
    return s + val * ((Number(p.winChance) || 0) / 100)
  }, 0)

  const stageBreakdown = LEAD_STAGES.map(stage => {
    const sp = leads.filter(p => p.status === stage)
    return {
      stage,
      count: sp.length,
      value: sp.reduce((s, p) => s + projectValue(p), 0),
      weighted: sp.reduce((s, p) => s + projectValue(p) * ((Number(p.winChance) || 0) / 100), 0),
    }
  })

  const sourceBreakdown = {}
  leads.forEach(p => {
    const src = p.leadSource || 'Unknown'
    if (!sourceBreakdown[src]) sourceBreakdown[src] = { count: 0, value: 0 }
    sourceBreakdown[src].count++
    sourceBreakdown[src].value += projectValue(p)
  })

  const filtered = leads
    .filter(p => (!stageFilter || p.status === stageFilter) && (!sourceFilter || p.leadSource === sourceFilter))
    .sort((a, b) => {
      if (sortBy === 'value') return projectValue(b) - projectValue(a)
      if (sortBy === 'chance') return (Number(b.winChance) || 0) - (Number(a.winChance) || 0)
      if (sortBy === 'date') {
        const aDate = a.expectedCloseDate ? new Date(a.expectedCloseDate) : new Date('9999-12-31')
        const bDate = b.expectedCloseDate ? new Date(b.expectedCloseDate) : new Date('9999-12-31')
        return aDate - bDate
      }
      return LEAD_STAGES.indexOf(a.status) - LEAD_STAGES.indexOf(b.status)
    })

  const VIEW_MODES = [
    { key: 'list', label: 'List' },
    { key: 'sankey', label: 'Sankey' },
    { key: 'timeline', label: 'Timeline' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Pipeline</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', display: 'block' }}>Total</span>
            <span className="currency" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{fmt(totalValue)}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', display: 'block' }}>Weighted</span>
            <span className="currency" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink-muted)' }}>{fmt(weightedValue)}</span>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {VIEW_MODES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setViewMode(key)}
            className="btn btn-sm"
            style={{
              background: viewMode === key ? 'var(--ink)' : 'var(--surface)',
              color: viewMode === key ? 'var(--bg)' : 'var(--ink-muted)',
              border: `1px solid ${viewMode === key ? 'var(--ink)' : 'var(--border)'}`,
              padding: '6px 14px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── List view ── */}
      {viewMode === 'list' && (
        <>
          {/* Stage summary cards */}
          {/* Unified filter + sort bar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
            {/* Stage filters */}
            {['Lead', 'Quoted', 'Confirmed', 'Active'].map(stage => {
              const active = stageFilter === stage
              return (
                <button key={stage} onClick={() => setStageFilter(active ? '' : stage)} className="btn btn-sm" style={{
                  background: active ? 'var(--ink)' : 'var(--surface)',
                  color: active ? 'var(--bg)' : 'inherit',
                  border: `1px solid ${active ? 'var(--ink)' : 'var(--border)'}`,
                  borderLeft: `3px solid ${STAGE_HEX[stage]}`,
                  fontSize: '0.78rem', padding: '5px 12px',
                }}>
                  {stage}
                </button>
              )
            })}

            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

            {/* Source filters */}
            {Object.entries(sourceBreakdown).sort((a, b) => b[1].value - a[1].value).map(([src]) => {
              const active = sourceFilter === src
              return (
                <button key={src} onClick={() => setSourceFilter(active ? '' : src)} className="btn btn-sm" style={{
                  background: active ? 'var(--ink)' : 'var(--surface)',
                  color: active ? 'var(--bg)' : 'inherit',
                  border: `1px solid ${active ? 'var(--ink)' : 'var(--border)'}`,
                  fontSize: '0.78rem', padding: '5px 12px',
                }}>
                  {src}
                </button>
              )
            })}

            <div style={{ flex: 1 }} />

            {/* Sort */}
            {[['stage', 'Stage'], ['value', 'Value'], ['chance', 'Chance'], ['date', 'Date']].map(([key, label]) => (
              <button key={key} onClick={() => setSortBy(key)} className="btn btn-sm" style={{
                fontSize: '0.75rem', padding: '5px 10px',
                background: sortBy === key ? 'var(--ink)' : 'transparent',
                color: sortBy === key ? 'var(--bg)' : 'var(--ink-muted)',
                border: `1px solid ${sortBy === key ? 'var(--ink)' : 'transparent'}`,
              }}>
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">No leads in pipeline</p>
              <p className="text-muted">Add projects with Lead, Quoted, or Confirmed status to track them here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {['Confirmed', 'Quoted', 'Lead'].map(stage => {
                const stageLeads = filtered.filter(p => stage === 'Confirmed' ? (p.status === 'Confirmed' || p.status === 'Active') : p.status === stage)
                if (stageLeads.length === 0) return null
                return (
                  <div key={stage}>
                    <p className="section-label" style={{ marginBottom: 12 }}>
                      {stage} · {stageLeads.length} lead{stageLeads.length !== 1 ? 's' : ''}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {stageLeads.map(p => (
                        <LeadCard
                          key={p.id}
                          project={p}
                          client={clients.find(c => c.id === p.clientId)}
                          onClick={() => onNav('projects', p.id)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Sankey view ── */}
      {viewMode === 'sankey' && (
        <SankeyView leads={leads} clients={clients} />
      )}

      {/* ── Timeline view ── */}
      {viewMode === 'timeline' && (
        <TimelineView leads={leads} clients={clients} />
      )}

      {showForm && (
        <Modal title="Add Lead" onClose={() => setShowForm(false)} size="lg">
          <LeadForm clients={clients} onSave={handleAddLead} onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  )
}
