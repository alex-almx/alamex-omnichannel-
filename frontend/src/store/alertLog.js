/**
 * alertLog store — registra todos los eventos de notificaciones invasivas.
 * El admin puede ver este log en el panel de Operador / Ajustes.
 *
 * Cada entrada tiene:
 *   - id, timestamp
 *   - alertId, convId, contactName, channel, tier
 *   - action: 'shown' | 'accepted' | 'dismissed' | 'resurfaced'
 *   - waitMinutes: cuánto llevaba sin respuesta
 *   - agentName: quién vio la alerta (del store me)
 */
import { create } from 'zustand'

let seq = 0

export const useAlertLog = create((set, get) => ({
  entries: [],   // max 500

  addLog: (data) => {
    const { me } = (() => {
      try { return require('./me').useMe.getState() } catch { return { me: null } }
    })()

    const entry = {
      id:          ++seq,
      timestamp:   new Date().toISOString(),
      agentName:   me?.name ?? 'Agente',
      alertId:     data.alertId,
      convId:      data.convId,
      contactName: data.contactName ?? 'Contacto',
      channel:     data.channel ?? 'whatsapp',
      tier:        data.tier ?? 'warning',
      action:      data.action,
      waitMinutes: data.waitMinutes ?? 0,
    }

    set(s => ({
      entries: [entry, ...s.entries].slice(0, 500),
    }))
  },

  clearLog: () => set({ entries: [] }),
}))
