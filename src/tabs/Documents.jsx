import { useState, useEffect } from 'react'
import { ArrowLeft, Download, Send, CheckCircle, XCircle, Trash2, CheckSquare, Plus, FileText, BookOpen, Receipt } from 'lucide-react'
import { Modal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { generateQuote, generateSOW, generateInvoice } from '../ai/anthropic.js'
import { STUDIO, TERMS_AND_CONDITIONS } from '../config/studio.js'

function fmt(n, currency = 'GBP') {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

const STATUS_COLORS = {
  draft: 'draft', sent: 'sent', paid: 'paid',
  approved: 'approved', rejected: 'rejected',
}

function Badge({ status }) {
  return <span className={`badge badge-${STATUS_COLORS[status] ?? 'draft'}`}>{status}</span>
}

function TypeBadge({ type }) {
  const colors = { quote: 'quoted', sow: 'confirmed', invoice: 'active' }
  return <span className={`badge badge-${colors[type] ?? 'draft'}`}>{type?.toUpperCase()}</span>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return 'To be confirmed'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function parseBold(text) {
  const parts = text.split(/\*\*(.+?)\*\*/)
  return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)
}

// Converts AI plain-text content to React elements (for screen view)
function renderDocContent(content) {
  if (!content) return null
  const lines = content.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed && elements.length === 0) { i++; continue }

    if (trimmed === '---' || trimmed.match(/^-{3,}$/) || trimmed.match(/^_{3,}$/)) {
      elements.push(<hr key={i} className="dp-rule" />)
      i++; continue
    }

    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      elements.push(<h1 key={i} className="dp-h1">{parseBold(trimmed.slice(2))}</h1>)
      i++; continue
    }

    if (trimmed.startsWith('## ')) {
      elements.push(<h2 key={i} className="dp-h2">{parseBold(trimmed.slice(3))}</h2>)
      i++; continue
    }

    if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.slice(2, -2).includes('**')) {
      elements.push(<p key={i} className="dp-bold-line">{trimmed.slice(2, -2)}</p>)
      i++; continue
    }

    if (trimmed.length >= 3 && !trimmed.startsWith('*') && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && !trimmed.includes('£') && !trimmed.match(/^\d/) && !trimmed.startsWith('•') && !trimmed.startsWith('-')) {
      elements.push(<h2 key={i} className="dp-h2">{trimmed}</h2>)
      i++; continue
    }

    if (trimmed.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i].trim()
        if (!row.match(/^\|[\s\-:|]+\|$/)) rows.push(row)
        i++
      }
      if (rows.length > 0) {
        const parseRow = (row) => row.split('|').slice(1, -1).map(c => c.trim())
        const headers = parseRow(rows[0])
        elements.push(
          <table key={`tbl-${i}`} className="dp-table">
            <thead><tr>{headers.map((h, j) => <th key={j} className="dp-th">{parseBold(h)}</th>)}</tr></thead>
            <tbody>{rows.slice(1).map((row, j) => <tr key={j}>{parseRow(row).map((cell, k) => <td key={k} className="dp-td">{parseBold(cell)}</td>)}</tr>)}</tbody>
          </table>
        )
      }
      continue
    }

    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items = []
      while (i < lines.length && (lines[i].trim().startsWith('• ') || lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        items.push(lines[i].trim().slice(2))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="dp-list">
          {items.map((it, j) => <li key={j}>{parseBold(it)}</li>)}
        </ul>
      )
      continue
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''))
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} className="dp-list">
          {items.map((it, j) => <li key={j}>{parseBold(it)}</li>)}
        </ol>
      )
      continue
    }

    if (!trimmed) {
      const lastEl = elements[elements.length - 1]
      const lastIsSpacerOrHeading = lastEl && (lastEl.props?.className === 'dp-spacer' || lastEl.props?.className === 'dp-h2' || lastEl.props?.className === 'dp-rule')
      if (!lastIsSpacerOrHeading) elements.push(<div key={i} className="dp-spacer" />)
      i++; continue
    }

    elements.push(<p key={i} className="dp-para">{parseBold(trimmed)}</p>)
    i++
  }

  return elements
}

// ─── Static section renderers (React) ─────────────────────────────────────────

function TermsSection() {
  const sections = TERMS_AND_CONDITIONS.split(/\n\n(?=[A-Z])/)
  return (
    <div className="dp-static-section">
      <h2 className="dp-h2">Terms &amp; Conditions</h2>
      {sections.map((block, i) => {
        const [heading, ...rest] = block.split('\n')
        return (
          <div key={i} className="dp-terms-block">
            <p className="dp-bold-line">{heading}</p>
            {rest.map((line, j) => line.trim() && <p key={j} className="dp-para dp-terms-para">{line.trim()}</p>)}
          </div>
        )
      })}
    </div>
  )
}

function BankDetailsSection({ invoiceNumber, dueDate, currency }) {
  return (
    <div className="dp-static-section">
      <h2 className="dp-h2">Payment Details</h2>
      <div className="dp-kv-block">
        <div className="dp-kv"><span className="dp-kv-label">Account Name</span><span className="dp-kv-value">{STUDIO.bank.accountName}</span></div>
        <div className="dp-kv"><span className="dp-kv-label">Sort Code</span><span className="dp-kv-value">{STUDIO.bank.sortCode}</span></div>
        <div className="dp-kv"><span className="dp-kv-label">Account Number</span><span className="dp-kv-value">{STUDIO.bank.accountNumber}</span></div>
        <div className="dp-kv"><span className="dp-kv-label">IBAN</span><span className="dp-kv-value">{STUDIO.bank.iban}</span></div>
        <div className="dp-kv"><span className="dp-kv-label">BIC / SWIFT</span><span className="dp-kv-value">{STUDIO.bank.bic}</span></div>
        {invoiceNumber && <div className="dp-kv"><span className="dp-kv-label">Payment Reference</span><span className="dp-kv-value">{invoiceNumber}</span></div>}
        {dueDate && <div className="dp-kv"><span className="dp-kv-label">Payment Due</span><span className="dp-kv-value">{fmtDate(dueDate)}</span></div>}
      </div>
    </div>
  )
}

function PaymentSummarySection({ amount, vat, total, currency, poNumber }) {
  return (
    <div className="dp-static-section">
      <h2 className="dp-h2">Payment Summary</h2>
      <div className="dp-kv-block">
        {poNumber && <div className="dp-kv"><span className="dp-kv-label">PO Number</span><span className="dp-kv-value">{poNumber}</span></div>}
        <div className="dp-kv"><span className="dp-kv-label">Services (ex VAT)</span><span className="dp-kv-value">{fmt(amount, currency)}</span></div>
        <div className="dp-kv"><span className="dp-kv-label">VAT (20%)</span><span className="dp-kv-value">{fmt(vat, currency)}</span></div>
        <div className="dp-kv dp-kv-total"><span className="dp-kv-label">Total Due</span><span className="dp-kv-value">{fmt(total, currency)}</span></div>
      </div>
    </div>
  )
}

function InvestmentSection({ lineItems, deliverables, paymentTranches, subtotal, vat, total, depositPercent, deposit, balance, currency }) {
  const fmtMonth = (m) => m ? new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'

  // New-style: paymentTranches
  if (paymentTranches?.length) {
    const trancheTotal = paymentTranches.reduce((s, t) => s + (Number(t.amount) || 0), 0)
    const trancheVat = trancheTotal * 0.2
    return (
      <div className="dp-static-section">
        {deliverables?.length > 0 && (
          <>
            <h2 className="dp-h2">Phases &amp; Deliverables</h2>
            <ul className="dp-list" style={{ marginBottom: 20 }}>
              {deliverables.map((d, i) => <li key={i}>{d.name}</li>)}
            </ul>
          </>
        )}
        <h2 className="dp-h2">Payment Structure</h2>
        <div className="dp-kv-block">
          {paymentTranches.map((t, i) => (
            <div key={i} className="dp-kv">
              <span className="dp-kv-label">{t.label || `Tranche ${i + 1}`} — {fmtMonth(t.month)}</span>
              <span className="dp-kv-value">{fmt(Number(t.amount), currency)}</span>
            </div>
          ))}
          <div className="dp-kv dp-kv-sub"><span className="dp-kv-label">Subtotal (ex VAT)</span><span className="dp-kv-value">{fmt(trancheTotal, currency)}</span></div>
          <div className="dp-kv"><span className="dp-kv-label">VAT (20%)</span><span className="dp-kv-value">{fmt(trancheVat, currency)}</span></div>
          <div className="dp-kv dp-kv-total"><span className="dp-kv-label">Total Investment</span><span className="dp-kv-value">{fmt(trancheTotal + trancheVat, currency)}</span></div>
        </div>
        <p className="dp-para dp-terms-para" style={{ marginTop: 12 }}>Payment terms: Net 30 days from invoice date. Invoices issued at each payment milestone.</p>
      </div>
    )
  }

  // Legacy: line items
  return (
    <div className="dp-static-section">
      <h2 className="dp-h2">Deliverables &amp; Investment</h2>
      <div className="dp-kv-block">
        {lineItems?.map((li, i) => (
          <div key={i} className="dp-kv">
            <span className="dp-kv-label">{li.desc || `Item ${i + 1}`}</span>
            <span className="dp-kv-value">{fmt(Number(li.qty) * Number(li.unitPrice), currency)}</span>
          </div>
        ))}
        <div className="dp-kv dp-kv-sub"><span className="dp-kv-label">Subtotal (ex VAT)</span><span className="dp-kv-value">{fmt(subtotal, currency)}</span></div>
        <div className="dp-kv"><span className="dp-kv-label">VAT (20%)</span><span className="dp-kv-value">{fmt(vat, currency)}</span></div>
        <div className="dp-kv dp-kv-total"><span className="dp-kv-label">Total Investment</span><span className="dp-kv-value">{fmt(total, currency)}</span></div>
      </div>
      <h2 className="dp-h2" style={{ marginTop: 24 }}>Payment Structure</h2>
      <div className="dp-kv-block">
        <div className="dp-kv"><span className="dp-kv-label">Deposit ({depositPercent}%) — due on commencement</span><span className="dp-kv-value">{fmt(deposit, currency)}</span></div>
        <div className="dp-kv"><span className="dp-kv-label">Balance — due on completion</span><span className="dp-kv-value">{fmt(balance, currency)}</span></div>
      </div>
      <p className="dp-para dp-terms-para" style={{ marginTop: 12 }}>Payment terms: Net 30 days from invoice date. Invoices issued at each payment milestone.</p>
    </div>
  )
}

function QuoteTermsSection({ validUntil }) {
  return (
    <div className="dp-static-section">
      <h2 className="dp-h2">Terms</h2>
      <p className="dp-para dp-terms-para">
        This proposal is valid until {validUntil}. Acceptance of this quote — whether by signature, written confirmation, or commencement of work — constitutes acceptance of {STUDIO.name}&rsquo;s standard terms and conditions. For questions or to proceed, contact <strong>{STUDIO.email}</strong>.
      </p>
    </div>
  )
}

// ─── Document Paper (screen view) ────────────────────────────────────────────

function Letterhead({ doc, client }) {
  const issueDateStr = new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const docLabel = doc.type === 'invoice'
    ? `Invoice ${doc.invoiceNumber ?? ''}`
    : doc.type?.toUpperCase()

  return (
    <>
      <div className="dp-letterhead">
        <div className="dp-studio">
          {STUDIO.logoPath && (
            <img src={STUDIO.logoPath} alt="Regular Studio" className="dp-logo" style={{ height: 40, marginBottom: 12 }} />
          )}
          <div className="dp-studio-name">{STUDIO.name}</div>
          <div className="dp-studio-address">
            {STUDIO.address.line1}, {STUDIO.address.line2}<br />
            {STUDIO.address.city}, {STUDIO.address.postcode}
          </div>
          <div className="dp-studio-meta">{STUDIO.email} &middot; {STUDIO.website}</div>
        </div>
        <div className="dp-meta-right">
          <div className="dp-doc-label">{docLabel}</div>
          <div className="dp-doc-date">Issued: {issueDateStr}</div>
          {doc.type === 'invoice' && doc.dueDate && (
            <div className="dp-doc-date">Due: {fmtDate(doc.dueDate)}</div>
          )}
          {doc.type === 'quote' && doc.validUntil && (
            <div className="dp-doc-date">Valid until: {doc.validUntil}</div>
          )}
        </div>
      </div>
      <div className="dp-header-divider" />

      {client && (
        <div className="dp-client">
          <div className="dp-client-to">Prepared for</div>
          <div className="dp-client-name">{client.name}</div>
          {client.company && client.company !== client.name && (
            <div className="dp-client-company">{client.company}</div>
          )}
          {client.address && <div className="dp-client-address">{client.address}</div>}
          {client.email && <div className="dp-client-address">{client.email}</div>}
        </div>
      )}
    </>
  )
}

function DocFooter({ doc }) {
  return (
    <>
      <div className="dp-footer-divider" />
      <div className="dp-footer">
        <span>Regular Studio™️</span>
        <span>Strictly Confidential</span>
      </div>
    </>
  )
}

function DocumentPaper({ doc, client, project }) {
  const currency = doc.currency ?? 'GBP'

  return (
    <div className="document-paper">
      <Letterhead doc={doc} client={client} />

      {(project || doc.projectName) && (
        <div className="dp-subject">
          <span className="dp-subject-label">Re</span>
          <span className="dp-subject-text">
            {project?.name ?? doc.projectName}
            {doc.phaseName ? ` — ${doc.phaseName}` : ''}
          </span>
        </div>
      )}

      <div className="dp-rule-heavy" />

      {/* ── Invoice ── */}
      {doc.type === 'invoice' && (
        <div className="dp-body">
          {doc.workDescription
            ? <p className="dp-para">{doc.workDescription}</p>
            : renderDocContent(doc.content)}
          <PaymentSummarySection amount={doc.amount} vat={doc.vat} total={doc.total} currency={currency} poNumber={doc.poNumber} />
          <BankDetailsSection invoiceNumber={doc.invoiceNumber} dueDate={doc.dueDate} currency={currency} />
          {doc.notes && (
            <div className="dp-static-section">
              <h2 className="dp-h2">Notes</h2>
              <p className="dp-para dp-terms-para">{doc.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Quote ── */}
      {doc.type === 'quote' && (
        <div className="dp-body">
          {doc.overview
            ? <p className="dp-para">{doc.overview}</p>
            : renderDocContent(doc.content)}
          <InvestmentSection
            lineItems={doc.lineItems}
            deliverables={doc.deliverables}
            paymentTranches={doc.paymentTranches}
            subtotal={doc.subtotal}
            vat={doc.vat}
            total={doc.total}
            depositPercent={doc.depositPercent ?? 50}
            deposit={doc.deposit}
            balance={doc.balance ?? (doc.total - doc.deposit)}
            currency={currency}
          />
          <QuoteTermsSection validUntil={doc.validUntil ?? `${doc.validityDays ?? 30} days from issue`} />
          {doc.notes && (
            <div className="dp-static-section">
              <h2 className="dp-h2">Notes</h2>
              <p className="dp-para dp-terms-para">{doc.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── SOW ── */}
      {doc.type === 'sow' && (
        <div className="dp-body">
          {renderDocContent(doc.content)}

          {doc.total && (
            <div className="dp-static-section">
              <h2 className="dp-h2">Project Fee</h2>
              <div className="dp-kv-block">
                {doc.vat && <div className="dp-kv"><span className="dp-kv-label">Fee (ex VAT)</span><span className="dp-kv-value">{fmt(doc.total - doc.vat, doc.currency ?? 'GBP')}</span></div>}
                {doc.vat && <div className="dp-kv"><span className="dp-kv-label">VAT (20%)</span><span className="dp-kv-value">{fmt(doc.vat, doc.currency ?? 'GBP')}</span></div>}
                <div className="dp-kv dp-kv-total"><span className="dp-kv-label">Total Project Fee</span><span className="dp-kv-value">{fmt(doc.total + (doc.vat ?? 0), doc.currency ?? 'GBP')}</span></div>
              </div>
            </div>
          )}

          {doc.notes && (
            <div className="dp-static-section">
              <h2 className="dp-h2">Notes</h2>
              <p className="dp-para dp-terms-para">{doc.notes}</p>
            </div>
          )}
          <TermsSection />
        </div>
      )}

      <DocFooter doc={doc} />
    </div>
  )
}

// ─── Print HTML builder ───────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function parseBoldHtml(text) {
  return esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function contentToHtml(content) {
  if (!content) return ''
  const lines = content.split('\n')
  const out = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed && out.length === 0) { i++; continue }

    if (trimmed === '---' || trimmed.match(/^-{3,}$/) || trimmed.match(/^_{3,}$/)) {
      out.push('<hr class="dp-rule">')
      i++; continue
    }

    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      out.push(`<h1 class="dp-h1">${parseBoldHtml(trimmed.slice(2))}</h1>`)
      i++; continue
    }

    if (trimmed.startsWith('## ')) {
      out.push(`<h2 class="dp-h2">${parseBoldHtml(trimmed.slice(3))}</h2>`)
      i++; continue
    }

    if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.slice(2, -2).includes('**')) {
      out.push(`<p class="dp-bold-line">${esc(trimmed.slice(2, -2))}</p>`)
      i++; continue
    }

    if (trimmed.length >= 3 && !trimmed.startsWith('*') && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && !trimmed.includes('£') && !trimmed.match(/^\d/) && !trimmed.startsWith('•') && !trimmed.startsWith('-')) {
      out.push(`<h2 class="dp-h2">${esc(trimmed)}</h2>`)
      i++; continue
    }

    if (trimmed.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i].trim()
        if (!row.match(/^\|[\s\-:|]+\|$/)) rows.push(row)
        i++
      }
      if (rows.length > 0) {
        const parseRow = (row) => row.split('|').slice(1, -1).map(c => c.trim())
        const headers = parseRow(rows[0])
        const headerHtml = headers.map(h => `<th class="dp-th">${parseBoldHtml(h)}</th>`).join('')
        const bodyHtml = rows.slice(1).map(row =>
          `<tr>${parseRow(row).map(cell => `<td class="dp-td">${parseBoldHtml(cell)}</td>`).join('')}</tr>`
        ).join('')
        out.push(`<table class="dp-table"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`)
      }
      continue
    }

    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items = []
      while (i < lines.length && (lines[i].trim().startsWith('• ') || lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        items.push(`<li>${parseBoldHtml(lines[i].trim().slice(2))}</li>`)
        i++
      }
      out.push(`<ul class="dp-list">${items.join('')}</ul>`)
      continue
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(`<li>${parseBoldHtml(lines[i].trim().replace(/^\d+\.\s/, ''))}</li>`)
        i++
      }
      out.push(`<ol class="dp-list">${items.join('')}</ol>`)
      continue
    }

    if (!trimmed) {
      out.push('<div class="dp-spacer"></div>')
      i++; continue
    }

    out.push(`<p class="dp-para">${parseBoldHtml(trimmed)}</p>`)
    i++
  }

  return out.join('\n')
}

function kvRow(label, value) {
  return `<div class="dp-kv"><span class="dp-kv-label">${esc(label)}</span><span class="dp-kv-value">${esc(value)}</span></div>`
}

function buildPrintHtml(doc, client, project) {
  const currency = doc.currency ?? 'GBP'
  const issueDateStr = new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const docLabel = doc.type === 'invoice' ? `Invoice ${doc.invoiceNumber ?? ''}` : doc.type?.toUpperCase()

  // Letterhead
  const letterhead = `
    <div class="dp-letterhead">
      <div class="dp-studio">
        ${logoImg}
        <div class="dp-studio-name">${esc(STUDIO.name)}</div>
        <div class="dp-studio-address">${esc(STUDIO.address.line1)}, ${esc(STUDIO.address.line2)}<br>${esc(STUDIO.address.city)}, ${esc(STUDIO.address.postcode)}</div>
        <div class="dp-studio-meta">${esc(STUDIO.email)} &middot; ${esc(STUDIO.website)}</div>
      </div>
      <div class="dp-meta-right">
        <div class="dp-doc-label">${esc(docLabel)}</div>
        <div class="dp-doc-date">Issued: ${esc(issueDateStr)}</div>
        ${doc.type === 'invoice' && doc.dueDate ? `<div class="dp-doc-date">Due: ${esc(fmtDate(doc.dueDate))}</div>` : ''}
        ${doc.type === 'quote' && doc.validUntil ? `<div class="dp-doc-date">Valid until: ${esc(doc.validUntil)}</div>` : ''}
      </div>
    </div>
    <div class="dp-header-divider"></div>`

  const clientBlock = client ? `
    <div class="dp-client">
      <div class="dp-client-to">Prepared for</div>
      <div class="dp-client-name">${esc(client.name)}</div>
      ${client.company && client.company !== client.name ? `<div class="dp-client-company">${esc(client.company)}</div>` : ''}
      ${client.address ? `<div class="dp-client-address">${esc(client.address)}</div>` : ''}
      ${client.email ? `<div class="dp-client-address">${esc(client.email)}</div>` : ''}
    </div>` : ''

  const subjectLine = (project?.name || doc.projectName) ? `
    <div class="dp-subject">
      <span class="dp-subject-label">Re</span>
      <span class="dp-subject-text">${esc(project?.name ?? doc.projectName)}${doc.phaseName ? ` &mdash; ${esc(doc.phaseName)}` : ''}</span>
    </div>` : ''

  // Static sections HTML
  const termsHtml = (() => {
    const sections = TERMS_AND_CONDITIONS.split(/\n\n(?=[A-Z])/)
    const inner = sections.map(block => {
      const [heading, ...rest] = block.split('\n')
      return `<div class="dp-terms-block">
        <p class="dp-bold-line">${esc(heading)}</p>
        ${rest.filter(l => l.trim()).map(l => `<p class="dp-para dp-terms-para">${esc(l.trim())}</p>`).join('')}
      </div>`
    }).join('')
    return `<div class="dp-static-section"><h2 class="dp-h2">Terms &amp; Conditions</h2>${inner}</div>`
  })()

  const bankHtml = `
    <div class="dp-static-section">
      <h2 class="dp-h2">Payment Details</h2>
      <div class="dp-kv-block">
        ${kvRow('Account Name', STUDIO.bank.accountName)}
        ${kvRow('Sort Code', STUDIO.bank.sortCode)}
        ${kvRow('Account Number', STUDIO.bank.accountNumber)}
        ${kvRow('IBAN', STUDIO.bank.iban)}
        ${kvRow('BIC / SWIFT', STUDIO.bank.bic)}
        ${doc.invoiceNumber ? kvRow('Payment Reference', doc.invoiceNumber) : ''}
        ${doc.dueDate ? kvRow('Payment Due', fmtDate(doc.dueDate)) : ''}
      </div>
    </div>`

  const paymentSummaryHtml = `
    <div class="dp-static-section">
      <h2 class="dp-h2">Payment Summary</h2>
      <div class="dp-kv-block">
        ${doc.poNumber ? kvRow('PO Number', doc.poNumber) : ''}
        ${kvRow('Services (ex VAT)', fmt(doc.amount, currency))}
        ${kvRow('VAT (20%)', fmt(doc.vat, currency))}
        <div class="dp-kv dp-kv-total"><span class="dp-kv-label">Total Due</span><span class="dp-kv-value">${esc(fmt(doc.total, currency))}</span></div>
      </div>
    </div>`

  const investmentHtml = (() => {
    const items = (doc.lineItems ?? []).map(li =>
      kvRow(li.desc || 'Item', fmt(Number(li.qty) * Number(li.unitPrice), currency))
    ).join('')
    const balance = doc.balance ?? (doc.total - doc.deposit)
    return `
      <div class="dp-static-section">
        <h2 class="dp-h2">Deliverables &amp; Investment</h2>
        <div class="dp-kv-block">
          ${items}
          <div class="dp-kv dp-kv-sub"><span class="dp-kv-label">Subtotal (ex VAT)</span><span class="dp-kv-value">${esc(fmt(doc.subtotal, currency))}</span></div>
          ${kvRow('VAT (20%)', fmt(doc.vat, currency))}
          <div class="dp-kv dp-kv-total"><span class="dp-kv-label">Total Investment</span><span class="dp-kv-value">${esc(fmt(doc.total, currency))}</span></div>
        </div>
        <h2 class="dp-h2" style="margin-top:24px">Payment Structure</h2>
        <div class="dp-kv-block">
          ${kvRow(`Deposit (${doc.depositPercent ?? 50}%) — due on commencement`, fmt(doc.deposit, currency))}
          ${kvRow('Balance — due on completion', fmt(balance, currency))}
        </div>
        <p class="dp-para dp-terms-para" style="margin-top:12px">Payment terms: Net 30 days from invoice date. Invoices issued at each payment milestone.</p>
      </div>`
  })()

  const quoteTermsHtml = `
    <div class="dp-static-section">
      <h2 class="dp-h2">Terms</h2>
      <p class="dp-para dp-terms-para">This proposal is valid until ${esc(doc.validUntil ?? `${doc.validityDays ?? 30} days from issue`)}. Acceptance of this quote — whether by signature, written confirmation, or commencement of work — constitutes acceptance of ${esc(STUDIO.name)}'s standard terms and conditions. For questions or to proceed, contact <strong>${esc(STUDIO.email)}</strong>.</p>
    </div>`

  const notesHtml = doc.notes ? `
    <div class="dp-static-section">
      <h2 class="dp-h2">Notes</h2>
      <p class="dp-para dp-terms-para">${esc(doc.notes)}</p>
    </div>` : ''

  const footerDividerHtml = `<div class="dp-footer-divider"></div>`

  const footerHtml = `
    <div class="dp-footer">
      <span>Regular Studio™️</span>
      <span>Strictly Confidential</span>
    </div>`

  const logoImg = STUDIO.logoPath ? `<img src="${STUDIO.logoPath}" alt="Regular Studio" class="dp-logo" style="max-width:120px;height:auto;display:block;margin-bottom:12px;">` : ''

  // Body by type
  let bodyHtml = ''
  if (doc.type === 'invoice') {
    const descHtml = doc.workDescription
      ? `<p class="dp-para">${esc(doc.workDescription)}</p>`
      : contentToHtml(doc.content)
    bodyHtml = descHtml + paymentSummaryHtml + bankHtml + notesHtml
  } else if (doc.type === 'quote') {
    const overviewHtml = doc.overview
      ? `<p class="dp-para">${esc(doc.overview)}</p>`
      : contentToHtml(doc.content)
    bodyHtml = overviewHtml + investmentHtml + quoteTermsHtml + notesHtml
  } else if (doc.type === 'sow') {
    bodyHtml = contentToHtml(doc.content) + notesHtml + termsHtml
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 18mm 18mm 22mm; }
    html { font-size: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; line-height: 1.75; color: #111; background: #fff; }
    .paper { max-width: 720px; margin: 0 auto; padding: 48px 56px; }
    .dp-letterhead { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 1px solid #e0e0e0; }
    .dp-logo { max-width: 120px; height: auto; display: block; margin-bottom: 12px; }
    .dp-studio-name { font-family: Georgia, serif; font-size: 17px; font-weight: bold; letter-spacing: -0.01em; }
    .dp-studio-address { font-size: 11px; color: #555; margin-top: 5px; line-height: 1.6; }
    .dp-studio-meta { font-size: 11px; color: #555; margin-top: 3px; }
    .dp-header-divider { border: none; border-top: 1px solid #e0e0e0; margin: 0; }
    .dp-meta-right { text-align: right; }
    .dp-doc-label { font-family: 'Courier New', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #111; font-weight: bold; }
    .dp-doc-date { font-size: 11px; color: #555; margin-top: 3px; }
    .dp-client { margin-bottom: 28px; }
    .dp-client-to { font-family: 'Courier New', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: #888; margin-bottom: 5px; }
    .dp-client-name { font-size: 14px; font-weight: bold; }
    .dp-client-company, .dp-client-address { font-size: 11px; color: #555; margin-top: 2px; }
    .dp-subject { display: flex; align-items: baseline; gap: 10px; margin-bottom: 20px; }
    .dp-subject-label { font-family: 'Courier New', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: #888; flex-shrink: 0; }
    .dp-subject-text { font-size: 13px; font-weight: bold; }
    .dp-rule-heavy { border: none; border-top: 2px solid #111; margin-bottom: 32px; }
    .dp-rule { border: none; border-top: 1px solid #ddd; margin: 18px 0; }
    .dp-h1 { font-family: Georgia, serif; font-size: 20px; font-weight: normal; margin-bottom: 18px; margin-top: 8px; }
    .dp-h2 { font-family: 'Courier New', monospace; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.14em; color: #888; margin-top: 28px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e0e0e0; }
    .dp-para { margin-bottom: 10px; font-size: 12.5px; line-height: 1.8; }
    .dp-terms-para { font-size: 11.5px; line-height: 1.75; color: #333; }
    .dp-bold-line { font-weight: bold; font-size: 12.5px; margin-bottom: 6px; margin-top: 14px; }
    .dp-list { padding-left: 20px; margin-bottom: 12px; }
    .dp-list li { font-size: 12.5px; line-height: 1.75; margin-bottom: 3px; }
    .dp-spacer { height: 10px; }
    .dp-kv-block { margin-bottom: 4px; }
    .dp-kv { display: flex; justify-content: space-between; align-items: baseline; padding: 7px 0; border-bottom: 1px solid #ebebeb; gap: 20px; }
    .dp-kv:last-child { border-bottom: none; }
    .dp-kv-label { font-size: 12px; color: #333; }
    .dp-kv-value { font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold; flex-shrink: 0; }
    .dp-kv-total { background: #f0f4f8; padding: 12px 8px; border-radius: 2px; margin-top: 8px; border-bottom: 2px solid #111; }
    .dp-kv-total .dp-kv-label, .dp-kv-total .dp-kv-value { font-size: 13.5px; color: #111; font-weight: 700; }
    .dp-kv-sub { border-top: 1px solid #ccc; margin-top: 4px; }
    .dp-static-section { margin-top: 36px; page-break-inside: avoid; }
    .dp-terms-block { margin-bottom: 14px; page-break-inside: avoid; }
    .dp-footer-divider { border: none; border-top: 1px solid #e0e0e0; margin: 32px 0 14px 0; }
    .dp-footer { display: flex; justify-content: space-between; font-family: 'Courier New', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; gap: 12px; }
    .dp-table { width: 100%; border-collapse: collapse; margin: 4px 0 20px; font-size: 12px; }
    .dp-th { font-family: 'Courier New', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.09em; color: #888; padding: 7px 10px; text-align: left; border-bottom: 1.5px solid #C8C5BF; background: #F7F6F2; white-space: nowrap; }
    .dp-td { font-size: 12px; padding: 7px 10px; border-bottom: 1px solid #E8E6E0; color: #14140F; vertical-align: middle; line-height: 1.5; }
    .dp-table tr:last-child td { border-bottom: none; font-weight: 600; }
    @media print {
      .paper { padding: 0; }
      .dp-static-section { break-inside: avoid; }
    }
  `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${esc(docLabel)}</title>
  <style>${css}</style>
</head>
<body>
<div class="paper">
  ${letterhead}
  ${clientBlock}
  ${subjectLine}
  <div class="dp-body">
    ${bodyHtml}
  </div>
  ${footerDividerHtml}
  ${footerHtml}
</div>
</body>
</html>`
}

// ─── Document Detail ──────────────────────────────────────────────────────────

function DocumentDetail({ doc, clients, projects, store, onBack }) {
  const toast = useToast()
  const [editMode, setEditMode] = useState(false)
  const client = clients.find(c => c.id === doc.clientId)
  const project = projects.find(p => p.id === doc.projectId)

  async function handleStatusChange(newStatus) {
    try {
      await store.updateDocument(doc.id, { status: newStatus })
      if (newStatus === 'approved' && doc.type === 'quote') {
        if (doc.projectId) await store.updateProject(doc.projectId, { status: 'Confirmed' })
        if (doc.clientId) await store.updateClient(doc.clientId, { pipelineStage: 'Confirmed' })
        toast('Quote approved — project and client stage set to Confirmed', 'success')
      } else {
        toast(`Status updated to ${newStatus}`, 'success')
      }
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this document?')) return
    await store.deleteDocument(doc.id)
    onBack()
    toast('Document deleted', 'info')
  }

  function printDoc() {
    const html = buildPrintHtml(doc, client, project)
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  async function downloadPdf() {
    try {
      const html = buildPrintHtml(doc, client, project)

      // Load html2pdf library
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      document.head.appendChild(script)

      script.onload = () => {
        const element = document.createElement('div')
        element.innerHTML = html

        const docLabel = doc.type === 'invoice'
          ? `Invoice-${doc.invoiceNumber || 'Draft'}`
          : doc.type?.charAt(0).toUpperCase() + doc.type?.slice(1)
        const filename = `${client?.name || 'Document'}-${docLabel}.pdf`

        const options = {
          margin: [18, 18, 22, 18],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { format: 'a4', orientation: 'portrait' }
        }

        window.html2pdf().set(options).from(element.querySelector('.paper')).save()
      }
    } catch (e) {
      toast('Failed to download PDF: ' + e.message, 'error')
    }
  }

  const isInvoice = doc.type === 'invoice'
  const isQuote = doc.type === 'quote'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="detail-back" onClick={onBack} style={{ marginBottom: 0 }}>
          <ArrowLeft size={12} /> Documents
        </button>
        <div style={{ flex: 1 }} />
        <Badge status={doc.status} />
        {isInvoice && doc.status === 'draft' && (
          <button className="btn" onClick={() => handleStatusChange('sent')}><Send size={13} /> Mark Sent</button>
        )}
        {isInvoice && doc.status === 'sent' && (
          <button className="btn btn-accent" onClick={() => handleStatusChange('paid')}><CheckCircle size={13} /> Mark Paid</button>
        )}
        {isQuote && doc.status === 'draft' && (
          <button className="btn" onClick={() => handleStatusChange('sent')}><Send size={13} /> Mark Sent</button>
        )}
        {isQuote && doc.status === 'sent' && (
          <>
            <button className="btn btn-accent" onClick={() => handleStatusChange('approved')}><CheckSquare size={13} /> Approve</button>
            <button className="btn btn-danger" onClick={() => handleStatusChange('rejected')}><XCircle size={13} /> Reject</button>
          </>
        )}
        {doc.status === 'draft' && (
          <button className="btn" onClick={() => setEditMode(true)}>Edit</button>
        )}
        <button className="btn btn-accent" onClick={downloadPdf}><Download size={13} /> Download PDF</button>
        <button className="btn" onClick={printDoc}>Print / PDF</button>
        <button className="btn btn-danger" onClick={handleDelete}><Trash2 size={13} /> Delete</button>
      </div>

      {!editMode ? (
        <DocumentPaper doc={doc} client={client} project={project} />
      ) : (
        <div style={{ marginBottom: 24 }}>
          <button className="detail-back" onClick={() => setEditMode(false)} style={{ marginBottom: 16 }}>
            <ArrowLeft size={12} /> Back to document
          </button>
          <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)', marginBottom: 16 }}>
            Edit the fields below and regenerate the document content.
          </p>
          {doc.type === 'invoice' && (
            <EditInvoiceForm doc={doc} clients={clients} store={store} onSave={() => { setEditMode(false); toast('Invoice updated', 'success') }} />
          )}
          {doc.type === 'quote' && (
            <EditQuoteForm doc={doc} clients={clients} store={store} onSave={() => { setEditMode(false); toast('Quote updated', 'success') }} />
          )}
          {doc.type === 'sow' && (
            <EditSOWForm doc={doc} clients={clients} store={store} onSave={() => { setEditMode(false); toast('SOW updated', 'success') }} />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Quote Creation Modal ─────────────────────────────────────────────────────

function CreateQuoteModal({ clients, store, onClose, onCreated }) {
  const toast = useToast()
  const [clientId, setClientId] = useState('')
  const [projectMode, setProjectMode] = useState('existing') // 'existing' | 'new'
  const [existingProjectId, setExistingProjectId] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectType, setNewProjectType] = useState('')
  const [brief, setBrief] = useState('')
  const [deliverables, setDeliverables] = useState([{ id: crypto.randomUUID(), name: '' }])
  const [paymentTranches, setPaymentTranches] = useState([{ id: crypto.randomUUID(), label: 'Deposit', month: '', amount: '' }])
  const [validityDays, setValidityDays] = useState(30)
  const [notes, setNotes] = useState('')
  const [generating, setGenerating] = useState(false)

  const selectedClient = clients.find(c => c.id === clientId)
  const clientProjects = clientId ? store.projects.filter(p => p.clientId === clientId) : []
  const selectedProject = store.projects.find(p => p.id === existingProjectId)

  // Auto-populate deliverables and paymentTranches when existing project is selected
  useEffect(() => {
    if (existingProjectId && selectedProject) {
      if (selectedProject.deliverables?.length > 0) {
        setDeliverables(selectedProject.deliverables.map(d => ({ id: crypto.randomUUID(), name: d.name })))
      }
      if (selectedProject.paymentTranches?.length > 0) {
        setPaymentTranches(selectedProject.paymentTranches.map(t => ({ id: crypto.randomUUID(), ...t })))
      }
    }
  }, [existingProjectId, selectedProject])

  const addDeliverable = () => setDeliverables(prev => [...prev, { id: crypto.randomUUID(), name: '' }])
  const removeDeliverable = (id) => setDeliverables(prev => prev.filter(d => d.id !== id))
  const setDeliverable = (id, v) => setDeliverables(prev => prev.map(d => d.id === id ? { ...d, name: v } : d))

  const addTranche = () => setPaymentTranches(prev => [...prev, { id: crypto.randomUUID(), label: '', month: '', amount: '' }])
  const removeTranche = (id) => setPaymentTranches(prev => prev.filter(t => t.id !== id))
  const setTranche = (id, k, v) => setPaymentTranches(prev => prev.map(t => t.id === id ? { ...t, [k]: v } : t))

  const total = paymentTranches.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const vat = total * 0.2
  const grandTotal = total + vat

  const projectName = projectMode === 'existing' ? (selectedProject?.name || '') : newProjectName

  async function handleGenerate() {
    if (!clientId) { toast('Select a client', 'error'); return }
    if (projectMode === 'new' && !newProjectName.trim()) { toast('Enter a project name', 'error'); return }
    setGenerating(true)
    try {
      // Create new project if needed
      let projectId = existingProjectId || null
      if (projectMode === 'new') {
        const newProject = await store.createProject({
          name: newProjectName,
          clientId,
          projectType: newProjectType,
          status: 'Quoted',
          brief,
          deliverables,
          paymentTranches,
        })
        projectId = newProject.id
      }

      const result = await generateQuote({
        client: selectedClient,
        project: { name: projectName || 'Project', brief, projectType: newProjectType },
        deliverables,
        paymentTranches,
        validityDays,
        notes,
      })

      const doc = await store.createDocument({
        type: 'quote',
        clientId,
        projectId,
        projectName: projectName || 'Custom Quote',
        status: 'draft',
        deliverables,
        paymentTranches,
        validityDays,
        overview: result.overview,
        content: result.overview,
        subtotal: total,
        vat,
        total: grandTotal,
        validUntil: result.validUntil,
        notes,
      })
      toast('Quote generated', 'success')
      onCreated(doc)
      onClose()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modal title="Create Quote" onClose={onClose} size="lg">
      {generating ? (
        <div className="generating-overlay">
          <div className="spinner" />
          <span className="generating-text">Generating quote with Claude…</span>
        </div>
      ) : (
        <>
          {/* Client */}
          <div className="form-group">
            <label className="form-label">Client *</label>
            <select className="form-select" value={clientId} onChange={e => { setClientId(e.target.value); setExistingProjectId('') }}>
              <option value="">— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
            </select>
          </div>

          {/* Project */}
          <div className="form-group">
            <label className="form-label">Project</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {['existing', 'new'].map(mode => (
                <button key={mode} type="button" className="btn btn-sm"
                  style={{ background: projectMode === mode ? 'var(--ink)' : 'var(--surface)', color: projectMode === mode ? 'var(--bg)' : 'inherit', border: `1px solid ${projectMode === mode ? 'var(--ink)' : 'var(--border)'}`, fontSize: '0.8rem' }}
                  onClick={() => setProjectMode(mode)}>
                  {mode === 'existing' ? 'Existing Project' : 'New Project'}
                </button>
              ))}
            </div>
            {projectMode === 'existing' ? (
              <select className="form-select" value={existingProjectId} onChange={e => setExistingProjectId(e.target.value)} disabled={!clientId}>
                <option value="">— Select project —</option>
                {clientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <div className="form-grid form-grid-2">
                <input className="form-input" placeholder="Project name *" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
                <input className="form-input" placeholder="Project type (e.g. Brand Identity)" value={newProjectType} onChange={e => setNewProjectType(e.target.value)} />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Brief</label>
            <textarea className="form-textarea" rows={2} placeholder="Short description of what you're designing and why…" value={brief} onChange={e => setBrief(e.target.value)} />
          </div>

          {/* Deliverables */}
          <div className="form-group">
            <label className="form-label">Phases & Deliverables</label>
            <div className="phases-list">
              {deliverables.map(d => (
                <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 32px', gap: 8, marginBottom: 6 }}>
                  <input className="form-input" placeholder="Deliverable name" value={d.name} onChange={e => setDeliverable(d.id, e.target.value)} />
                  <button className="btn btn-ghost btn-sm" onClick={() => removeDeliverable(d.id)} style={{ padding: '4px', color: 'var(--ink-muted)' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={addDeliverable} style={{ marginTop: 4 }}><Plus size={13} /> Add Deliverable</button>
          </div>

          {/* Payment Structure */}
          <div className="form-group">
            <label className="form-label">Payment Structure</label>
            {paymentTranches.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 32px', gap: 8, marginBottom: 6 }}>
                <span className="form-label">Label</span><span className="form-label">Month</span><span className="form-label">Amount (£ ex VAT)</span><span />
              </div>
            )}
            {paymentTranches.map(t => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 32px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <input className="form-input" placeholder="e.g. Deposit" value={t.label} onChange={e => setTranche(t.id, 'label', e.target.value)} />
                <input className="form-input" type="month" value={t.month} onChange={e => setTranche(t.id, 'month', e.target.value)} />
                <input className="form-input" type="number" min="0" step="100" placeholder="0" value={t.amount} onChange={e => setTranche(t.id, 'amount', e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }} />
                <button className="btn btn-ghost btn-sm" onClick={() => removeTranche(t.id)} style={{ padding: '4px', color: 'var(--ink-muted)' }}><Trash2 size={14} /></button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={addTranche} style={{ marginTop: 4 }}><Plus size={13} /> Add Tranche</button>
            {total > 0 && (
              <div style={{ marginTop: 12, padding: '10px 0', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span className="text-muted">Total (ex VAT)</span><span className="currency">{fmt(total)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span className="text-muted">VAT (20%)</span><span className="currency">{fmt(vat)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Grand Total</span><span className="currency">{fmt(grandTotal)}</span></div>
              </div>
            )}
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Validity (days)</label>
              <input className="form-input" type="number" min="1" value={validityDays} onChange={e => setValidityDays(Number(e.target.value))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Additional Notes (optional)</label>
              <textarea className="form-textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-accent" onClick={handleGenerate} disabled={!clientId}><FileText size={14} /> Generate</button>
          </div>
        </>
      )}
    </Modal>
  )
}

// ─── SOW Creation Modal ───────────────────────────────────────────────────────

function CreateSOWModal({ clients, projects, store, onClose, onCreated }) {
  const toast = useToast()
  const [client, setClient] = useState('')
  const [project, setProject] = useState('')
  const [projectName, setProjectName] = useState('')
  const [brief, setBrief] = useState('')
  const [projectType, setProjectType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [deliverables, setDeliverables] = useState([{ id: crypto.randomUUID(), name: '' }])
  const [paymentTranches, setPaymentTranches] = useState([{ id: crypto.randomUUID(), label: 'Deposit', month: '', amount: '' }])
  const [notes, setNotes] = useState('')
  const [generating, setGenerating] = useState(false)

  const selectedClient = clients.find(c => c.id === client)
  const selectedProject = projects.find(p => p.id === project)
  const clientProjects = client ? projects.filter(p => p.clientId === client) : []

  const addDeliverable = () => setDeliverables(prev => [...prev, { id: crypto.randomUUID(), name: '' }])
  const removeDeliverable = (id) => setDeliverables(prev => prev.filter(d => d.id !== id))
  const setDeliverable = (id, v) => setDeliverables(prev => prev.map(d => d.id === id ? { ...d, name: v } : d))

  const addTranche = () => setPaymentTranches(prev => [...prev, { id: crypto.randomUUID(), label: '', month: '', amount: '' }])
  const removeTranche = (id) => setPaymentTranches(prev => prev.filter(t => t.id !== id))
  const setTranche = (id, k, v) => setPaymentTranches(prev => prev.map(t => t.id === id ? { ...t, [k]: v } : t))

  const total = paymentTranches.reduce((s, t) => s + (Number(t.amount) || 0), 0)

  async function handleGenerate() {
    if (!client) { toast('Select a client', 'error'); return }
    setGenerating(true)
    try {
      const result = await generateSOW({
        client: selectedClient,
        project: { name: projectName || 'Project', brief, deliverables, paymentTranches, projectType, startDate },
        notes,
      })
      const doc = await store.createDocument({
        type: 'sow',
        clientId: client,
        projectId: project || null,
        projectName: selectedProject?.name || projectName || 'SOW',
        status: 'draft',
        content: result.content,
        deliverables,
        paymentTranches,
        total: result.totalValue,
        vat: result.vat,
        startDate,
        notes,
      })
      toast('SOW generated', 'success')
      onCreated(doc)
      onClose()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modal title="Create Statement of Work" onClose={onClose} size="lg">
      {generating ? (
        <div className="generating-overlay">
          <div className="spinner" />
          <span className="generating-text">Generating SOW with Claude…</span>
        </div>
      ) : (
        <>
          <div className="form-grid form-grid-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Client *</label>
              <select className="form-select" value={client} onChange={e => { setClient(e.target.value); setProject('') }}>
                <option value="">— Select client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Existing Project (optional)</label>
              <select className="form-select" value={project} onChange={e => { setProject(e.target.value); if (e.target.value) { const p = projects.find(pr => pr.id === e.target.value); setProjectName(p?.name || ''); setProjectType(p?.projectType || ''); setStartDate(p?.startDate || ''); } }} disabled={!client}>
                <option value="">— Select project —</option>
                {clientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input className="form-input" placeholder="e.g., Brand Identity System" value={projectName} onChange={e => setProjectName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Project Type</label>
              <input className="form-input" placeholder="e.g., Brand Identity, Website" value={projectType} onChange={e => setProjectType(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Brief / Scope</label>
              <textarea className="form-textarea" rows={3} placeholder="Describe what you're delivering and why…" value={brief} onChange={e => setBrief(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Estimated Start Date</label>
              <input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Deliverables</label>
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginBottom: 8 }}>List what will be delivered. Each becomes a defined term in the SOW.</p>
            <div className="phases-list">
              {deliverables.map(d => (
                <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 32px', gap: 8, marginBottom: 6 }}>
                  <input className="form-input" placeholder="Deliverable name" value={d.name} onChange={e => setDeliverable(d.id, e.target.value)} />
                  <button className="btn btn-ghost btn-sm" onClick={() => removeDeliverable(d.id)} style={{ padding: '4px', color: 'var(--ink-muted)' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={addDeliverable} style={{ marginTop: 4 }}><Plus size={13} /> Add Deliverable</button>
          </div>

          <div className="form-group" style={{ marginTop: 8 }}>
            <label className="form-label">Payment Structure</label>
            {paymentTranches.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 32px', gap: 8, marginBottom: 6 }}>
                <span className="form-label">Label</span><span className="form-label">Month</span><span className="form-label">Amount (£ ex VAT)</span><span />
              </div>
            )}
            {paymentTranches.map(t => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 32px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <input className="form-input" placeholder="e.g. Deposit" value={t.label} onChange={e => setTranche(t.id, 'label', e.target.value)} />
                <input className="form-input" type="month" value={t.month} onChange={e => setTranche(t.id, 'month', e.target.value)} />
                <input className="form-input" type="number" min="0" step="100" placeholder="0" value={t.amount} onChange={e => setTranche(t.id, 'amount', e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }} />
                <button className="btn btn-ghost btn-sm" onClick={() => removeTranche(t.id)} style={{ padding: '4px', color: 'var(--ink-muted)' }}><Trash2 size={14} /></button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={addTranche} style={{ marginTop: 4 }}><Plus size={13} /> Add Tranche</button>
            {total > 0 && (
              <div className="phase-total">
                <span className="text-mono" style={{ color: 'var(--ink-muted)' }}>Total (ex VAT)</span>
                <span className="currency" style={{ fontWeight: 500 }}>{fmt(total)}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Additional Notes (optional)</label>
            <textarea className="form-textarea" rows={2} placeholder="Any notes to include at the end of the document…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-accent" onClick={handleGenerate} disabled={!client}><BookOpen size={14} /> Generate SOW</button>
          </div>
        </>
      )}
    </Modal>
  )
}

// ─── Invoice Creation Modal ───────────────────────────────────────────────────

function CreateInvoiceModal({ clients, projects, store, onClose, onCreated }) {
  const toast = useToast()
  const [client, setClient] = useState('')
  const [project, setProject] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState(store.getNextInvoiceNumber())
  const [poNumber, setPoNumber] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [generating, setGenerating] = useState(false)

  const selectedClient = clients.find(c => c.id === client)
  const selectedProject = projects.find(p => p.id === project)
  const clientProjects = client ? projects.filter(p => p.clientId === client) : []
  const amtNum = Number(amount) || 0
  const vat = amtNum * 0.2
  const total = amtNum + vat

  async function handleGenerate() {
    if (!client || !amtNum) { toast('Fill in required fields', 'error'); return }
    setGenerating(true)
    try {
      const result = await generateInvoice({
        client: selectedClient,
        project: null,
        phase: null,
        invoiceNumber,
        amount: amtNum,
        dueDate,
        description,
        notes,
      })
      const doc = await store.createDocument({
        type: 'invoice',
        invoiceNumber,
        clientId: client,
        projectId: project || null,
        projectName: selectedProject?.name || description || 'Invoice',
        status: 'draft',
        workDescription: result.workDescription,
        content: result.workDescription, // backwards compat
        amount: amtNum,
        vat: result.vat,
        total: result.total,
        dueDate,
        description,
        notes,
        poNumber,
        paymentTerms,
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

  return (
    <Modal title="Create Invoice" onClose={onClose} size="lg">
      {generating ? (
        <div className="generating-overlay">
          <div className="spinner" />
          <span className="generating-text">Generating invoice with Claude…</span>
        </div>
      ) : (
        <>
          <div className="form-grid form-grid-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Client *</label>
              <select className="form-select" value={client} onChange={e => { setClient(e.target.value); setProject('') }}>
                <option value="">— Select client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Project (optional)</label>
              <select className="form-select" value={project} onChange={e => setProject(e.target.value)} disabled={!client}>
                <option value="">— Select project —</option>
                {clientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Invoice Number *</label>
              <input className="form-input" placeholder="e.g., INV-001" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">PO Number (optional)</label>
              <input className="form-input" placeholder="Client PO reference" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (ex VAT) £ *</label>
              <input className="form-input" type="number" min="0" step="100" value={amount} onChange={e => setAmount(e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Terms</label>
              <input className="form-input" placeholder="e.g., Net 30" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Description of work</label>
              <input className="form-input" placeholder="e.g., Brand Identity Design — Phase 2" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Additional Notes (optional)</label>
              <textarea className="form-textarea" rows={2} placeholder="Any notes to include at the end of the document…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
          {amtNum > 0 && (
            <div style={{ background: 'var(--bg)', padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="text-muted">Subtotal</span><span className="currency">{fmt(amtNum)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="text-muted">VAT (20%)</span><span className="currency">{fmt(vat)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Total</span><span className="currency">{fmt(total)}</span>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-accent" onClick={handleGenerate} disabled={!client || !amtNum}>
              <Receipt size={14} /> Generate Invoice
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

// ─── Edit Forms ───────────────────────────────────────────────────────────────

function EditInvoiceForm({ doc, clients, store, onSave }) {
  const toast = useToast()
  const [amount, setAmount] = useState(doc.amount ?? '')
  const [description, setDescription] = useState(doc.description ?? '')
  const [poNumber, setPoNumber] = useState(doc.poNumber ?? '')
  const [paymentTerms, setPaymentTerms] = useState(doc.paymentTerms ?? 'Net 30')
  const [notes, setNotes] = useState(doc.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!amount) { toast('Amount required', 'error'); return }
    setSaving(true)
    try {
      const result = await generateInvoice({
        client: clients.find(c => c.id === doc.clientId),
        invoiceNumber: doc.invoiceNumber,
        amount: Number(amount),
        description,
        notes,
      })
      await store.updateDocument(doc.id, {
        amount: Number(amount),
        vat: result.vat,
        total: result.total,
        description,
        poNumber,
        paymentTerms,
        notes,
        workDescription: result.workDescription,
        content: result.workDescription,
      })
      toast('Invoice updated', 'success')
      onSave()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="form-grid form-grid-2" style={{ gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Amount (ex VAT) £</label>
          <input className="form-input" type="number" min="0" step="100" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">PO Number</label>
          <input className="form-input" placeholder="Optional" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-input" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Payment Terms</label>
          <input className="form-input" placeholder="e.g., Net 30" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <button className="btn btn-accent" onClick={handleSave} disabled={saving}>{saving ? 'Regenerating...' : 'Save & Regenerate'}</button>
      </div>
    </div>
  )
}

function EditQuoteForm({ doc, clients, store, onSave }) {
  const toast = useToast()
  const [brief, setBrief] = useState(doc.overview?.substring(0, 200) ?? '')
  const [lineItems, setLineItems] = useState(doc.lineItems ?? [{ id: crypto.randomUUID(), desc: '', qty: 1, unitPrice: 0 }])
  const [depositPercent, setDepositPercent] = useState(doc.depositPercent ?? 50)
  const [notes, setNotes] = useState(doc.notes ?? '')
  const [saving, setSaving] = useState(false)

  const addLine = () => setLineItems(prev => [...prev, { id: crypto.randomUUID(), desc: '', qty: 1, unitPrice: 0 }])
  const removeLine = (id) => setLineItems(prev => prev.filter(l => l.id !== id))
  const setLine = (id, k, v) => setLineItems(prev => prev.map(l => l.id === id ? { ...l, [k]: v } : l))

  async function handleSave() {
    const subtotal = lineItems.reduce((s, l) => s + (Number(l.qty) * Number(l.unitPrice)), 0)
    if (!subtotal) { toast('Add line items', 'error'); return }
    setSaving(true)
    try {
      const result = await generateQuote({
        client: clients.find(c => c.id === doc.clientId),
        project: { name: doc.projectName, brief },
        lineItems,
        depositPercent,
        notes,
      })
      await store.updateDocument(doc.id, {
        overview: result.overview,
        content: result.overview,
        lineItems,
        subtotal: result.subtotal,
        vat: result.vat,
        total: result.total,
        deposit: result.deposit,
        balance: result.balance,
        depositPercent,
        validUntil: result.validUntil,
        notes,
      })
      onSave()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="form-grid form-grid-2" style={{ gap: 16 }}>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Brief (for overview paragraph)</label>
          <textarea className="form-textarea" rows={2} value={brief} onChange={e => setBrief(e.target.value)} />
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Line Items</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 32px', gap: 8, marginBottom: 8 }}>
            <span className="form-label">Description</span>
            <span className="form-label">Qty</span>
            <span className="form-label">Unit Price</span>
            <span />
          </div>
          {lineItems.map(l => (
            <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 32px', gap: 8, marginBottom: 4 }}>
              <input className="form-input" placeholder="Description" value={l.desc} onChange={e => setLine(l.id, 'desc', e.target.value)} />
              <input className="form-input" type="number" min="1" value={l.qty} onChange={e => setLine(l.id, 'qty', e.target.value)} />
              <input className="form-input" type="number" min="0" step="50" value={l.unitPrice} onChange={e => setLine(l.id, 'unitPrice', e.target.value)} />
              <button className="btn btn-ghost btn-sm" onClick={() => removeLine(l.id)} style={{ padding: '4px' }}><Trash2 size={14} /></button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addLine} style={{ marginTop: 8 }}><Plus size={13} /> Add Line</button>
        </div>
        <div className="form-group">
          <label className="form-label">Deposit %</label>
          <input className="form-input" type="number" min="0" max="100" value={depositPercent} onChange={e => setDepositPercent(Number(e.target.value))} />
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <button className="btn btn-accent" onClick={handleSave} disabled={saving}>{saving ? 'Regenerating...' : 'Save & Regenerate'}</button>
      </div>
    </div>
  )
}

function EditSOWForm({ doc, clients, store, onSave }) {
  const toast = useToast()
  const [phases, setPhases] = useState(doc.phases ?? [{ id: crypto.randomUUID(), name: '', value: '' }])
  const [notes, setNotes] = useState(doc.notes ?? '')
  const [saving, setSaving] = useState(false)

  const addPhase = () => setPhases(prev => [...prev, { id: crypto.randomUUID(), name: '', value: '' }])
  const removePhase = (id) => setPhases(prev => prev.filter(p => p.id !== id))
  const setPhase = (id, k, v) => setPhases(prev => prev.map(p => p.id === id ? { ...p, [k]: v } : p))

  async function handleSave() {
    if (!phases.some(p => p.name && p.value)) { toast('Add at least one phase', 'error'); return }
    setSaving(true)
    try {
      const result = await generateSOW({
        client: clients.find(c => c.id === doc.clientId),
        project: { name: doc.projectName, phases, startDate: doc.startDate },
        notes,
      })
      await store.updateDocument(doc.id, {
        content: result.content,
        phases: result.phases,
        total: result.totalValue,
        vat: result.vat,
        notes,
      })
      onSave()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="form-grid form-grid-2" style={{ gap: 16 }}>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Phases & Deliverables</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 32px', gap: 8, marginBottom: 8 }}>
            <span className="form-label">Phase Name</span>
            <span className="form-label">Value (£)</span>
            <span />
          </div>
          {phases.map(p => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 32px', gap: 8, marginBottom: 4 }}>
              <input className="form-input" placeholder="Phase name" value={p.name} onChange={e => setPhase(p.id, 'name', e.target.value)} />
              <input className="form-input" type="number" min="0" step="100" value={p.value} onChange={e => setPhase(p.id, 'value', e.target.value)} />
              <button className="btn btn-ghost btn-sm" onClick={() => removePhase(p.id)} style={{ padding: '4px' }}><Trash2 size={14} /></button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addPhase} style={{ marginTop: 8 }}><Plus size={13} /> Add Phase</button>
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <button className="btn btn-accent" onClick={handleSave} disabled={saving}>{saving ? 'Regenerating...' : 'Save & Regenerate'}</button>
      </div>
    </div>
  )
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

export default function Documents({ store, initialSelectedId, onNav }) {
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? null)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [createModal, setCreateModal] = useState(null)

  const { documents, clients, projects } = store

  const totalDocs = documents.length
  const invoices = documents.filter(d => d.type === 'invoice')
  const outstanding = invoices.filter(d => ['draft', 'sent'].includes(d.status))
  const outstandingValue = outstanding.reduce((s, d) => s + (d.total ?? 0), 0)
  const collected = invoices.filter(d => d.status === 'paid').reduce((s, d) => s + (d.total ?? 0), 0)

  const filtered = documents.filter(d => {
    const client = clients.find(c => c.id === d.clientId)
    const project = projects.find(p => p.id === d.projectId)
    const q = search.toLowerCase()
    const matches = !q || [d.invoiceNumber, d.type, client?.name, client?.company, project?.name].some(v => v?.toLowerCase().includes(q))
    const typeOk = !typeFilter || d.type === typeFilter
    const statusOk = !statusFilter || d.status === statusFilter
    return matches && typeOk && statusOk
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const selected = documents.find(d => d.id === selectedId)

  if (selected) {
    return (
      <DocumentDetail
        doc={selected}
        clients={clients}
        projects={projects}
        store={store}
        onBack={() => setSelectedId(null)}
        onNav={onNav}
      />
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Documents</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setCreateModal('quote')}><FileText size={14} /> Quote</button>
          <button className="btn" onClick={() => setCreateModal('sow')}><BookOpen size={14} /> SOW</button>
          <button className="btn btn-primary" onClick={() => setCreateModal('invoice')}><Receipt size={14} /> Invoice</button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total Docs</span>
          <span className="stat-value">{totalDocs}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Invoices Outstanding</span>
          <span className="stat-value">{outstanding.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Outstanding Value</span>
          <span className="stat-value accent">{outstandingValue ? fmt(outstandingValue) : '—'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Collected</span>
          <span className="stat-value">{collected ? fmt(collected) : '—'}</span>
        </div>
      </div>

      <div className="filter-row">
        <input className="search-input" placeholder="Search by type, client, invoice no…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="quote">Quote</option>
          <option value="sow">SOW</option>
          <option value="invoice">Invoice</option>
        </select>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {filtered.length === 0
        ? (
          <div className="empty-state">
            <p className="empty-state-title">No documents yet</p>
            <p className="text-muted">Create your first quote, SOW, or invoice using the buttons above.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Type</th>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Amount (inc VAT)</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const client = clients.find(c => c.id === d.clientId)
                  const project = projects.find(p => p.id === d.projectId)
                  return (
                    <tr key={d.id} onClick={() => setSelectedId(d.id)}>
                      <td className="text-mono">{d.invoiceNumber ?? d.type?.toUpperCase()}</td>
                      <td><TypeBadge type={d.type} /></td>
                      <td className="text-muted">{client?.name ?? '—'}</td>
                      <td className="text-muted">{project?.name ?? d.projectName ?? '—'}</td>
                      <td><Badge status={d.status} /></td>
                      <td className="currency">{d.total != null ? fmt(d.total) : '—'}</td>
                      <td className="text-muted">{new Date(d.createdAt).toLocaleDateString('en-GB')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }

      {createModal === 'quote' && (
        <CreateQuoteModal clients={store.clients} store={store} onClose={() => setCreateModal(null)} onCreated={(doc) => { setSelectedId(doc.id); setCreateModal(null) }} />
      )}
      {createModal === 'sow' && (
        <CreateSOWModal clients={store.clients} projects={store.projects} store={store} onClose={() => setCreateModal(null)} onCreated={(doc) => { setSelectedId(doc.id); setCreateModal(null) }} />
      )}
      {createModal === 'invoice' && (
        <CreateInvoiceModal clients={store.clients} projects={store.projects} store={store} onClose={() => setCreateModal(null)} onCreated={(doc) => { setSelectedId(doc.id); setCreateModal(null) }} />
      )}
    </div>
  )
}
