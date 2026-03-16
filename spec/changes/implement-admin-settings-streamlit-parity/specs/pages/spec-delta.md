# Spec Delta: implement-admin-settings-streamlit-parity

## ADDED Requirements

### Requirement: Admin Settings tab provides Streamlit parity for system users
WHEN an authenticated admin opens `/app/settings`
THEN the system SHALL show an `Admin Settings` tab with a `System Users` section.

#### Scenario: Paginated users table
GIVEN the admin is on `System Users`
WHEN users are loaded
THEN the system SHALL fetch `GET /api/v1/users/` with `page` and `size=20`
AND render table columns for available Streamlit fields (`id`, `full_name`, `email`, `role`, `jira_user_id`, `weekly_quota`)
AND show first/previous/next/last pagination controls.

### Requirement: Admin Settings tab provides production calendar management
WHEN an authenticated admin opens the `Admin Settings` tab
THEN the system SHALL expose production calendar controls equivalent to Streamlit.

#### Scenario: Country setting update
GIVEN the current instance country code is loaded
WHEN the admin selects another country and confirms update
THEN the system SHALL call `POST /api/v1/calendar/country` and refresh country/holiday data.

#### Scenario: Holiday synchronization
GIVEN calendar controls are visible
WHEN the admin clicks sync current year
THEN the system SHALL call `POST /api/v1/calendar/holidays/sync` without `year`.

GIVEN calendar controls are visible
WHEN the admin clicks sync next year
THEN the system SHALL call `POST /api/v1/calendar/holidays/sync?year=<nextYear>`.

#### Scenario: Holiday range and overrides
GIVEN the holiday section is open
WHEN start and end dates are selected
THEN the system SHALL fetch `GET /api/v1/calendar/holidays` for that range and render sorted rows.

GIVEN add/update form is submitted
WHEN valid date/name/is_holiday values are provided
THEN the system SHALL call `POST /api/v1/calendar/holidays` and refresh list.

GIVEN delete by date action is submitted
WHEN a date is provided
THEN the system SHALL call `DELETE /api/v1/calendar/holidays/{holiday_date}` and refresh list.
