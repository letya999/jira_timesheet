# Specification Delta: UI Improvements, Localization, and Dark Mode

## MODIFIED Requirements

### Requirement: Dashboard Filters Interaction
WHEN a user navigates to the Dashboard page,
the system SHALL provide a collapsible filter block using the `FilterToggleButton` component, 
consistent with the Employees page.

#### Scenario: Toggle Dashboard Filters
GIVEN the user is on the Dashboard page
WHEN the user clicks the "Show Filters" button
THEN the filter block expands
AND the button label changes to "Hide Filters"

### Requirement: Dark Mode Support for Core UI
The system SHALL support dark mode for all core layout and data components, 
ensuring proper contrast, background colors, and border visibility.

#### Scenario: Dark Mode Sidebar
GIVEN the application is in dark mode
THEN the sidebar SHALL have a dark background (bg-card or similar)
AND text/icons SHALL be light and legible.

#### Scenario: Dark Mode Pivot Table
GIVEN the application is in dark mode
THEN the PivotTable component SHALL have theme-aware borders and sticky header backgrounds.

### Requirement: Localization for Filters and Components
The system SHALL provide correct translations for all UI elements in English and Russian, 
specifically addressing project, team, and common filter labels.

#### Scenario: Russian Pagination Layout
GIVEN the application is in Russian locale
WHEN the "Page 1 of 1" (Страница 1 из 1) text is displayed
THEN the layout SHALL remain stable without overflow or wrapping issues.

### Requirement: Login Page Features
The Login page SHALL include accessibility and utility features including language switching, 
theme switching, and secure password visibility toggles.

#### Scenario: Password Visibility Toggle
GIVEN the user is on the Login page
WHEN the user enters a password
THEN the system SHALL provide an "Eye" icon to toggle password visibility.
