import { useState } from 'react'
import { useStore } from './hooks/useStore.js'
import { ToastProvider } from './components/Toast.jsx'
import Clients from './tabs/Clients.jsx'
import Projects from './tabs/Projects.jsx'
import Documents from './tabs/Documents.jsx'
import Pipeline from './tabs/Pipeline.jsx'

const TABS = ['clients', 'projects', 'documents', 'pipeline']

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ active, onTab }) {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <img src="/logo.svg" alt="Regular Studio" className="nav-logo" />
      </div>
      <ul className="nav-tabs">
        {TABS.map(t => (
          <li key={t}>
            <button
              className={`nav-tab${active === t ? ' active' : ''}`}
              onClick={() => onTab(t)}
            >
              {t}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const store = useStore()
  const [tab, setTab] = useState('clients')
  const [navTarget, setNavTarget] = useState(null) // { tab, id }

  function handleNav(targetTab, id) {
    setTab(targetTab)
    setNavTarget({ tab: targetTab, id })
  }

  function handleTab(t) {
    setTab(t)
    setNavTarget(null)
  }

  if (store.loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" />
        <span className="mono" style={{ color: 'var(--ink-muted)' }}>Loading</span>
      </div>
    )
  }

  // Expose updateClient/updateProject on store for Documents tab (approve quote side-effects)
  const augmentedStore = {
    ...store,
    updateClient: store.updateClient,
    updateProject: store.updateProject,
  }

  const targetId = navTarget?.tab === tab ? navTarget?.id : null

  return (
    <ToastProvider>
      <div className="app-shell">
        <Nav active={tab} onTab={handleTab} />
        <main className="content-area">
          {tab === 'clients'    && <Clients   store={augmentedStore} onNav={handleNav} initialSelectedId={targetId} key={targetId ?? 'clients'} />}
          {tab === 'projects'   && <Projects  store={augmentedStore} onNav={handleNav} initialSelectedId={targetId} key={targetId ?? 'projects'} />}
          {tab === 'documents'  && <Documents store={augmentedStore} onNav={handleNav} initialSelectedId={targetId} key={targetId ?? 'documents'} />}
          {tab === 'pipeline'   && <Pipeline  store={augmentedStore} onNav={handleNav} key='pipeline' />}
        </main>
      </div>
    </ToastProvider>
  )
}
