/**
 * AlertLogPanel — panel de admin que muestra el log de alertas invasivas.
 * Muestra quién vio cada alerta, qué hizo, y cuándo.
 * Se puede incluir en /settings o como una sección en Overview (solo admin).
 */
import { useState } from 'react'
import { useAlertLog } from '../../store/alertLog'
import { Clock, CheckCircle, X, RefreshCw, Trash2, Bell } from 'lucide-react'

const ACTION_CFG = {
  shown:      { label: 'Mostrada',   color: '#1A5276', bg: '#D6EAF8', icon: Bell },
  accepted:   { label: 'Atendida',   color: '#1E8449', bg: '#D5F5E3', icon: CheckCircle },
  dismissed:  { label: 'Rechazada',  color: '#922B21', bg: '#FADBD8', icon: X },
  resurfaced: { label: 'Reapareció', color: '#784212', bg: '#FDEBD0', icon: RefreshCw },
}

const TIER_COLOR = {
  warning:   '#F59E0B',
  critical:  '#EF4444',
  escalated: '#EC4899',
}

const CHANNEL_COLOR = {
  whatsapp:  '#25D366',
  instagram: '#E1306C',
  messenger: '#0084FF',
  website:   '#C09B3A',
}

function timeLabel(iso) {
  const d = new Date(iso)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AlertLogPanel() {
  const { entries, clearLog } = useAlertLog()
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? entries : entries.filter(e => e.action === filter)

  // Summary counts
  const counts = entries.reduce((acc, e) => {
    acc[e.action] = (acc[e.action] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui)', color: 'var(--text, #15212E)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Log de Alertas</h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted, #7A6E59)' }}>
            Registro de notificaciones invasivas — quién atendió y quién rechazó
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={clearLog}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              border: '1px solid var(--border, #E0D7C5)',
              background: 'transparent', cursor: 'pointer',
              fontSize: '12px', color: 'var(--text-muted, #7A6E59)',
            }}
          >
            <Trash2 size={13} /> Limpiar log
          </button>
        )}
      </div>

      {/* Summary cards */}
      {entries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '16px' }}>
          {Object.entries(ACTION_CFG).map(([action, cfg]) => {
            const Icon = cfg.icon
            const count = counts[action] || 0
            return (
              <button
                key={action}
                onClick={() => setFilter(f => f === action ? 'all' : action)}
                style={{
                  padding: '10px 12px', borderRadius: '10px',
                  border: `1.5px solid ${filter === action ? cfg.color : 'transparent'}`,
                  background: cfg.bg, cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Icon size={12} color={cfg.color} />
                  <span style={{ fontSize: '10px', fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {cfg.label}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: cfg.color }}>
                  {count}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'var(--surface, #FFFEFA)',
          border: '1px solid var(--border, #E0D7C5)',
          borderRadius: '12px',
        }}>
          <Bell size={32} style={{ color: 'var(--border, #E0D7C5)', marginBottom: '12px' }} />
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted, #7A6E59)' }}>
            Aún no hay alertas registradas
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted, #7A6E59)', opacity: 0.7 }}>
            Las notificaciones invasivas aparecerán aquí cuando haya conversaciones urgentes sin atender
          </p>
        </div>
      )}

      {/* Log entries */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map(entry => {
            const cfg = ACTION_CFG[entry.action] || ACTION_CFG.shown
            const Icon = cfg.icon
            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px',
                  background: 'var(--surface, #FFFEFA)',
                  border: '1px solid var(--border, #E0D7C5)',
                  borderRadius: '10px',
                  borderLeft: `3px solid ${cfg.color}`,
                }}
              >
                {/* Action icon */}
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={13} color={cfg.color} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{entry.contactName}</span>
                    {/* Tier badge */}
                    <span style={{
                      fontSize: '9px', fontWeight: 700, padding: '1px 6px',
                      borderRadius: '99px', background: `${TIER_COLOR[entry.tier]}22`,
                      color: TIER_COLOR[entry.tier], textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      {entry.tier}
                    </span>
                    {/* Channel dot */}
                    <span style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: CHANNEL_COLOR[entry.channel] || '#C09B3A', flexShrink: 0,
                      display: 'inline-block',
                    }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {entry.channel}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '2px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Agente: <strong>{entry.agentName}</strong>
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Espera: <strong>{entry.waitMinutes}m</strong>
                    </span>
                  </div>
                </div>

                {/* Action + time */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                    borderRadius: '99px', background: cfg.bg, color: cfg.color,
                  }}>
                    {cfg.label}
                  </span>
                  <p style={{ margin: '3px 0 0', fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {timeLabel(entry.timestamp)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
