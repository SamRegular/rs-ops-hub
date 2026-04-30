import { useState, useEffect, useCallback } from 'react'
import { storage } from '../storage/index.js'

function nextInvoiceNumber(documents) {
  const invoices = documents.filter(d => d.type === 'invoice' && d.invoiceNumber)
  if (!invoices.length) return 'RS-0001'
  const nums = invoices.map(d => parseInt(d.invoiceNumber.replace('RS-', ''), 10)).filter(Boolean)
  const max = Math.max(...nums)
  return `RS-${String(max + 1).padStart(4, '0')}`
}

export function useStore() {
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [documents, setDocuments] = useState([])
  const [retainers, setRetainers] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const [c, p, d, r, l] = await Promise.all([
        storage.getAll('clients'),
        storage.getAll('projects'),
        storage.getAll('documents'),
        storage.getAll('retainers'),
        storage.getAll('leads'),
      ])

      // Load payment tranches for each project
      const supabase = storage.supabase
      const enrichedProjects = await Promise.all(
        p.map(async (project) => {
          try {
            const { data: tranches, error: tranchesError } = await supabase
              .from('payment_tranches')
              .select('*')
              .eq('projectId', project.id)

            if (tranchesError) {
              console.error(`Error loading tranches for project ${project.id}:`, tranchesError)
              return {
                ...project,
                paymentTranches: Array.isArray(project.paymentTranches) ? project.paymentTranches : [],
              }
            }

            return {
              ...project,
              paymentTranches: Array.isArray(tranches) ? tranches : [],
            }
          } catch (err) {
            console.error(`Error loading tranches for project ${project.id}:`, err)
            return {
              ...project,
              paymentTranches: Array.isArray(project.paymentTranches) ? project.paymentTranches : [],
            }
          }
        })
      )

      setClients(c)
      setProjects(enrichedProjects)
      setDocuments(d)
      setRetainers(r)
      setLeads(l)
      setLoading(false)
    } catch (err) {
      console.error('Error loading data:', err)
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // ── Clients ──────────────────────────────────────────────────────────────
  const createClient = useCallback(async (data) => {
    const item = await storage.create('clients', data)
    setClients(prev => [...prev, item])
    return item
  }, [])

  const updateClient = useCallback(async (id, data) => {
    const item = await storage.update('clients', id, data)
    setClients(prev => prev.map(c => c.id === id ? item : c))
    return item
  }, [])

  const deleteClient = useCallback(async (id) => {
    await storage.delete('clients', id)
    setClients(prev => prev.filter(c => c.id !== id))
  }, [])

  // ── Projects ─────────────────────────────────────────────────────────────
  const createProject = useCallback(async (data) => {
    const { deliverables = [], paymentTranches = [], ...projectData } = data
    const item = await storage.create('projects', projectData)

    // Save deliverables
    const supabase = storage.supabase
    if (deliverables.length > 0) {
      await supabase.from('deliverables').insert(
        deliverables.map(d => ({
          projectId: item.id,
          name: d.name,
        }))
      )
    }

    // Save payment tranches
    if (paymentTranches.length > 0) {
      await supabase.from('payment_tranches').insert(
        paymentTranches.map(t => ({
          projectId: item.id,
          label: t.label,
          month: t.month,
          amount: t.amount,
        }))
      )
    }

    const enriched = {
      ...item,
      deliverables,
      paymentTranches,
    }
    setProjects(prev => [...prev, enriched])
    return enriched
  }, [])

  const updateProject = useCallback(async (id, data) => {
    const { deliverables = [], paymentTranches = [], ...projectData } = data
    const item = await storage.update('projects', id, projectData)

    const supabase = storage.supabase

    // Delete and recreate deliverables
    await supabase.from('deliverables').delete().eq('projectId', id)
    if (deliverables.length > 0) {
      await supabase.from('deliverables').insert(
        deliverables.map(d => ({
          projectId: id,
          name: d.name,
        }))
      )
    }

    // Delete and recreate payment tranches
    await supabase.from('payment_tranches').delete().eq('projectId', id)
    if (paymentTranches.length > 0) {
      await supabase.from('payment_tranches').insert(
        paymentTranches.map(t => ({
          projectId: id,
          label: t.label,
          month: t.month,
          amount: t.amount,
        }))
      )
    }

    const enriched = {
      ...item,
      deliverables,
      paymentTranches,
    }
    setProjects(prev => prev.map(p => p.id === id ? enriched : p))
    return enriched
  }, [])

  const deleteProject = useCallback(async (id) => {
    // Cascade delete handled by Supabase foreign keys
    await storage.delete('projects', id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }, [])

  // ── Documents ─────────────────────────────────────────────────────────────
  const createDocument = useCallback(async (data) => {
    const docData = { ...data }
    if (data.type === 'invoice' && !data.invoiceNumber) {
      // Read fresh documents from storage to get accurate next number
      const allDocs = await storage.getAll('documents')
      docData.invoiceNumber = nextInvoiceNumber(allDocs)
    }
    const item = await storage.create('documents', docData)
    setDocuments(prev => [...prev, item])
    return item
  }, [])

  const updateDocument = useCallback(async (id, data) => {
    const item = await storage.update('documents', id, data)
    setDocuments(prev => prev.map(d => d.id === id ? item : d))
    // If invoice just got paid, return updated item for LTV recalc (done in UI)
    return item
  }, [])

  const deleteDocument = useCallback(async (id) => {
    await storage.delete('documents', id)
    setDocuments(prev => prev.filter(d => d.id !== id))
  }, [])

  // ── Retainers ─────────────────────────────────────────────────────────────
  const createRetainer = useCallback(async (data) => {
    const item = await storage.create('retainers', data)
    setRetainers(prev => [...prev, item])
    return item
  }, [])

  const updateRetainer = useCallback(async (id, data) => {
    const item = await storage.update('retainers', id, data)
    setRetainers(prev => prev.map(r => r.id === id ? item : r))
    return item
  }, [])

  const deleteRetainer = useCallback(async (id) => {
    await storage.delete('retainers', id)
    setRetainers(prev => prev.filter(r => r.id !== id))
  }, [])

  // ── Leads ────────────────────────────────────────────────────────────────
  const createLead = useCallback(async (data) => {
    const item = await storage.create('leads', data)
    setLeads(prev => [...prev, item])
    return item
  }, [])

  const updateLead = useCallback(async (id, data) => {
    const item = await storage.update('leads', id, data)
    setLeads(prev => prev.map(l => l.id === id ? item : l))
    return item
  }, [])

  const deleteLead = useCallback(async (id) => {
    await storage.delete('leads', id)
    setLeads(prev => prev.filter(l => l.id !== id))
  }, [])

  const convertLead = useCallback(async (leadId, clientData) => {
    // Create new client from lead data
    const newClient = await createClient(clientData)
    // Delete the lead
    await deleteLead(leadId)
    return newClient
  }, [createClient, deleteLead])

  // ── Computed ─────────────────────────────────────────────────────────────
  const clientLTV = useCallback((clientId) => {
    // Total value of all Active projects for this client
    return projects
      .filter(p => p.clientId === clientId && p.status === 'Active')
      .reduce((s, p) => {
        try {
          const tranches = Array.isArray(p.paymentTranches) ? p.paymentTranches : []
          const phases = Array.isArray(p.phases) ? p.phases : []

          if (tranches.length > 0) {
            return s + tranches.reduce((ts, t) => ts + (Number(t.amount) || 0), 0)
          }
          return s + phases.reduce((ps, ph) => ps + (Number(ph.value) || 0), 0)
        } catch (err) {
          console.error('Error calculating LTV:', err, p)
          return s
        }
      }, 0)
  }, [projects])

  const projectTotalValue = useCallback((project) => {
    try {
      const tranches = Array.isArray(project.paymentTranches) ? project.paymentTranches : []
      const phases = Array.isArray(project.phases) ? project.phases : []

      if (tranches.length > 0) {
        return tranches.reduce((s, t) => s + (Number(t.amount) || 0), 0)
      }
      return phases.reduce((s, p) => s + (Number(p.value) || 0), 0)
    } catch (err) {
      console.error('Error calculating project total:', err, project)
      return 0
    }
  }, [])

  const getNextInvoiceNumber = useCallback(() => {
    return nextInvoiceNumber(documents)
  }, [documents])

  // ── Analytics Helpers ────────────────────────────────────────────────────
  const getFinancialYearStart = useCallback(() => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const septFirst = new Date(currentYear, 8, 1) // Sept 1

    if (today < septFirst) {
      return new Date(currentYear - 1, 8, 1)
    }
    return septFirst
  }, [])

  const projectsInDateRange = useCallback((startDate, endDate) => {
    return projects.filter(p => {
      const created = new Date(p.created_at)
      return created >= startDate && created <= endDate
    })
  }, [projects])

  const revenueByMonth = useCallback((projectList) => {
    const monthData = {}
    projectList.forEach(p => {
      if ((p.status === 'Active' || p.status === 'Complete') && p.paymentTranches) {
        p.paymentTranches.forEach(t => {
          const monthKey = t.month ? t.month.substring(0, 7) : null
          if (monthKey) {
            monthData[monthKey] = (monthData[monthKey] || 0) + (Number(t.amount) || 0)
          }
        })
      }
    })
    return Object.entries(monthData).sort()
  }, [])

  const revenueByStatus = useCallback((projectList) => {
    const statusData = {}
    projectList.forEach(p => {
      const value = projectTotalValue(p)
      statusData[p.status] = (statusData[p.status] || 0) + value
    })
    return statusData
  }, [projectTotalValue])

  const revenueByIndustry = useCallback((projectList) => {
    const industryData = {}
    projectList.forEach(p => {
      const client = clients.find(c => c.id === p.clientId)
      const sector = client?.sector || 'Unknown'
      const value = projectTotalValue(p)
      if (!industryData[sector]) {
        industryData[sector] = { value: 0, count: 0 }
      }
      industryData[sector].value += value
      industryData[sector].count += 1
    })
    return industryData
  }, [clients, projectTotalValue])

  const leadSourcePerformance = useCallback(() => {
    const sourceData = {}
    leads.forEach(l => {
      const source = l.source || 'Unknown'
      if (!sourceData[source]) {
        sourceData[source] = { total: 0, hot: 0 }
      }
      sourceData[source].total += 1
      if (l.temperature === 'Hot') {
        sourceData[source].hot += 1
      }
    })
    return sourceData
  }, [leads])

  const clientLTVRanking = useCallback(() => {
    const ranking = clients.map(c => {
      const ltv = clientLTV(c.id)
      return { id: c.id, name: c.company || c.name, ltv }
    })
    return ranking.sort((a, b) => b.ltv - a.ltv).slice(0, 10)
  }, [clients, clientLTV])

  const averageProjectFee = useCallback((projectList) => {
    const withValue = projectList.filter(p => projectTotalValue(p) > 0)
    if (withValue.length === 0) return 0
    const total = withValue.reduce((s, p) => s + projectTotalValue(p), 0)
    return total / withValue.length
  }, [projectTotalValue])

  const winRate = useCallback((projectList) => {
    const nonDraft = projectList.filter(p => p.status !== 'Lead')
    if (nonDraft.length === 0) return 0
    const won = nonDraft.filter(p => p.status === 'Active' || p.status === 'Complete').length
    return (won / nonDraft.length) * 100
  }, [])

  const leadConversionRate = useCallback(() => {
    const total = leads.length
    if (total === 0) return 0
    const hot = leads.filter(l => l.temperature === 'Hot').length
    return (hot / total) * 100
  }, [leads])

  return {
    clients, projects, documents, retainers, leads, loading,
    createClient, updateClient, deleteClient,
    createProject, updateProject, deleteProject,
    createDocument, updateDocument, deleteDocument,
    createRetainer, updateRetainer, deleteRetainer,
    createLead, updateLead, deleteLead, convertLead,
    clientLTV, projectTotalValue, getNextInvoiceNumber,
    getFinancialYearStart, projectsInDateRange, revenueByMonth, revenueByStatus,
    revenueByIndustry, leadSourcePerformance, clientLTVRanking, averageProjectFee,
    winRate, leadConversionRate,
    reload,
  }
}
