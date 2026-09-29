import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { ToastProvider } from './components/Toast'
import { AppProvider } from './store/AppProvider'
import { useStore } from './store/store'
import { Dashboard } from './pages/Dashboard'
import { Services } from './pages/Services'
import { Models } from './pages/Models'
import { UnifiedApi } from './pages/UnifiedApi'
import { PlaygroundPage } from './pages/PlaygroundPage'

function OfflineBanner() {
  const { connected } = useStore()
  if (connected !== false) return null
  return (
    <div className="offline-banner">
      <TriangleAlert size={16} />
      <span>Server not reachable — retrying every 5s…</span>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Connecting to SocksAPI backend…</span>
    </div>
  )
}

function Shell() {
  const { loading } = useStore()
  if (loading) return <LoadingScreen />

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <OfflineBanner />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/services" element={<Services />} />
          <Route path="/models" element={<Models />} />
          <Route path="/unified-api" element={<UnifiedApi />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <HashRouter>
          <Shell />
        </HashRouter>
      </AppProvider>
    </ToastProvider>
  )
}
