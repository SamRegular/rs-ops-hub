import { STUDIO } from '../config/studio.js'

const PROXY_URL = '/.netlify/functions/generate'

async function callClaude(prompt) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `API error ${res.status}`)
  }
  const data = await res.json()
  return data.content
}

function fmt(n, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

function today() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Quote ───────────────────────────────────────────────────────────────────

export async function generateQuote({ client, project, deliverables = [], paymentTranches = [], validityDays = 30, currency = 'GBP', notes = '' }) {
  // Calculate totals from payment tranches
  const subtotal = Array.isArray(paymentTranches)
    ? paymentTranches.reduce((s, t) => s + (Number(t.amount) || 0), 0)
    : 0
  const vat = subtotal * STUDIO.vatRate
  const total = subtotal + vat

  const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // Build deliverables list for prompt
  const deliverablesList = Array.isArray(deliverables)
    ? deliverables.map(d => `- ${d.name || 'Deliverable'}`).join('\n')
    : '- Design services as agreed'

  const prompt = `Write a short, direct overview for a design quote (2–3 sentences). Just describe what the work is and why it matters. Be natural, not corporate. Use British English.

Studio: ${STUDIO.name}
Client: ${client.name}${client.company ? `, ${client.company}` : ''}
Project: ${project.name || 'Design Project'}
Type: ${project.projectType ?? 'Design Project'}
What we'll do: ${project.brief || 'design work as discussed'}

Return only the overview. No heading, no preamble, no AI-speak.`

  const overview = await callClaude(prompt)

  return {
    overview: overview.trim(),
    subtotal,
    vat,
    total,
    validUntil,
    currency,
    notes,
  }
}

// ─── SOW ─────────────────────────────────────────────────────────────────────

export async function generateSOW({ client, project, currency = 'GBP', notes = '' }) {
  // Support both old phases format and new paymentTranches format
  const paymentTranches = project.paymentTranches ?? []
  const deliverables = project.deliverables ?? []

  const totalValue = Array.isArray(paymentTranches)
    ? paymentTranches.reduce((s, t) => s + (Number(t.amount) || 0), 0)
    : 0
  const vat = totalValue * STUDIO.vatRate

  const deliverableNames = deliverables.filter(d => d.name).map(d => d.name)
  const deliverablesList = deliverableNames.length
    ? deliverableNames.map(n => `- ${n}`).join('\n')
    : '- As outlined in the project brief'

  // Build Tranche table with costs, VAT, percentages, and due dates
  const trancheTableRows = paymentTranches
    .filter(t => t.label && t.amount)
    .map((t, i) => {
      const cost = Number(t.amount) || 0
      const trancheVat = cost * STUDIO.vatRate
      const percentOfTotal = totalValue > 0 ? ((cost / totalValue) * 100).toFixed(0) : 0
      const dueMonth = t.month
        ? new Date(t.month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : 'To be confirmed'
      return {
        tranche: i + 1,
        name: t.label,
        cost: fmt(cost, currency),
        vat: fmt(trancheVat, currency),
        percentage: `${percentOfTotal}%`,
        dueDate: dueMonth,
      }
    })

  const startDateFormatted = project.startDate
    ? new Date(project.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'To be confirmed'

  const prompt = `You are writing a Statement of Work for ${STUDIO.name}, a design studio based in London. Write in clear, professional British English — be direct and natural, no corporate clichés. Return exactly the following sections and no others:

## INTRODUCTION
Write 2–3 sentences. Just state: this is a design SOW between ${STUDIO.name} and ${client.name}${client.company ? ` (${client.company})` : ''} for "${project.name || 'the Project'}" (${project.projectType ?? 'design'}). Keep it straightforward — no flowery language, no AI-speak.

## SCOPE OF SERVICES
Write 1–2 short paragraphs describing the design services ${STUDIO.name} will provide. Reference the brief: "${project.brief || 'as discussed and agreed between the parties'}". Then list the key deliverables as bullet points:
${deliverablesList}

## TIMELINE & MILESTONES
Project start: ${startDateFormatted}
Reference each deliverable milestone corresponding to the payment schedule below.

## FEES & PAYMENT SCHEDULE
Present the fee breakdown in a clear table format for each tranche. Use this structure:

| Tranche | Description | Cost (ex VAT) | VAT | % of Total | Due |
|---------|-------------|---------------|-----|-----------|-----|
${trancheTableRows.map(r => `| Tranche ${r.tranche} | ${r.name} | ${r.cost} | ${r.vat} | ${r.percentage} | ${r.dueDate} |`).join('\n')}
| | **TOTAL** | **${fmt(totalValue, currency)}** | **${fmt(vat, currency)}** | **100%** | |

Then add this summary:
**Total Project Fee (inc VAT): ${fmt(totalValue + vat, currency)}**

## DEFINITIONS
Define each of the following terms as used in this document. Format each as: **"[Term]"** means [definition]. Be precise and concise (one sentence each).
Define all of these terms: Agency, Client, Services, Deliverables, Project, Fees${deliverableNames.length ? `, and also define each of these specific deliverables as a term: ${deliverableNames.join(', ')}` : ''}.

Write only these sections above. No preamble, no closing remarks.`

  const content = await callClaude(prompt)

  return {
    content: content.trim(),
    totalValue,
    vat,
    currency,
    notes,
    startDate: project.startDate,
  }
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export async function generateInvoice({ client, project, phase, invoiceNumber, amount, dueDate, description, currency = 'GBP', notes = '' }) {
  const vat = amount * STUDIO.vatRate
  const total = amount + vat
  const dueDateFormatted = dueDate
    ? new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Upon receipt'

  const prompt = `Write a short paragraph (2–3 sentences) describing the work on this invoice. Be straightforward and natural, no corporate language. Use British English.

Studio: ${STUDIO.name}
Client: ${client.name}${client.company ? `, ${client.company}` : ''}
Project: ${project?.name ?? 'Design Services'}${phase ? ` — ${phase.name}` : ''}
What was delivered: ${description ?? project?.brief ?? 'design work'}
Amount: ${fmt(amount, currency)} ex VAT

Return only the paragraph. No preamble.`

  const workDescription = await callClaude(prompt)

  return {
    workDescription: workDescription.trim(),
    amount,
    vat,
    total,
    dueDate,
    dueDateFormatted,
    currency,
    notes,
    invoiceNumber,
  }
}

// ─── Retainer Invoice ─────────────────────────────────────────────────────────

export async function generateRetainerInvoice({ client, retainer, invoiceNumber, month, year, dueDate, currency = 'GBP', notes = '' }) {
  const amount = retainer.monthlyFee
  const vat = amount * STUDIO.vatRate
  const total = amount + vat
  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const dueDateFormatted = dueDate
    ? new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Upon receipt'

  const prompt = `Write a single concise paragraph (2–3 sentences) for a monthly retainer invoice. Describe the ongoing design services provided during the period. Use clear, professional British English — no headings, no lists, no corporate clichés.

Studio: ${STUDIO.name}
Client: ${client.name}${client.company ? `, ${client.company}` : ''}
Retainer: ${retainer.description}
Period: ${monthLabel}
Monthly fee: ${fmt(amount, currency)} ex VAT

Return only the paragraph.`

  const workDescription = await callClaude(prompt)

  return {
    workDescription: workDescription.trim(),
    amount,
    vat,
    total,
    monthLabel,
    dueDate,
    dueDateFormatted,
    currency,
    notes,
    invoiceNumber,
  }
}
