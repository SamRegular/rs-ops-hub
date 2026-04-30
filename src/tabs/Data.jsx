import { useState } from 'react'
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Calendar } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

function fmt(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(n)
}

const CHART_COLORS = {
  lead: '#9CA3AF',
  quoted: '#3B82F6',
  confirmed: '#10B981',
  active: '#F59E0B',
  complete: '#8B5CF6',
  lost: '#EF4444',
  hot: '#EF4444',
  warm: '#F59E0B',
  cold: '#9CA3AF',
}

export default function Data({ store }) {
  const {
    projects, clients, leads,
    getFinancialYearStart, projectsInDateRange, revenueByMonth, revenueByStatus,
    revenueByIndustry, leadSourcePerformance, clientLTVRanking, averageProjectFee,
    winRate, leadConversionRate, projectTotalValue
  } = store

  const [startDate, setStartDate] = useState(() => {
    const fyStart = getFinancialYearStart()
    return fyStart.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  const start = new Date(startDate)
  const end = new Date(endDate)
  const fyProjects = projectsInDateRange(start, end)

  // Calculate KPIs
  const activeProjects = projects.filter(p => p.status === 'Active')
  const completeProjects = projects.filter(p => p.status === 'Complete')
  const totalRevenue = [...activeProjects, ...completeProjects].reduce((s, p) => s + projectTotalValue(p), 0)
  const avgFee = averageProjectFee(fyProjects.length > 0 ? fyProjects : projects)
  const wr = winRate(projects)
  const lcr = leadConversionRate()
  const totalLeadValue = leads.reduce((s, l) => s + (Number(l.estimated_value) || 0), 0)

  // Revenue data
  const monthlyData = revenueByMonth(fyProjects)
  const monthLabels = monthlyData.map(([month]) => {
    const [year, m] = month.split('-')
    return new Date(year, parseInt(m) - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
  })
  const monthlyRevenue = monthlyData.map(([, val]) => val)

  // Status breakdown
  const statusData = revenueByStatus(fyProjects)
  const statusLabels = Object.keys(statusData).sort()
  const statusValues = statusLabels.map(s => statusData[s])
  const statusColors = statusLabels.map(s => CHART_COLORS[s.toLowerCase()] || '#9CA3AF')

  // Industry breakdown
  const industryData = revenueByIndustry(fyProjects)
  const industryLabels = Object.keys(industryData).sort((a, b) => industryData[b].value - industryData[a].value)
  const industryValues = industryLabels.map(ind => industryData[ind].value)
  const industryColors = Array.from({ length: industryLabels.length }, (_, i) => {
    const hues = [220, 140, 50, 280, 350]
    return `hsl(${hues[i % hues.length]}, 70%, 50%)`
  })

  // Industry fees
  const industryFees = industryLabels.map(ind => {
    const count = industryData[ind].count
    return count > 0 ? industryData[ind].value / count : 0
  })

  // Lead pipeline
  const coldCount = leads.filter(l => l.temperature === 'Cold').length
  const warmCount = leads.filter(l => l.temperature === 'Warm').length
  const hotCount = leads.filter(l => l.temperature === 'Hot').length
  const leadTempValues = [coldCount, warmCount, hotCount]

  // Lead source performance
  const sourcePerf = leadSourcePerformance()
  const sourceLabels = Object.keys(sourcePerf).sort()
  const sourceCounts = sourceLabels.map(s => sourcePerf[s].total)
  const sourceConvRates = sourceLabels.map(s => sourcePerf[s].total > 0 ? (sourcePerf[s].hot / sourcePerf[s].total) * 100 : 0)

  // Client LTV
  const topClients = clientLTVRanking()
  const clientLabels = topClients.map(c => c.name)
  const clientValues = topClients.map(c => c.ltv)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Data & Analytics</h1>
      </div>

      {/* Date Range Filter */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 32, padding: '0 16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>
            <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> Start Date
          </label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>
            End Date
          </label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total Revenue (Realized)</span>
          <span className="stat-value accent">{fmt(totalRevenue)}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: 4 }}>{completeProjects.length + activeProjects.length} projects</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Projects</span>
          <span className="stat-value">{activeProjects.length}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: 4 }}>In progress</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Average Project Fee</span>
          <span className="stat-value accent">{fmt(avgFee)}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: 4 }}>Mean value</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Win Rate</span>
          <span className="stat-value">{wr.toFixed(1)}%</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: 4 }}>of non-lead projects</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lead Pipeline Value</span>
          <span className="stat-value accent">{fmt(totalLeadValue)}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: 4 }}>{leads.length} leads</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lead Conversion Rate</span>
          <span className="stat-value">{lcr.toFixed(1)}%</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: 4 }}>Hot leads</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 16, marginTop: 32, padding: '0 16px' }}>

        {/* Monthly Revenue Trend */}
        {monthlyData.length > 0 && (
          <div style={{ background: 'var(--bg)', padding: '12px 16px', borderRadius: 'var(--radius)' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 12 }}>Monthly Revenue Trend</h3>
            <Line
              data={{
                labels: monthLabels,
                datasets: [{
                  label: 'Revenue (£)',
                  data: monthlyRevenue,
                  borderColor: CHART_COLORS.confirmed,
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  fill: true,
                  tension: 0.4,
                }]
              }}
              options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
            />
          </div>
        )}

        {/* Revenue by Status */}
        {statusLabels.length > 0 && (
          <div style={{ background: 'var(--bg)', padding: '12px 16px', borderRadius: 'var(--radius)' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 12 }}>Revenue by Status</h3>
            <Doughnut
              data={{
                labels: statusLabels,
                datasets: [{
                  data: statusValues,
                  backgroundColor: statusColors,
                }]
              }}
              options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
            />
          </div>
        )}

        {/* Industry Distribution */}
        {industryLabels.length > 0 && (
          <div style={{ background: 'var(--bg)', padding: '12px 16px', borderRadius: 'var(--radius)' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 12 }}>Projects by Industry</h3>
            <Bar
              data={{
                labels: industryLabels,
                datasets: [{
                  label: 'Revenue (£)',
                  data: industryValues,
                  backgroundColor: industryColors,
                }]
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } }
              }}
            />
          </div>
        )}

        {/* Average Fee by Industry */}
        {industryLabels.length > 0 && (
          <div style={{ background: 'var(--bg)', padding: '12px 16px', borderRadius: 'var(--radius)' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 12 }}>Average Fee by Industry</h3>
            <Bar
              data={{
                labels: industryLabels,
                datasets: [{
                  label: 'Average Fee (£)',
                  data: industryFees,
                  backgroundColor: CHART_COLORS.confirmed,
                }]
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        )}

        {/* Lead Temperature Pipeline */}
        <div style={{ background: 'var(--bg)', padding: '12px 16px', borderRadius: 'var(--radius)' }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 12 }}>Lead Pipeline (Temperature)</h3>
          <Pie
            data={{
              labels: ['Cold', 'Warm', 'Hot'],
              datasets: [{
                data: leadTempValues,
                backgroundColor: [CHART_COLORS.cold, CHART_COLORS.warm, CHART_COLORS.hot],
              }]
            }}
            options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
          />
        </div>

        {/* Lead Source Performance */}
        {sourceLabels.length > 0 && (
          <div style={{ background: 'var(--bg)', padding: '12px 16px', borderRadius: 'var(--radius)' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 12 }}>Lead Source Performance</h3>
            <Bar
              data={{
                labels: sourceLabels,
                datasets: [{
                  label: 'Leads',
                  data: sourceCounts,
                  backgroundColor: CHART_COLORS.quoted,
                }]
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        )}

        {/* Top Clients by LTV */}
        {topClients.length > 0 && (
          <div style={{ background: 'var(--bg)', padding: '12px 16px', borderRadius: 'var(--radius)' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 12 }}>Top Clients by LTV</h3>
            <Bar
              data={{
                labels: clientLabels,
                datasets: [{
                  label: 'Lifetime Value (£)',
                  data: clientValues,
                  backgroundColor: CHART_COLORS.active,
                }]
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } }
              }}
            />
          </div>
        )}

      </div>

      {/* Summary Section */}
      <div style={{ marginTop: 32, padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
        <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 'var(--radius)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>Key Insights</div>
          <ul style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            <li>💰 {industryLabels.length > 0 && `${industryLabels[0]} leads revenue at ${fmt(industryValues[0])}`}</li>
            <li>🎯 {wr > 80 ? 'Strong' : 'Improving'} win rate at {wr.toFixed(0)}%</li>
            <li>📈 {lcr > 30 ? 'Healthy' : 'Growing'} lead conversion at {lcr.toFixed(0)}%</li>
            <li>👥 {activeProjects.length} active projects generating value</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
