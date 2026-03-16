import { Link } from '@tanstack/react-router'

export function EmployeeDetailPlaceholder() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Employee details</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Employee details page is not implemented yet.
      </p>
      <Link to="/app/employees" className="text-sm text-primary hover:underline">
        Back to employees
      </Link>
    </div>
  )
}
