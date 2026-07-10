# Parche — Respuesta del agente humano llega al widget web

**Rama:** `fix/widget-respuesta-agente-polling`
**Alcance:** backend (Render) + frontend/widget embebible (Netlify)
**Para:** equipo de despliegue — validar que el widget de alam.mx quedó parcheado.

---

## 1. Problema que resuelve

En el widget web (canal `website`, ej. el de alam.mx) el visitante veía las
respuestas de la **IA** sin problema, pero **cuando un agente humano respondía
desde Almenara (Inbox), el mensaje no llegaba al widget**.

**Causa raíz:** el widget solo funcionaba en modo petición/respuesta. No existía
ningún mecanismo de entrega de mensajes salientes hacia el widget:

- El backend guardaba el mensaje del agente en la BD y no hacía nada más.
- `widget.js` nunca consultaba mensajes nuevos (sin polling, sin WebSocket).
- Channels está instalado pero sin configurar (sin consumers/routing/CHANNEL_LAYERS).

**Solución:** polling. Se agregó un endpoint público que devuelve los mensajes
nuevos (`ai`/`agent`) de la sesión, y el widget lo consulta cada 4 s mientras el
chat está abierto. (Se eligió polling y no WebSocket porque el stack —Render +
Supabase— no tiene Redis para un channel layer.)

Adicionalmente se corrigió un bug que impedía responder a la IA en canales con
`ai_model` nulo.

---

## 2. Cambios incluidos

### Backend (se despliega en Render)

| Archivo | Cambio |
|---|---|
| `backend/integrations/widget.py` | Nueva vista pública `WidgetMessagesView` (polling) + helper `_get_widget_conversation` + throttle `WidgetPollThrottle`. |
| `backend/integrations/urls.py` | Nueva ruta `GET /api/integrations/widget/<key>/messages/`. |
| `backend/config/settings.py` | Throttle rate `widget_poll: 120/min`; `DISABLE_SERVER_SIDE_CURSORS` para el pooler de Supabase. |
| `backend/integrations/services/agent_graph.py` | Fix: `creds.get('ai_model') or 'claude-haiku-4-5-20251001'` (antes un `ai_model=None` tumbaba al agente). |

**Nuevo endpoint** (público, solo lectura, nunca crea conversación; valida
`allowed_origins` igual que los demás):

```
GET /api/integrations/widget/<widget_key>/messages/?session_id=<sid>&after=<id>
→ { "messages": [ {id, role, content, created_at}... ],
    "conversation_id": <id|null>, "status": <str|null> }
```

Devuelve los mensajes de la conversación de esa sesión con `id > after`,
excluyendo los del propio visitante (`role != 'customer'`).

### Frontend (se despliega en Netlify)

| Archivo | Cambio |
|---|---|
| `frontend/public/widget.js` | **Widget embebible real** (el de alam.mx): polling cada 4 s con cursor `after` + dedupe; avanza el cursor con el `message_id` del envío para no duplicar la respuesta de la IA. |
| `frontend/src/features/widget/WidgetTest.jsx` | Mismo polling en el tester in-app (`/widget-test`). |

---

## 3. Cambios de datos en producción YA aplicados

Durante el diagnóstico se hicieron estos ajustes sobre la BD de producción
(Supabase). **No requieren acción de despliegue**, pero el equipo debe saberlos:

- **Canal `website` id=1 (`alam.mx`):** `credentials.ai_model` fijado a
  `claude-haiku-4-5-20251001` (estaba en `null`).
- **Créditos:** se agregaron **$5 USD** al saldo de la organización (el agente no
  responde con saldo en $0). Verificar saldo en **Ajustes**.
- **`allowed_origins`** del canal 1: se agregaron `http://localhost:5173` y
  `http://localhost:3000` (aditivo, para pruebas locales). Se pueden quitar en
  producción sin afectar a alam.mx.

---

## 4. Pasos de despliegue

### Backend — Render
1. Merge de esta rama a `main` (o la rama que Render auto-despliega).
2. Render reconstruye con `./build.sh` (instala deps, `collectstatic`, `migrate`).
   **No hay migraciones nuevas** en este parche.
3. Verificar que el servicio levante sin errores.

### Frontend / widget — Netlify
1. El mismo merge dispara el build de Netlify (`npm run build`, publica `dist/`).
2. `widget.js` queda actualizado en `https://<sitio>.netlify.app/widget.js`.
3. **alam.mx** carga el widget desde esa URL de Netlify (con `data-api-url`
   apuntando al backend de Render) — no hay que editar el embed.

> **Cache:** Netlify/navegador pueden cachear `widget.js`. Si tras el deploy
> alam.mx sigue mostrando la versión vieja, forzar recarga con un parámetro de
> versión en el embed: `.../widget.js?v=2`.

---

## 5. Verificación post-deploy

1. El endpoint responde (no 404):
   ```
   GET https://alamex-omnichannel.onrender.com/api/integrations/widget/<key>/messages/?session_id=x
   ```
2. El `widget.js` de Netlify ya contiene `getMessages` / `_startPolling`.
3. Prueba end-to-end en alam.mx:
   - Visitante abre el widget y escribe un mensaje → responde la IA.
   - Un agente responde esa conversación desde **Almenara → Inbox**.
   - El mensaje del agente **aparece solo en el widget** en ≤ ~4 s.

> Probado en local de punta a punta contra la BD de producción (tester in-app y
> embed real de `widget.js`): el mensaje del agente llega al widget por polling.

---

## 6. Notas y pendientes (fuera de este parche)

- **Salida a canales Meta:** las respuestas del agente humano tampoco se reenvían
  a WhatsApp/Messenger/Instagram vía Graph API (mismo hueco de arquitectura, otro
  canal). No se aborda aquí.
- **Base de conocimiento:** el agente respondió "sin acceso a la base de
  conocimiento" en pruebas → la KB de la organización parece vacía/sin contenido.
- **RLS de Supabase:** políticas desactivadas. No afecta el widget (Django entra
  como rol `postgres`, que bypassa RLS), pero es deuda de seguridad a revisar.
