import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'

export const settingsRoute = createRoute({
  path: 'settings',
  getParentRoute: () => appLayoutRoute,
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-muted-foreground">Application settings placeholder — Phase 6</p>
    </div>
  ),
})
