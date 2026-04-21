import { STUDIO } from '../config/studio.js'

const PROXY_URL = '/api/generate'

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

export async function generateQuote({ client, project, lineItems, depositPercent, validityDays = 30, currency = 'GBP', notes = '' }) {
  const subtotal = lineItems.reduce((s, li) => s + (Number(li.qty) * Number(li.unitPrice)), 0)
  const vat = subtotal * STUDIO.vatRate
  const total = subtotal + vat
  const deposit = total * (depositPercent / 100)
  const balance = total - deposit

  const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const itemList = lineItems.map(li => `- ${li.desc}: ${fmt(Number(li.qty) * Number(li.unitPrice), currency)}`).join('\n')

  const prompt = `Write a concise, professional project overview paragraph (3–5 sentences) for a design studio quote. Describe the creative engagement in clear, confident language. Avoid corporate clichés and flowery language. Be direct and genuine. Use British English. Do not list prices or deliverables — just set the context for the work.

Studio: ${STUDIO.name}
Client: ${client.name}${client.company ? `, ${client.company}` : ''}
Project: ${project.name || 'Design Project'}
Type: ${project.projectType ?? 'Design Project'}
Brief: ${project.brief || 'Strategic design engagement'}
Deliverables:
${itemList}

Return only the paragraph. No heading, no preamble.`

  const overview = await callClaude(prompt)

  return {
    overview: overview.trim(),
    subtotal,
    vat,
    total,
    deposit,
    balance,
    depositPercent,
    validUntil,
    currency,
    notes,
  }
}

// ─── SOW ─────────────────────────────────────────────────────────────────────

export async function generateSOW({ client, project, currency = 'GBP', notes = '' }) {
  const phases = project.phases ?? []
  const totalValue = phases.reduce((s, p) => s + (Number(p.value) || 0), 0)
  const vat = totalValue * STUDIO.vatRate

  const phaseNames = phases.filter(p => p.name).map(p => p.name)
  const phasesText = phaseNames.length
    ? phaseNames.map((n, i) => `Phase ${i + 1}: ${n} — ${fmt(Number(phases[i].value) || 0, currency)}`).join('\n')
    : 'Full project scope as briefed'

  // Build Tranche table with costs, VAT, percentages, and due dates
  const trancheTableRows = phases
    .filter(p => p.name && p.value)
    .map((p, i) => {
      const cost = Number(p.value) || 0
      const phaseVat = cost * STUDIO.vatRate
      const percentOfTotal = totalValue > 0 ? ((cost / totalValue) * 100).toFixed(0) : 0
      const dueDate = p.dueDate
        ? new Date(p.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : 'To be confirmed'
      return {
        tranche: i + 1,
        name: p.name,
        cost: fmt(cost, currency),
        vat: fmt(phaseVat, currency),
        percentage: `${percentOfTotal}%`,
        dueDate: dueDate,
      }
    })

  const startDateFormatted = project.startDate
    ? new Date(project.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'To be confirmed'

  const prompt = `You are writing a Statement of Work for ${STUDIO.name}, a design studio based in London. Write in clear, professional British English — avoid corporate clichés and be direct. Return exactly the following sections and no others:

## INTRODUCTION
Write 2–3 sentences introducing the agreement between ${STUDIO.name} (the Agency) and ${client.name}${client.company ? ` (${client.company})` : ''} (the Client) for the project "${project.name || 'the Project'}". Reference the project type (${project.projectType ?? 'design'}) and briefly state the purpose of this document.

## SCOPE OF SERVICES
Write 1–2 short paragraphs describing the design services ${STUDIO.name} will provide. Reference the brief: "${project.brief || 'as discussed and agreed between the parties'}". Then list the key deliverables as bullet points:
${phaseNames.length ? phaseNames.map(n => `- ${n}`).join('\n') : '- As outlined in the project brief'}

## TIMELINE & MILESTONES
Project start: ${startDateFormatted}
List each phase on its own line in this format: **Phase [N] — [Name]**: [brief one-line description of what this phase delivers]
Phases:
${phasesText}

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
Define all of these terms: Agency, Client, Services, Deliverables, Project, Fees${phaseNames.length ? `, and also define each of these specific deliverables as a term: ${phaseNames.join(', ')}` : ''}.

Write only these sections above. No preamble, no closing remarks.`

  const content = await callClaude(prompt)

  return {
    content: content.trim(),
    phases,
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

  const prompt = `Write a single concise paragraph (2–4 sentences) describing the design work being invoiced. Use clear, professional British English — no headings, no lists, no corporate clichés. Be direct and genuine.

Studio: ${STUDIO.name}
Client: ${client.name}${client.company ? `, ${client.company}` : ''}
Project: ${project?.name ?? 'Design Services'}${phase ? ` — ${phase.name}` : ''}
Description: ${description ?? project?.brief ?? 'Professional design services'}
Amount: ${fmt(amount, currency)} ex VAT

Return only the paragraph.`

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
