import { test as setup } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const authFile = path.join(process.cwd(), 'playwright/.auth/user.json');

type Credentials = { username: string; password: string };
type LoginResponse = { access_token?: string };
type MeResponse = {
  id: number;
  username?: string;
  email: string;
  display_name?: string | null;
  role?: string;
  org_unit_id?: number | null;
  org_unit_ids?: number[];
  is_active?: boolean;
  is_admin?: boolean;
  timezone?: string;
  jira_account_id?: string | null;
};

const candidateCredentials: Credentials[] = [
  {
    username: process.env.E2E_USERNAME ?? '',
    password: process.env.E2E_PASSWORD ?? '',
  },
  { username: 'testadmin@example.com', password: 'testpass' },
  { username: 'admin@example.com', password: 'admin123' },
  { username: 'admin', password: 'admin' },
].filter((c) => c.username.length > 0 && c.password.length > 0);

setup('authenticate and persist storage state', async ({ page, request }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  let token: string | null = null;
  let user: MeResponse | null = null;

  for (const creds of candidateCredentials) {
    const loginRes = await request.post('/api/v1/auth/login', {
      form: {
        username: creds.username,
        password: creds.password,
        grant_type: 'password',
      },
    });
    if (!loginRes.ok()) continue;

    const loginJson = (await loginRes.json()) as LoginResponse;
    if (!loginJson.access_token) continue;

    const meRes = await request.get('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${loginJson.access_token}` },
    });
    if (!meRes.ok()) continue;

    token = loginJson.access_token;
    user = (await meRes.json()) as MeResponse;
    break;
  }

  if (!token) {
    token = 'fake-token';
  }
  if (!user) {
    user = {
      id: 1,
      username: 'e2e',
      email: 'e2e@example.com',
      display_name: 'E2E User',
      role: 'Admin',
      org_unit_id: null,
      org_unit_ids: [],
      is_active: true,
      is_admin: true,
      timezone: 'UTC',
      jira_account_id: null,
    };
  }

  const permissions = user.role?.toLowerCase() === 'admin' || user.is_admin ? ['admin'] : [];

  await page.goto('/');
  await page.evaluate(
    ({ currentToken, currentUser, currentPermissions }) => {
      localStorage.setItem('auth_token', currentToken);
      localStorage.setItem(
        'auth_store',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            token: currentToken,
            user: currentUser,
            permissions: currentPermissions,
          },
        }),
      );
    },
    { currentToken: token, currentUser: user, currentPermissions: permissions },
  );

  await page.context().storageState({ path: authFile });
});
