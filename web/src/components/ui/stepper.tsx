"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface StepperProps {
  value?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
}

export function Stepper({
  value = 0,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled,
}: StepperProps) {
  const handleDecrement = () => {
    const newValue = Math.max(min, value - step)
    onValueChange?.(newValue)
  }

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step)
    onValueChange?.(newValue)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (!isNaN(newValue)) {
      onValueChange?.(Math.min(max, Math.max(min, newValue)))
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="h-8 w-8 shrink-0"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        value={value}
        onChange={handleChange}
        className="h-8 w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        disabled={disabled}
      />
      <Button
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className="h-8 w-8 shrink-0"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
