# Implementation Tasks: Persistent App Header

1. [x] Create `AppHeader` as a dedicated shell component with:
- top-left `JT` label and sidebar toggle button
- top-right profile, notifications, and language controls
- sticky top behavior

2. [x] Refactor `Topbar` to act as a container that provides user/notification data and handlers to `AppHeader`.

3. [x] Remove duplicated `JT` brand block from sidebar header to keep branding source in one place.

4. [x] Add Storybook stories for `AppHeader` covering default and no-unread states.

5. [x] Add unit tests for `AppHeader`:
- render controls
- toggle sidebar callback path
- notifications/logout actions

6. [x] Run validation (`vitest` + `eslint`) and fix findings.
