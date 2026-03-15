import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  description?: string
}

export function FormField({
  label,
  error,
  required,
  children,
  className,
  description,
}: FormFieldProps) {
  const id = React.useId()

  // Inject the generated id into direct child elements (Input, Textarea, etc.)
  // so that the Label's htmlFor creates a proper accessible association.
  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
    : children

  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      {label && (
        <Label htmlFor={id} className={cn(error && "text-destructive")}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {child}
      {description && !error && (
        <p className="text-[0.8rem] text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-[0.8rem] font-medium text-destructive">{error}</p>
      )}
    </div>
  )
}
