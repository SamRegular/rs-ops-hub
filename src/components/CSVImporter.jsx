import { useState } from 'react'
import { Upload, AlertCircle, CheckCircle } from 'lucide-react'
import { useToast } from './Toast.jsx'

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return { rows: [], errors: ['CSV must have header and at least one data row'] }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const rows = []
  const errors = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cells = line.split(',').map(c => c.trim())
    const obj = {}
    header.forEach((key, idx) => {
      if (key) obj[key] = cells[idx] || ''
    })
    rows.push(obj)
  }

  return { rows, errors }
}

function mapCSVToClient(row) {
  const map = {
    'name': ['name', 'client name', 'contact name'],
    'company': ['company', 'company name', 'org'],
    'email': ['email', 'email address'],
    'phone': ['phone', 'phone number', 'tel'],
    'role': ['role', 'title', 'position', 'job title'],
    'pipelineStage': ['stage', 'pipeline stage', 'status'],
    'sector': ['sector', 'industry', 'vertical'],
    'source': ['source', 'source / referrer', 'referrer', 'how you met'],
    'address': ['address', 'location', 'city'],
    'lastContactDate': ['last contact', 'last contact date', 'contacted'],
    'notes': ['notes', 'notes / comments', 'comments'],
  }

  const client = {}
  const found = new Set()

  Object.entries(map).forEach(([field, aliases]) => {
    const key = Object.keys(row).find(k => aliases.includes(k))
    if (key && row[key]) {
      found.add(key)
      client[field] = row[key]
    }
  })

  // Check for name (required)
  if (!client.name) {
    return null
  }

  return client
}

export function CSVImporter({ onImport, onClose }) {
  const toast = useToast()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)

  async function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return

    const text = await f.text()
    const { rows, errors } = parseCSV(text)

    if (errors.length > 0) {
      toast(errors[0], 'error')
      return
    }

    const clients = rows
      .map(mapCSVToClient)
      .filter(Boolean)

    if (clients.length === 0) {
      toast('No valid clients found in CSV', 'error')
      return
    }

    setFile(f)
    setPreview({ rows, clients, unmapped: rows.length - clients.length })
  }

  async function handleImport() {
    if (!preview) return
    setImporting(true)
    try {
      await onImport(preview.clients)
      toast(`Imported ${preview.clients.length} clients`, 'success')
      onClose()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!preview ? (
          <>
            <div style={{ padding: '24px', borderRadius: 'var(--radius)', border: '2px dashed var(--border-dark)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.background = 'var(--accent-light)' }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-dark)'; e.currentTarget.style.background = 'transparent' }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border-dark)'; e.currentTarget.style.background = 'transparent'; const f = e.dataTransfer.files[0]; if (f) { const input = document.querySelector('input[type=file]'); if (input) { const dt = new DataTransfer(); dt.items.add(f); input.files = dt.files; handleFileChange({ target: { files: [f] } }) } } }}
            >
              <Upload size={24} style={{ margin: '0 auto 8px', color: 'var(--ink-muted)' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: '0 0 4px' }}>Drop CSV here or click to browse</p>
              <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>One client per row. Required: name. Optional: company, email, phone, role, sector, source, stage, address, notes.</p>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="csv-input"
            />
            <label htmlFor="csv-input" style={{ cursor: 'pointer' }}>
              <div style={{ padding: '8px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center', fontSize: '0.85rem', cursor: 'pointer' }}>
                Choose file
              </div>
            </label>
          </>
        ) : (
          <>
            <div style={{ padding: '12px 16px', background: 'var(--accent-light)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '0.85rem' }}>
                <strong>{preview.clients.length}</strong> clients ready to import
                {preview.unmapped > 0 && <span style={{ color: 'var(--ink-muted)' }}> ({preview.unmapped} rows skipped — missing required "name" field)</span>}
              </span>
            </div>

            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '6px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '6px', textAlign: 'left', fontWeight: 600 }}>Company</th>
                    <th style={{ padding: '6px', textAlign: 'left', fontWeight: 600 }}>Email</th>
                    <th style={{ padding: '6px', textAlign: 'left', fontWeight: 600 }}>Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.clients.slice(0, 10).map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px' }}>{c.name}</td>
                      <td style={{ padding: '6px', color: 'var(--ink-muted)' }}>{c.company || '—'}</td>
                      <td style={{ padding: '6px', color: 'var(--ink-muted)' }}>{c.email || '—'}</td>
                      <td style={{ padding: '6px', color: 'var(--ink-muted)' }}>{c.pipelineStage || 'Lead'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.clients.length > 10 && (
                <p style={{ padding: '8px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                  +{preview.clients.length - 10} more
                </p>
              )}
            </div>

            <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
              <p style={{ margin: 0, marginBottom: 6 }}>Field mapping (auto-detected from headers):</p>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.75rem' }}>
                <li>Name, Company, Email, Phone, Role, Stage, Sector, Source, Address, Last Contact, Notes</li>
                <li>Headers are case-insensitive and flexible (e.g., "contact name" → name, "how you met" → source)</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button className="btn" onClick={() => { setFile(null); setPreview(null) }}>Choose different file</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                {importing ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <CheckCircle size={14} />}
                {importing ? ' Importing…' : ' Import Clients'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
