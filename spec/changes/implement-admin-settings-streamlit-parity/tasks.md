# Implementation Tasks: implement-admin-settings-streamlit-parity

## OpenSpec artifacts
1. [x] Create proposal for Admin Settings Streamlit parity.
2. [x] Add spec delta for system users and production calendar parity.

## Frontend implementation
3. [x] Add `Admin Settings` tab in `web` settings page for users with `settings.manage`.
4. [x] Implement system-users section with `size=20` paginated fetch and first/prev/next/last controls.
5. [x] Implement production calendar section with:
   - country get/set
   - sync current year / sync next year
   - holiday date range list sorted by date
   - add/update custom holiday
   - delete custom holiday by date.
6. [x] Add Jira URL info block and placeholder note in admin section to match Streamlit behavior.

## Verification
7. [x] Run web lint for modified files.
