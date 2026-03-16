# Proposal: Replace 'any' with Strict Types and 'unknown'

## Why
The current codebase contains several instances of the `any` type, particularly in API hooks (`useAiHealth`, `useAiTraining`), form handlers, and test files. This bypasses TypeScript's type checking, leading to potential runtime errors and a poorer developer experience due to lack of autocompletion.

## What Changes
- **API Hooks**: Refactor `useAiHealth`, `useAiTraining`, and other hooks in `web/src/features/ai-chat/hooks/index.ts` to use generated types from `sdk.gen.ts` instead of `any`.
- **Forms & Callbacks**: Replace `any` in form `onSubmit` handlers and component callbacks with specific interfaces or `unknown`.
- **Tests & Storybook**: Clean up `any` usages in test files where they are used as quick shortcuts for complex objects.
- **Safety**: Where a specific type is truly dynamic, prefer `unknown` over `any` to force explicit type checking before usage.

## Impact
- **Developer Experience**: Improved autocompletion and "jump to definition" for API responses.
- **Reliability**: Reduced risk of runtime errors caused by accessing non-existent properties on API response objects.
- **Maintainability**: Clearer documentation of data structures through explicit typing.
- **No breaking changes**: This is a pure refactoring that does not change runtime behavior.
