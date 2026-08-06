/**
 * SlaOpenPanel — panel de admin con datos REALES del servidor (no local).
 * Muestra conversaciones sin atender de todo el equipo, sin depender de que
 * el admin haya visto la alerta invasiva (que ahora no le aparece).
 */
import { useState, useEffect, useCallback } from 'react'
import { getAlerts, resolveAlert } from '../../services/accounts'
import { Clock, AlertTriangle, Zap, CheckCircle, Loader, RefreshCw } from 'lucide-react'

const TIER_CFG = {
  warning:   { label: 'Aviso',    color: '#C09B3A', bg: '#FBF7EE', icon: Clock },
  critical:  { label: 'Crítico',  color: '#7A1C2A', bg: '#FDF0F2', icon: AlertTriangle },
  escalated: { label: 'Escalada', color: '#1E3A5C', bg: '#EEF3F9', icon: Zap },
}

const CHANNEL_LABEL = { whatsapp: 'WhatsApp', instagram: 'Instagram', messenger: 'Messenger', website: 'Web' }
const CHANNEL_DOT   = { whatsapp: '#25D366', instagram: '#E1306C', messenger: '#0084FF', website: '#C09B3A' }

function formatWait(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function timeLabel(iso) {
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function SlaOpenPanel() {
  const [alerts, setAlerts]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [resolvingId, setResolvingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAlerts(true)
      setAlerts(data)
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(load, 20000)
    return () => clearInterval(iv)
  }, [load])

  const handleResolve = async (id) => {
    setResolvingId(id)
    try {
      await resolveAlert(id)
      setAlerts(prev => prev.filter(a => a.id !== id))
    } catch { /* ignore */ } finally {
      setResolvingId(null)
    }
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '20px',
      boxShadow: '0 1px 3px rgba(11,23,40,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
          Conversaciones sin atender ({alerts.length})
        </p>
        <button onClick={load} style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '11px', color: 'var(--text-muted)', background: 'transparent',
          border: 'none', cursor: 'pointer',
        }}>
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
          <Loader size={18} style={{ color: 'var(--border)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
          <CheckCircle size={20} style={{ marginBottom: '6px', color: 'var(--jade)' }} />
          <p>Todo al día — sin alertas abiertas</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.map(a => {
            const cfg = TIER_CFG[a.level] ?? TIER_CFG.warning
            const Icon = cfg.icon
            return (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px',
                background: cfg.bg, border: `1px solid ${cfg.color}33`,
              }}>
                <Icon size={14} style={{ color: cfg.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{a.contact_name}</span>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: CHANNEL_DOT[a.channel_type] ?? '#C09B3A' }} />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{CHANNEL_LABEL[a.channel_type] ?? a.channel_type}</span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {cfg.label} · {formatWait(a.wait_minutes)} sin respuesta
                    {a.assigned_to_name && ` · Asignado a ${a.assigned_to_name}`}
                    {' · '}{timeLabel(a.triggered_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleResolve(a.id)}
                  disabled={resolvingId === a.id}
                  style={{
                    padding: '5px 10px', borderRadius: '6px', border: 'none',
                    background: cfg.color, color: '#fff', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  {resolvingId === a.id ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={11} />}
                  Resolver
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
