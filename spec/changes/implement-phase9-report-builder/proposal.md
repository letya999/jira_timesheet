# Proposal: implement-phase9-report-builder

## Why

The React web app at `/app/reports` currently shows only a blank heading with an `<Outlet />` — nothing renders at the index route. The existing CapEx/OpEx sub-routes are dashboard preset views that do not provide the core Report Builder functionality.

The Streamlit legacy at port 8501 (`3_Report_Builder.py`) is the reference implementation. It provides a full pivot-table builder: API-level data source filters, flexible row/column dimension selection, date granularity control, value format switching, and an interactive results section (metrics, data table, Bar/Line/Pie charts, CSV export). Users rely on this workflow daily and the React replacement must achieve full functional parity before Streamlit can be deprecated.

## What Changes

- **Add** index route `_app.reports.index.tsx` → renders `ReportBuilderPage` at `/app/reports`
- **Add** `_app.reports.index.tsx` to the TanStack Router tree in `router.ts`
- **Modify** `_app.reports.tsx` parent route — remove hard-coded "Reports" `<h1>` (each child/index handles its own title)
- **Refactor** `report-builder-page.tsx` — make it a self-contained standalone page (no required `initialFilters` prop), own title "Report Builder", own section headings
- **Ensure** `ReportFilterPanel` renders all 4 filter columns matching Streamlit:
  - Col 1: DateRangePicker + Categories multi-select
  - Col 2: Project Combobox → conditional Release Combobox + Sprints multi-select
  - Col 3: Team Combobox (Admin/CEO/PM only) + Worklog Type multi-select
  - Col 4: Employees multi-select (Admin/CEO/PM only)
- **Ensure** `PivotConfigPanel` renders 3-column layout matching Streamlit:
  - Col 1: Row Dimensions multi-select + Col Dimensions multi-select
  - Col 2: Value unit RadioGroup + Hours per day input + Date granularity selector
  - Col 3: "Run Report" primary button (disabled while loading or on validation error)
- **Ensure** results section renders ONLY after Run is clicked:
  - `ReportMetricsBar` — Grand Total / Total Hours / Unique Employees / Unique Tasks
  - `ReportDataTable` — dynamic pivot columns from API response
  - `ReportChartPanel` — Bar/Line/Pie chart switcher with "Color by" selector
  - `ReportExportButton` — Excel export
- **Fix** RBAC: Employee role sees own data only (no team/employee filter inputs shown)
- **Keep** CapEx/OpEx sub-routes as preset bookmark views

## Impact

- **Spec**: `spec/specs/pages/spec.md` — new capability "Report Builder Page"
- **Routes**: `web/src/routes/_app.reports.tsx`, new `_app.reports.index.tsx`
- **Router**: `web/src/router.ts` — add `reportsIndexRoute`
- **Feature**: `web/src/features/reports/pages/report-builder-page.tsx` — minor refactor
- **Users**: All authenticated users gain access to the full pivot report builder
