// Placeholder toast utility - wire up to shadcn/sonner in Phase 5
// Replace the implementations below once a toast provider is added to main.tsx
export const toast = {
  error: (message: string) => console.error('[toast:error]', message),
  success: (message: string) => console.info('[toast:success]', message),
  warning: (message: string) => console.warn('[toast:warning]', message),
};
