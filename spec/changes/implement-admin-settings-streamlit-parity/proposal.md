# Proposal: implement-admin-settings-streamlit-parity

## Why

The legacy Streamlit `/Settings` page still contains the full admin workflow for production calendar management and paginated system-user visibility. The current web `/app/settings` page has partial org/integration controls but does not provide full parity with Streamlit admin operations.

## What Changes

### Admin Settings parity in web client
- Add an explicit **Admin Settings** tab in `/app/settings` (visible only to admins with `settings.manage`).
- Port Streamlit settings capabilities 1:1 into this tab:
  - paginated system users list (first/prev/next/last controls)
  - instance country management for production calendar
  - holiday sync actions for current and next year
  - holiday range viewer with sortable holiday list
  - add/update custom holiday form
  - remove custom holiday by date
  - Jira URL informational block and placeholder section

### Logic parity constraints
- Use the same default page size (`20`) and page navigation behavior.
- Use current year defaults for holiday range (`YYYY-01-01` to `YYYY-12-31`).
- Keep country list aligned with Streamlit options (`RU, US, GB, DE, KZ, BY, UA, AE, UZ`).

## Impact

**Specs affected**: `spec/specs/pages` (delta)

**Files modified**:
- `web/src/features/settings/pages/settings-page.tsx`

**Files created**:
- `spec/changes/implement-admin-settings-streamlit-parity/proposal.md`
- `spec/changes/implement-admin-settings-streamlit-parity/specs/pages/spec-delta.md`
- `spec/changes/implement-admin-settings-streamlit-parity/tasks.md`

**APIs consumed**:
- `GET /api/v1/users/`
- `GET /api/v1/calendar/country`
- `POST /api/v1/calendar/country`
- `GET /api/v1/calendar/holidays`
- `POST /api/v1/calendar/holidays`
- `DELETE /api/v1/calendar/holidays/{holiday_date}`
- `POST /api/v1/calendar/holidays/sync`
