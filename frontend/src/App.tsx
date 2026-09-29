import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { ToastProvider } from './components/Toast'
import { AppProvider } from './store/AppProvider'
import { Dashboard } from './pages/Dashboard'
import { Services } from './pages/Services'
import { UnifiedApi } from './pages/UnifiedApi'

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <HashRouter>
          <div className="app">
            <Sidebar />
            <main className="main">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/services" element={<Services />} />
                <Route path="/unified-api" element={<UnifiedApi />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </HashRouter>
      </ToastProvider>
    </AppProvider>
  )
}
