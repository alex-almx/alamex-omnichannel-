import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  MessageSquare, LayoutDashboard, Users, BookOpen,
  Plug, Globe, LogOut, Settings2, UserCog, Inbox, Building2, Menu, X,
} from 'lucide-react'
import { useAuth } from '../../store/auth'
import { useMe } from '../../store/me'
import AlmenaraMark from '../brand/AlmenaraMark'
import pkg from '../../../package.json'

const NAV_GROUPS = [
  {
    label: 'Plataforma',
    items: [
      { to: '/',               icon: LayoutDashboard, label: 'Overview',       end: true, perm: 'view_all_convs' },
      { to: '/inbox',          icon: MessageSquare,   label: 'Inbox',                     perm: 'view_all_convs' },
      { to: '/agent',          icon: Inbox,           label: 'Mi Bandeja',                perm: 'attend_convs' },
      { to: '/leads',          icon: Users,           label: 'Seguimientos',              perm: 'view_all_convs' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { to: '/agents',         icon: UserCog,  label: 'Agentes',       perm: 'manage_agents' },
      { to: '/knowledge',      icon: BookOpen, label: 'Conocimiento',  perm: 'configure_rules' },
      { to: '/integrations',   icon: Plug,     label: 'Canales',       perm: 'manage_channels' },
      { to: '/widget-test',    icon: Globe,    label: 'Prueba Widget', perm: 'manage_channels' },
    ],
  },
]

const GOLD  = '#C09B3A'
const IVORY = '#FBF7EE'

function userInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'A'
}

// Hook for mobile detection
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function Sidebar() {
  const collapsed = false
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const isMobile = useIsMobile()
  const can = useMe(s => s.can)
  const role = useMe(s => s.role)
  const me = useMe(s => s.me)
  const isSuperuser = useMe(s => s.isSuperuser)

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const roleLabel = role === 'admin' ? 'Administrador' : role === 'supervisor' ? 'Supervisor' : 'Agente'
  const displayName = me?.name || roleLabel
  const displayEmail = me?.email || ''

  const groups = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(it => can(it.perm)) }))
    .filter(g => g.items.length > 0)

  if (isSuperuser) {
    groups.push({
      label: 'Operador',
      items: [{ to: '/operador', icon: Building2, label: 'Empresas' }],
    })
  }

  const canSettings = can('configure_rules') || can('view_billing')
  const W = 240

  // Mobile: hamburger button always visible in top bar
  const MobileTopBar = () => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
      height: '52px',
      background: 'linear-gradient(90deg, #0C1A2E 0%, #0B1728 100%)',
      borderBottom: '1px solid rgba(192,155,58,0.18)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: '12px',
    }}>
      <button
        onClick={() => setMobileOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: GOLD, padding: '6px', borderRadius: '6px',
          display: 'flex', alignItems: 'center',
        }}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlmenaraMark size={24} tower={GOLD} light="#D4B05A" pulse />
        <p style={{ color: IVORY, fontWeight: 700, fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, fontFamily: 'var(--font-display)' }}>
          Almenara
        </p>
      </div>
    </div>
  )

  const SidebarContent = () => (
    <aside
      className="sidebar-geo"
      style={{
        width: W, minWidth: W, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        height: '100%',
        background: 'linear-gradient(180deg, #0C1A2E 0%, #0B1728 55%, #091320 100%)',
        borderRight: '1px solid rgba(192,155,58,0.18)',
        boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.2)',
        overflow: 'hidden', position: 'relative', zIndex: 20,
      }}
    >
      {/* Logo — hidden on mobile (shown in top bar) */}
      {!isMobile && (
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(192,155,58,0.15)',
          display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden',
        }}>
          <div style={{ width: '34px', height: '34px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlmenaraMark size={32} tower={GOLD} light="#D4B05A" pulse />
          </div>
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <p style={{ color: IVORY, fontWeight: 700, fontSize: '15px', lineHeight: 1, letterSpacing: '3px', textTransform: 'uppercase', margin: 0, fontFamily: 'var(--font-display)' }}>
              Almenara
            </p>
            <p style={{ color: GOLD, fontSize: '8.5px', letterSpacing: '2.5px', textTransform: 'uppercase', margin: '4px 0 0' }}>
              Plataforma Omnicanal
            </p>
          </div>
        </div>
      )}

      {/* Nav groups */}
      <nav style={{ flex: 1, padding: '16px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {groups.map((group, gi) => (
          <div key={group.label} style={{ marginBottom: gi < groups.length - 1 ? '20px' : 0 }}>
            <p style={{
              color: GOLD, fontSize: '9px', fontWeight: 700,
              letterSpacing: '2.5px', textTransform: 'uppercase',
              paddingLeft: '14px', marginBottom: '4px', opacity: 0.7,
            }}>
              {group.label}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {group.items.map(({ to, icon: Icon, label, end }) => {
                const isActive = location.pathname === to
                  || (!end && location.pathname.startsWith(to + '/'))
                return (
                  <NavLink
                    key={to} to={to} end={end}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '8px', fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      textDecoration: 'none',
                      color: isActive ? GOLD : 'rgba(251,247,238,0.52)',
                      background: isActive ? 'rgba(192,155,58,0.13)' : 'transparent',
                      borderLeft: isActive ? `2px solid ${GOLD}` : '2px solid transparent',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(192,155,58,0.07)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <Icon size={15} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </span>
                    {isActive && (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: GOLD, flexShrink: 0 }} />
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div style={{ borderTop: '1px solid rgba(192,155,58,0.1)' }} />

      {/* Footer */}
      <div style={{ padding: '10px 8px' }}>
        {canSettings && (
          <NavLink
            to="/settings"
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '7px 14px', borderRadius: '8px', fontSize: '13px',
              fontWeight: isActive ? 600 : 400, textDecoration: 'none',
              color: isActive ? GOLD : 'rgba(251,247,238,0.45)',
              background: isActive ? 'rgba(192,155,58,0.13)' : 'transparent',
              marginBottom: '2px', transition: 'all 0.12s',
            })}
          >
            <Settings2 size={15} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap' }}>Ajustes</span>
          </NavLink>
        )}

        <div style={{ position: 'relative' }}>
          {userMenuOpen && (
            <>
              <div onClick={() => setUserMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
                zIndex: 31, background: '#0E1D33',
                border: '1px solid rgba(192,155,58,0.25)', borderRadius: '10px',
                boxShadow: '0 8px 28px rgba(0,0,0,0.45)', overflow: 'hidden',
              }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(192,155,58,0.12)' }}>
                  <p style={{ color: IVORY, fontSize: '12px', fontWeight: 600, margin: 0 }}>{displayName}</p>
                  <p style={{ color: 'rgba(251,247,238,0.4)', fontSize: '10px', margin: '2px 0 0' }}>{displayEmail || roleLabel}</p>
                </div>
                <button
                  onClick={() => { setUserMenuOpen(false); useAuth.getState().logout() }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 12px', background: 'transparent', border: 'none',
                    color: 'rgba(251,247,238,0.85)', fontSize: '12px', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <LogOut size={13} /> Cerrar sesión
                </button>
              </div>
            </>
          )}

          <button
            onClick={() => setUserMenuOpen(o => !o)}
            aria-haspopup="menu" aria-expanded={userMenuOpen}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: '7px 14px', borderRadius: '8px',
              background: userMenuOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: 'none', cursor: 'pointer', transition: 'background 0.12s',
            }}
          >
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
              background: 'rgba(192,155,58,0.13)', border: '1px solid rgba(192,155,58,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: GOLD, fontSize: '10px', fontWeight: 700,
            }}>
              {userInitials(displayName)}
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={{ color: 'rgba(251,247,238,0.85)', fontSize: '12px', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </p>
              <p style={{ color: 'rgba(251,247,238,0.3)', fontSize: '10px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayEmail || roleLabel}
              </p>
            </div>
            <LogOut size={12} style={{ color: 'rgba(251,247,238,0.2)', flexShrink: 0 }} />
          </button>
        </div>

        <p style={{ color: 'rgba(251,247,238,0.22)', fontSize: '9px', letterSpacing: '0.5px', textAlign: 'center', margin: '6px 0 2px' }}>
          Almenara v{pkg.version}
        </p>
      </div>
    </aside>
  )

  // MOBILE: hamburger + overlay drawer
  if (isMobile) {
    return (
      <>
        <MobileTopBar />
        {/* Overlay */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 48,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(2px)',
            }}
          />
        )}
        {/* Drawer */}
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          zIndex: 49, width: W,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          height: '100vh',
        }}>
          <SidebarContent />
        </div>
        {/* Spacer so content doesn't go under top bar */}
        <div style={{ height: '52px', width: '100%', display: 'none' }} />
      </>
    )
  }

  // DESKTOP: static sidebar
  return <SidebarContent />
}
