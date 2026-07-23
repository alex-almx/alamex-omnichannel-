/**
 * InvasiveAlert — notificaciones invasivas estilo Almenara.
 * - Si se rechaza, vuelve en 30 segundos.
 * - Si se atiende, pausa 2 minutos antes de mostrar la siguiente alerta.
 * - Navega directo al chat específico al dar "Atender ahora".
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, CheckCircle, Clock, AlertTriangle, Zap } from 'lucide-react'
import { useNotifications } from '../../store/notifications'
import { useAlertLog } from '../../store/alertLog'
import AlmenaraMark from '../brand/AlmenaraMark'

const CHANNEL_LABEL = {
  whatsapp:  'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  website:   'Web',
}

const CHANNEL_DOT = {
  whatsapp:  '#25D366',
  instagram: '#E1306C',
  messenger: '#0084FF',
  website:   '#C09B3A',
}

const TIER = {
  warning: {
    icon: Clock, label: 'Aviso · Sin respuesta',
    accent: '#C09B3A', accentPale: 'rgba(192,155,58,0.12)', accentVp: '#FBF7EE',
    iconBg: 'rgba(192,155,58,0.15)', border: 'rgba(192,155,58,0.35)',
    text: '#4A4034', btnBg: '#C09B3A', btnText: '#0B1728',
  },
  critical: {
    icon: AlertTriangle, label: 'Crítico · Sin respuesta',
    accent: '#7A1C2A', accentPale: '#F5E6E8', accentVp: '#FDF0F2',
    iconBg: 'rgba(122,28,42,0.12)', border: 'rgba(122,28,42,0.3)',
    text: '#5C1520', btnBg: '#7A1C2A', btnText: '#FFFEFA',
  },
  escalated: {
    icon: Zap, label: 'Escalada · Reasignación requerida',
    accent: '#1E3A5C', accentPale: 'rgba(30,58,92,0.08)', accentVp: '#EEF3F9',
    iconBg: 'rgba(30,58,92,0.12)', border: 'rgba(30,58,92,0.3)',
    text: '#1E3A5C', btnBg: '#1E3A5C', btnText: '#FBF7EE',
  },
}

const SNOOZE_MS = 30_000
const PAUSE_MS  = 2 * 60_000

function formatWait(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export default function InvasiveAlert() {
  const { items } = useNotifications()
  const { addLog } = useAlertLog()
  const navigate = useNavigate()

  const [queue,     setQueue]     = useState([])
  const [current,   setCurrent]   = useState(null)
  const [snoozeSec, setSnoozeSec] = useState(null)
  const [pauseSec,  setPauseSec]  = useState(null)

  const snoozed    = useRef({})
  const shown      = useRef(new Set())
  const dismissed  = useRef(new Set()) // IDs atendidos — nunca vuelven a mostrarse
  const timerRef   = useRef(null)
  const pauseUntil = useRef(0)
  const pauseTimer = useRef(null)

  // Limpiar timers duplicados al remontar
  const clearSnoozeTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const clearPauseTimer = useCallback(() => {
    if (pauseTimer.current) { clearInterval(pauseTimer.current); pauseTimer.current = null }
  }, [])

  // Feed urgent items into queue — ignorar los ya atendidos
  useEffect(() => {
    const urgent = items.filter(n => n.urgent && !n.read && !dismissed.current.has(n.id))
    setQueue(prev => {
      const existingIds = new Set(prev.map(a => a.id))
      const newOnes = urgent.filter(n => !existingIds.has(n.id) && !shown.current.has(n.id))
      return newOnes.length === 0 ? prev : [...prev, ...newOnes]
    })
  }, [items])

  // Show next from queue — respeta pausa
  useEffect(() => {
    if (!current && queue.length > 0) {
      if (Date.now() < pauseUntil.current) return
      const [next, ...rest] = queue
      // Saltar si ya fue atendido
      if (dismissed.current.has(next.id)) {
        setQueue(rest)
        return
      }
      setCurrent(next)
      setQueue(rest)
      setSnoozeSec(null)
      shown.current.add(next.id)
      addLog({
        alertId: next.id, convId: next.convId, contactName: next.contactName,
        tier: next.tier, channel: next.channel, action: 'shown', waitMinutes: next.waitMinutes,
      })
    }
  }, [current, queue, addLog])

  const handleAccept = useCallback(() => {
    if (!current) return
    const accepted = current

    addLog({
      alertId: accepted.id, convId: accepted.convId, contactName: accepted.contactName,
      tier: accepted.tier, channel: accepted.channel, action: 'accepted', waitMinutes: accepted.waitMinutes,
    })

    // Marcar como atendido — nunca volver a mostrar
    dismissed.current.add(accepted.id)
    shown.current.add(accepted.id)
    useNotifications.getState().markRead(accepted.id)

    // Limpiar timers
    if (snoozed.current[accepted.id]) { clearTimeout(snoozed.current[accepted.id]); delete snoozed.current[accepted.id] }
    clearSnoozeTimer()

    // Navegar al chat específico usando window.location para forzar navegación aunque ya estés en /inbox
    setCurrent(null)
    setSnoozeSec(null)

    // Usar navigate + state para forzar que el Inbox abra el chat correcto
    navigate('/inbox', { state: { openConv: accepted.convId }, replace: false })

    // Pausa de 2 minutos
    clearPauseTimer()
    pauseUntil.current = Date.now() + PAUSE_MS
    let sec = Math.floor(PAUSE_MS / 1000)
    setPauseSec(sec)
    pauseTimer.current = setInterval(() => {
      sec -= 1
      setPauseSec(s => {
        if (s === null || s <= 1) {
          clearPauseTimer()
          setQueue(prev => [...prev]) // trigger re-check
          return null
        }
        return s - 1
      })
    }, 1000)
  }, [current, addLog, navigate, clearSnoozeTimer, clearPauseTimer])

  const handleDismiss = useCallback(() => {
    if (!current) return
    const alert = current

    addLog({
      alertId: alert.id, convId: alert.convId, contactName: alert.contactName,
      tier: alert.tier, channel: alert.channel, action: 'dismissed', waitMinutes: alert.waitMinutes,
    })
    setCurrent(null)

    // Limpiar timer anterior antes de crear uno nuevo
    clearSnoozeTimer()
    let sec = Math.floor(SNOOZE_MS / 1000)
    setSnoozeSec(sec)
    timerRef.current = setInterval(() => {
      setSnoozeSec(s => {
        if (s === null || s <= 1) {
          clearSnoozeTimer()
          return null
        }
        return s - 1
      })
    }, 1000)

    snoozed.current[alert.id] = setTimeout(() => {
      delete snoozed.current[alert.id]
      shown.current.delete(alert.id)
      if (dismissed.current.has(alert.id)) return // ya fue atendido, no resurface
      const still = useNotifications.getState().items.find(n => n.id === alert.id && !n.read)
      if (still) {
        setQueue(prev => [...prev, still])
        addLog({
          alertId: alert.id, convId: alert.convId, contactName: alert.contactName,
          tier: alert.tier, channel: alert.channel, action: 'resurfaced', waitMinutes: alert.waitMinutes,
        })
      }
    }, SNOOZE_MS)
  }, [current, addLog, clearSnoozeTimer])

  useEffect(() => () => {
    Object.values(snoozed.current).forEach(clearTimeout)
    clearSnoozeTimer()
    clearPauseTimer()
  }, [clearSnoozeTimer, clearPauseTimer])

  const cfg = TIER[current?.tier] ?? TIER.warning

  return (
    <>
      {/* Toast rechazo */}
      {snoozeSec !== null && !current && pauseSec === null && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9990,
          background: 'var(--surface, #FFFEFA)', border: '1px solid var(--border, #E0D7C5)',
          borderLeft: '3px solid #C09B3A', borderRadius: '10px', padding: '10px 16px',
          boxShadow: '0 4px 20px rgba(11,23,40,0.12)',
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '12px', color: 'var(--text-mid, #4A4034)', minWidth: '220px',
        }}>
          <Clock size={13} style={{ color: '#C09B3A', flexShrink: 0 }} />
          <span>Alerta volverá en <strong>{snoozeSec}s</strong></span>
        </div>
      )}

      {/* Toast pausa post-atender */}
      {pauseSec !== null && !current && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9990,
          background: 'var(--surface, #FFFEFA)', border: '1px solid var(--border, #E0D7C5)',
          borderLeft: '3px solid #1E3A5C', borderRadius: '10px', padding: '10px 16px',
          boxShadow: '0 4px 20px rgba(11,23,40,0.12)',
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '12px', color: 'var(--text-mid, #4A4034)', minWidth: '260px',
        }}>
          <CheckCircle size={13} style={{ color: '#1E3A5C', flexShrink: 0 }} />
          <span>Siguiente alerta en <strong>{Math.floor(pauseSec / 60)}:{String(pauseSec % 60).padStart(2, '0')}</strong></span>
        </div>
      )}

      {/* Alerta principal */}
      {current && (
        <>
          <div onClick={handleDismiss} style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(11,23,40,0.5)', backdropFilter: 'blur(4px)',
          }} />

          <div role="alertdialog" aria-modal="true" style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999, width: 'min(400px, calc(100vw - 32px))',
            background: 'var(--surface, #FFFEFA)',
            border: `1.5px solid ${cfg.border}`, borderRadius: '18px',
            boxShadow: `0 24px 64px rgba(11,23,40,0.22), 0 0 0 4px ${cfg.accentPale}`,
            overflow: 'hidden', animation: 'invasiveIn 0.32s cubic-bezier(0.34,1.56,0.64,1)',
            fontFamily: 'var(--font-sans, system-ui)',
          }}>
            <div style={{ height: '3px', background: `linear-gradient(90deg, transparent, ${cfg.accent} 30%, ${cfg.accent} 70%, transparent)` }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '20px 20px 14px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                background: cfg.iconBg, border: `1px solid ${cfg.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'iconPulse 2s ease-in-out infinite',
              }}>
                <AlmenaraMark size={28} tower={cfg.accent} light={cfg.accent} pulse />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: cfg.accent, opacity: 0.85 }}>
                  {cfg.label}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '17px', fontWeight: 700, color: 'var(--text, #15212E)', fontFamily: 'var(--font-display, serif)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {current.contactName}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '99px', background: 'var(--sand, #EFE8DA)', border: '1px solid var(--border, #E0D7C5)', flexShrink: 0 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: CHANNEL_DOT[current.channel] ?? '#C09B3A', flexShrink: 0 }} />
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted, #7A6E59)' }}>
                  {CHANNEL_LABEL[current.channel] ?? current.channel}
                </span>
              </div>
            </div>

            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ padding: '12px 14px', background: cfg.accentVp, border: `1px solid ${cfg.border}`, borderRadius: '10px', marginBottom: '12px' }}>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.55, color: cfg.text, fontWeight: 500 }}>
                  {current.contactName} lleva <strong>{formatWait(current.waitMinutes)}</strong> sin respuesta
                </p>
              </div>

              <p style={{ margin: '0 0 16px', fontSize: '11px', color: 'var(--text-muted, #7A6E59)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <Clock size={11} /> Si rechazas, esta alerta volverá en 30 segundos
              </p>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleDismiss} style={{
                  flex: 1, padding: '10px 0', borderRadius: '10px',
                  border: '1.5px solid var(--border, #E0D7C5)', background: 'var(--sand, #EFE8DA)',
                  cursor: 'pointer', color: 'var(--text-mid, #4A4034)', fontSize: '13px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--sand-2, #E6DECC)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--sand, #EFE8DA)'}
                >
                  <X size={14} /> Rechazar
                </button>
                <button onClick={handleAccept} style={{
                  flex: 2, padding: '10px 0', borderRadius: '10px',
                  border: 'none', background: cfg.btnBg, cursor: 'pointer', color: cfg.btnText,
                  fontSize: '13px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  boxShadow: `0 4px 14px ${cfg.accentPale}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.01)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <CheckCircle size={14} /> Atender ahora
                </button>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes invasiveIn {
              from { opacity: 0; transform: translate(-50%,-50%) scale(0.88); }
              to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
            }
            @keyframes iconPulse {
              0%,100% { transform: scale(1); }
              50% { transform: scale(1.08); }
            }
            @keyframes fadeIn {
              from { opacity: 0; } to { opacity: 1; }
            }
          `}</style>
        </>
      )}
    </>
  )
}
