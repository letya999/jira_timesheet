# Proposal: Add Persistent Global App Header

## Why

The app top bar is currently implemented as a route layout element, but the left brand marker (`JT`) is inside the sidebar header and is not consistently visible when the sidebar is collapsed or hidden on mobile. We need one persistent header that is always visible and interactive on every `/app/*` page.

## What Changes

- Introduce a dedicated `AppHeader` component for the global shell header.
- Move `JT` branding into the header left section.
- Place sidebar expand/collapse control in the top-left of the header.
- Keep profile, notifications, and language controls in the top-right of the header.
- Make the header sticky/fixed at the top so it remains visible during page interaction.
- Add Storybook story and automated tests for the new component.

## Impact

### Affected specifications
- `routing-layout` (global app shell behavior)

### Affected code
- `web/src/layouts/components/app-header.tsx` (new)
- `web/src/layouts/components/topbar.tsx` (container refactor)
- `web/src/layouts/components/sidebar.tsx` (remove duplicated brand block)
- `web/src/layouts/components/app-header.stories.tsx` (new)
- `web/src/layouts/components/app-header.test.tsx` (new)

### User impact
- Header is uniform and always available on each app page.
- Sidebar toggle remains accessible even when sidebar is collapsed.
- Notifications/profile/language controls remain in a stable top-right location.

### API / DB impact
- None.
