# Task 02: Phase 2 — Design System (Tokens + Components)

**Goal:** Complete component library in Storybook. Every component follows the pattern: **Component + Story + Unit Test**.

### 2a — Design System Atoms
*Basic building blocks with no business logic.*

- [x] **Typography**: Headings (H1-H4), Body, Lead, Mono (for Jira IDs).
- [x] **Button**: Variants (primary, secondary, ghost, destructive, outline), loading, disabled.
- [x] **Input / PasswordInput**: Prefix/suffix support, visibility toggle for password.
- [x] **Checkbox / RadioGroup / Switch**: Standard selection controls.
- [x] **Badge / StatusBadge**: Variants for Jira states and general tagging.
- [x] **Avatar**: Support for initials, sizes (sm/md/lg), and status indicators.
- [x] **Skeleton**: Shapes (line/circle/rect), animated loading states.
- [x] **Spinner**: Sizes, colors, consistent centering logic.
- [x] **Tooltip**: Placement, delay, accessibility support.
- [x] **Separator**: Orientation support.

### 2b — Form Elements & Complex Input
*Controlled/Uncontrolled components integrated with React Hook Form & Zod.*

- [ ] **Select / MultiSelect**: Single/multiple choice with Tag-chips and search.
- [ ] **DatePicker / DateRangePicker**: Calendar-based selection for reporting.
- [ ] **Stepper**: Numeric input with +/- buttons for time logging.
- [ ] **Slider**: Discrete steps for pagination and granularity.
- [ ] **Combobox**: Async search for large lists (Employees/Projects).
- [ ] **Textarea**: Auto-resize, max length support.

### 2c — Data Display
*Components for structured information layout.*

- [ ] **Card**: Various styles for Dashboard and Navigation.
- [ ] **DataTable**: Base component using TanStack Table (sort, filter, virtualized).
- [ ] **StatItem**: Large metrics with labels (Vacation/Sick leave stats).
- [ ] **Accordion**: Animated collapsible sections for Org Units.
- [ ] **Alert / Callout**: Info, Success, Warning, Error variants.

### 2d — Layout & Navigation
*Application shell and structural components.*

- [ ] **Sidebar**: Collapsible, active state handling (TanStack Router).
- [ ] **AppHeader**: Breadcrumbs, Logo, User profile trigger.
- [ ] **Tabs**: Underline and Pill variants for view switching.
- [ ] **DropdownMenu**: Trigger-based menus for actions.
- [ ] **Sheet (Drawer)**: Side panels for quick editing.

### 2e — Domain Specific Components
*Tailored for Jira Timesheet specific logic.*

- [ ] **GanttChartWrapper**: React wrapper for `dhtmlx-gantt`.
- [ ] **JiraKeyLink**: Themed link with Jira task icon and key.
- [ ] **TimeGrid**: Weekly grid for fast time entry.
- [ ] **ChatMessage**: Bubbles for AI Chat with Markdown support.
- [ ] **SyncIndicator**: Animation for Jira background sync status.
- [ ] **LanguageSwitcher**: Compact/Full toggle for i18next.

### 4. Quality Control & Completion
- [ ] **Accessibility (a11y)**: Ensure all components pass a11y checks in Storybook.
- [ ] **Testing**: `bun test` passes for all components (Vitest).
- [ ] **Controls**: Verify all variants and states are adjustable via Storybook Controls panel.
- [ ] **Dark Mode**: Verify `[data-theme="dark"]` support for all components.
