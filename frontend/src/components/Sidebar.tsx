import { NavLink } from 'react-router-dom'
import { Boxes, FlaskConical, KeyRound, Layers, LayoutDashboard } from 'lucide-react'
import { useStore } from '../store/store'

export function Sidebar() {
  const { services, keys, connected } = useStore()
  const modelsCount = services.reduce((n, s) => n + s.models.length, 0)

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <Boxes size={20} strokeWidth={2.2} />
        </div>
        <div className="logo-text">
          <span className="logo-name">APIHub</span>
          <span className="logo-sub">AI Services</span>
        </div>
      </div>

      <nav className="nav">
        <span className="nav-label">Overview</span>
        <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <LayoutDashboard size={17} />
          <span>Dashboard</span>
        </NavLink>

        <span className="nav-label">Manage</span>
        <NavLink
          to="/services"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Boxes size={17} />
          <span>Services</span>
          {services.length > 0 && <span className="count-chip">{services.length}</span>}
        </NavLink>
        <NavLink to="/models" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Layers size={17} />
          <span>Models</span>
          {modelsCount > 0 && <span className="count-chip">{modelsCount}</span>}
        </NavLink>
        <NavLink
          to="/unified-api"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <KeyRound size={17} />
          <span>Unified API</span>
          {keys.length > 0 && <span className="count-chip">{keys.length}</span>}
        </NavLink>
        <NavLink
          to="/playground"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <FlaskConical size={17} />
          <span>Playground</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <span className={`status-dot${connected === false ? ' off' : ''}`} />
        <span className="footer-text">
          {connected === false
            ? 'Backend offline'
            : modelsCount > 0
              ? `${modelsCount} models · ${services.length} services`
              : 'Connected · no services yet'}
        </span>
      </div>
    </aside>
  )
}
