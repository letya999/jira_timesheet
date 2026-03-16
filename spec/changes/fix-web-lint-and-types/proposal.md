# Proposal: Fix Web Quality (Linter & Types)

## Why
The web application currently has 191 ESLint issues and 59 TypeScript compiler errors. These issues range from simple unused variables to critical type mismatches in API communications and broken imports in routing. This technical debt:
- Increases the risk of runtime errors.
- Prevents reliable production builds.
- Makes the codebase harder to maintain and understand.
- Compromises the benefits of using TypeScript.

## What Changes
- **Routing**: Restore broken imports in `src/router.ts` by pointing to the correct route files.
- **API Integration**: Align custom hooks with the generated OpenAPI client schemas (e.g., fixing `page`/`size` vs `skip`/`limit` parameters).
- **Type Safety**:
    - Resolve "possibly undefined" errors using optional chaining or guard clauses.
    - Replace `any` with specific types or `unknown` where appropriate.
    - Fix incorrect property access on paginated responses.
- **Linter Compliance**:
    - Clean up unused variables and imports.
    - Fix React Hook violations in Storybook stories.
    - Resolve Fast Refresh warnings by separating components from constants/configs.
    - Standardize TypeScript comments (`@ts-expect-error` with descriptions).

## Impact
- **Specs**: No changes to functional requirements, but ensures the implementation correctly follows existing API specs.
- **Code**: Significant reduction in technical debt and improved type safety across the `web/` directory.
- **CI/CD**: Enables clean linting and type-checking steps in the CI pipeline.
- **Development**: Better developer experience with accurate IDE feedback.
