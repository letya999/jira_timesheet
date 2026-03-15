import { http, HttpResponse } from 'msw';

const mockReportSummary = {
  title: 'Current Month Summary',
  period: 'March 1, 2026 - March 31, 2026',
  totalHours: 168,
  capexHours: 126,
  opexHours: 42,
};

const mockDashboardData = {
  data: [
    { Date: '2026-03-01', Hours: 8, Type: 'JIRA', User: 'Alice', Project: 'Alpha', Task: 'BE-101', Month: 'March 2026', OrgUnit: 'Engineering', ParentUnit: 'Tech' },
    { Date: '2026-03-02', Hours: 6, Type: 'MANUAL', User: 'Bob', Project: 'Beta', Task: 'BE-202', Month: 'March 2026', OrgUnit: 'Engineering', ParentUnit: 'Tech' },
    { Date: '2026-03-03', Hours: 7, Type: 'JIRA', User: 'Alice', Project: 'Alpha', Task: 'BE-103', Month: 'March 2026', OrgUnit: 'Engineering', ParentUnit: 'Tech' },
    { Date: '2026-03-04', Hours: 5, Type: 'MANUAL', User: 'Charlie', Project: 'Gamma', Task: 'BE-304', Month: 'March 2026', OrgUnit: 'Design', ParentUnit: 'Tech' },
  ],
};

const mockCustomData = {
  data: [
    { date: '2026-03-01', hours: 8, value: 8, type: 'JIRA', user: 'Alice', project: 'Alpha', task: 'BE-101', issue_key: 'BE-101', release: 'v1.0', sprint: 'Sprint 5', category: 'Development', description: 'Feature work', team: 'Engineering', parent: 'Tech' },
    { date: '2026-03-02', hours: 6, value: 6, type: 'MANUAL', user: 'Bob', project: 'Beta', task: 'BE-202', issue_key: 'BE-202', release: 'v2.0', sprint: 'Sprint 5', category: 'QA', description: 'Testing', team: 'Engineering', parent: 'Tech' },
    { date: '2026-03-03', hours: 7, value: 7, type: 'JIRA', user: 'Alice', project: 'Alpha', task: 'BE-103', issue_key: 'BE-103', release: 'v1.0', sprint: 'Sprint 6', category: 'Development', description: 'Bug fix', team: 'Engineering', parent: 'Tech' },
    { date: '2026-03-04', hours: 5, value: 5, type: 'MANUAL', user: 'Charlie', project: 'Gamma', task: 'BE-304', issue_key: 'BE-304', release: 'N/A', sprint: 'Sprint 6', category: 'Design', description: 'UI work', team: 'Design', parent: 'Tech' },
    { date: '2026-03-05', hours: 8, value: 8, type: 'JIRA', user: 'Bob', project: 'Alpha', task: 'BE-105', issue_key: 'BE-105', release: 'v1.0', sprint: 'Sprint 6', category: 'Development', description: 'Integration', team: 'Engineering', parent: 'Tech' },
  ],
  columns: ['date', 'hours', 'value', 'type', 'user', 'project', 'task', 'sprint', 'category'],
};

const mockCategories = [
  { id: 1, name: 'Development' },
  { id: 2, name: 'QA' },
  { id: 3, name: 'Design' },
  { id: 4, name: 'DevOps' },
  { id: 5, name: 'Management' },
];

const mockSprints = [
  { id: 1, name: 'Sprint 6' },
  { id: 2, name: 'Sprint 5' },
  { id: 3, name: 'Sprint 4' },
];

export const reportsHandlers = [
  http.get('/api/v1/reports/summary', () => {
    return HttpResponse.json(mockReportSummary);
  }),
  http.get('/api/v1/reports/dashboard', () => {
    return HttpResponse.json(mockDashboardData);
  }),
  http.post('/api/v1/reports/custom', () => {
    return HttpResponse.json(mockCustomData);
  }),
  http.get('/api/v1/reports/categories', () => {
    return HttpResponse.json(mockCategories);
  }),
  http.get('/api/v1/reports/sprints', () => {
    return HttpResponse.json(mockSprints);
  }),
];
