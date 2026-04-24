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
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const [c, p, d, r] = await Promise.all([
        storage.getAll('clients'),
        storage.getAll('projects'),
        storage.getAll('documents'),
        storage.getAll('retainers'),
      ])

      // Add empty deliverables and paymentTranches to projects
      const enrichedProjects = p.map(project => ({
        ...project,
        deliverables: project.deliverables || [],
        paymentTranches: project.paymentTranches || [],
      }))

      setClients(c)
      setProjects(enrichedProjects)
      setDocuments(d)
      setRetainers(r)
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

  // ── Computed ─────────────────────────────────────────────────────────────
  const clientLTV = useCallback((clientId) => {
    // Total value of all Active projects for this client
    return projects
      .filter(p => p.clientId === clientId && p.status === 'Active')
      .reduce((s, p) => {
        if (p.paymentTranches?.length) return s + p.paymentTranches.reduce((ts, t) => ts + (Number(t.amount) || 0), 0)
        return s + (p.phases ?? []).reduce((ps, ph) => ps + (Number(ph.value) || 0), 0)
      }, 0)
  }, [projects])

  const projectTotalValue = useCallback((project) => {
    if (project.paymentTranches?.length) return project.paymentTranches.reduce((s, t) => s + (Number(t.amount) || 0), 0)
    return (project.phases ?? []).reduce((s, p) => s + (Number(p.value) || 0), 0)
  }, [])

  const getNextInvoiceNumber = useCallback(() => {
    return nextInvoiceNumber(documents)
  }, [documents])

  return {
    clients, projects, documents, retainers, loading,
    createClient, updateClient, deleteClient,
    createProject, updateProject, deleteProject,
    createDocument, updateDocument, deleteDocument,
    createRetainer, updateRetainer, deleteRetainer,
    clientLTV, projectTotalValue, getNextInvoiceNumber,
    reload,
  }
}
