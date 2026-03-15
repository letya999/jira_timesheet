# Implementation Tasks — implement-phase9-report-builder

1. Read and fully understand `frontend/views/3_Report_Builder.py` (the Streamlit reference) — note every filter, every pivot dimension, every chart type, exact UX flow

2. Read all existing component files:
   - `web/src/features/reports/pages/report-builder-page.tsx`
   - `web/src/features/reports/components/report-filter-panel.tsx`
   - `web/src/features/reports/components/pivot-config-panel.tsx`
   - `web/src/features/reports/components/report-metrics-bar.tsx`
   - `web/src/features/reports/components/report-data-table.tsx`
   - `web/src/features/reports/components/report-chart-panel.tsx`
   - `web/src/features/reports/components/report-export-button.tsx`
   - `web/src/features/reports/hooks/use-report-filters.ts`
   - `web/src/features/reports/hooks/index.ts`
   - `web/src/routes/_app.reports.tsx`
   - `web/src/router.ts`

3. Create `web/src/routes/_app.reports.index.tsx` — index route for `/app/reports`, renders `<ReportBuilderPage />` with no props, RBAC guard (`reports.view` permission)

4. Modify `web/src/router.ts` — import `reportsIndexRoute` and add it as a child of `reportsRoute` alongside capex/opex: `reportsRoute.addChildren([reportsIndexRoute, reportsCapexRoute, reportsOpexRoute])`

5. Modify `web/src/routes/_app.reports.tsx` — remove the hard-coded `<h1>Reports</h1>` from the parent route component (it should just be `<Outlet />`), OR keep it only if it doesn't duplicate child page titles

6. Refactor `web/src/features/reports/pages/report-builder-page.tsx`:
   - Make all props optional with sensible defaults
   - Default `title` to "Report Builder"
   - Default `initialFilters` to `{}` (uses DEFAULT_FILTERS from the hook)
   - Add a visible page description subtitle (matching Streamlit's `st.markdown` subtitle)
   - Wrap full page in a proper layout with padding

7. Audit `web/src/features/reports/components/report-filter-panel.tsx` against `3_Report_Builder.py`:
   - Verify ALL 4 columns render correctly
   - Col 1: DateRangePicker full-width + Categories multiselect
   - Col 2: Project combobox (shows "All Projects" when empty) → conditionally render Release combobox + info text when no project selected + Sprints multiselect
   - Col 3: Team combobox visible ONLY for Admin/CEO/PM — use `useAuthStore` `user.is_admin` OR check role from `useCurrentUser` — Employee sees info text only; Worklog Type multiselect (JIRA / MANUAL options)
   - Col 4: Employees multiselect visible ONLY for Admin/CEO/PM; Employee sees own name text
   - All selects show loading skeletons while fetching

8. Audit `web/src/features/reports/components/pivot-config-panel.tsx` against Streamlit:
   - Col 1: Row Dimensions multiselect (ALL 11 options: user/project/task/release/sprint/team/division/department/date/category/type) with default `['user','project']`, Col Dimensions multiselect with default `['date']`
   - Col 2: Value unit RadioGroup (hours/days horizontal), Hours per day NumberInput (visible only when format=days, min=1 max=24 default=8), Date Granularity segment control (day/week/2weeks/month/quarter — visible only when 'date' in rows OR cols)
   - Col 3: "Run Report" primary button — disabled when: (a) rows empty, (b) row/col overlap exists, (c) isLoading is true; shows spinner/loading text when fetching
   - Show inline error messages: "At least one row dimension required" / "Dimension conflict: {overlap}"

9. Audit `web/src/features/reports/components/report-data-table.tsx`:
   - Confirm dynamic column generation from API `columns` array
   - Confirm fallback to `Object.keys(data[0])` when columns array is empty
   - Numeric columns (value, hours) right-aligned with 1 decimal
   - Empty state: "No results" centered message

10. Audit `web/src/features/reports/components/report-chart-panel.tsx` against Streamlit:
    - Bar chart: x=first row dimension, grouped bars by colorBy dimension
    - Line chart: only enabled when 'date' is in rows/cols; x=date granularity column, lines by colorBy
    - Pie chart: slices by first row dimension, values = sum of 'value'
    - "Color by" selector shows all available dimensions
    - Show info message when Line selected but no date dimension

11. Verify `web/src/features/reports/pages/report-builder-page.tsx` full flow:
    - Initial state: shows FilterPanel + PivotConfigPanel, NO results section
    - After Run clicked: `reportBody` state set → `useCustomReport` fires → skeleton → results
    - Results: ReportMetricsBar → Separator → Card(ReportDataTable + ExportButton) → Card(ReportChartPanel)
    - Error state: red error banner
    - Empty state: "No data found for selected filters"
    - FilterBar with active chips (remove individual chip → update filter state)

12. Run TypeScript check: `cd web && node_modules/.bin/tsc --noEmit` — fix any errors introduced

13. Run existing tests: `cd web && node_modules/.bin/vitest run src/features/reports` — all 59 must pass; update tests if behavior changed

14. Manual verification checklist (document results):
    - Navigate to `http://localhost:5173/app/reports` — Report Builder page renders
    - All 4 filter columns visible
    - Pivot Config visible with all 11 dimensions
    - Run Report button disabled when rows empty
    - Click Run → loading skeleton → results appear
    - Switch chart types Bar/Line/Pie — each renders
    - Export button → file downloads
    - Navigate to `/app/reports/capex` — still works as preset view
