import { useState } from 'react'
import { CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react'
import { NEXT_ACTION_LABELS } from '../config/studio.js'

function fmt(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(n)
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

// ─── Tracker Tab ──────────────────────────────────────────────────────────
export default function Tracker({ store, onNav }) {
  const { leads } = store
  const [completedCalls, setCompletedCalls] = useState({})

  const ranges = getWeekRanges()

  // Filter leads by next action and date ranges
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

  const hotCount = leads.filter(l => l.temperature === 'hot').length
  const warmCount = leads.filter(l => l.temperature === 'warm').length
  const coldCount = leads.filter(l => l.temperature === 'cold').length
  const totalValue = leads.reduce((s, l) => s + (Number(l.estimated_value) || 0), 0)

  const toggleCallDone = (leadId) => {
    setCompletedCalls(prev => ({ ...prev, [leadId]: !prev[leadId] }))
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Lead Tracker</h1>
      </div>

      {/* Pipeline Overview Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Hot Leads</span>
          <span className="stat-value" style={{ color: '#E74C3C' }}>{hotCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Warm Leads</span>
          <span className="stat-value accent">{warmCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Cold Leads</span>
          <span className="stat-value">{coldCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pipeline Value</span>
          <span className="stat-value accent">{fmt(totalValue)}</span>
        </div>
      </div>

      {/* Calls This Week */}
      <section style={{ marginTop: 32, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', flex: 1 }}>
            Calls This Week
          </h2>
          <span style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-muted)' }}>
            {callsThisWeek.length}
          </span>
        </div>

        {callsThisWeek.length === 0 ? (
          <div style={{ padding: '24px', background: 'var(--bg)', borderRadius: 'var(--radius)', textAlign: 'center', color: 'var(--ink-muted)' }}>
            No calls scheduled this week
          </div>
        ) : (
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
        )}
      </section>

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
      <section style={{ marginTop: 32, marginBottom: 32 }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>
          Pending Actions
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
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
        </div>

        {proposalsPending > 0 && (
          <div>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>Awaiting Proposal Response</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
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

        {proposalsPending === 0 && sowsPending === 0 && (
          <div style={{ padding: '24px', background: 'var(--bg)', borderRadius: 'var(--radius)', textAlign: 'center', color: 'var(--ink-muted)' }}>
            All caught up! No pending actions.
          </div>
        )}
      </section>
    </div>
  )
}
