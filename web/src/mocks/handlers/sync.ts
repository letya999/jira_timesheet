import { http, HttpResponse } from 'msw'

let syncStatus = 'idle'
let progress = 0

export const syncHandlers = [
  http.get('/api/v1/sync/status', () => {
    return HttpResponse.json({
      status: syncStatus,
      progress: progress,
      lastSyncAt: new Date(Date.now() - 3600000).toISOString(),
    })
  }),
  http.post('/api/v1/sync/trigger', () => {
    syncStatus = 'syncing'
    progress = 0
    return HttpResponse.json({ success: true })
  })
]
