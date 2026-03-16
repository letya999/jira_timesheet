import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export type SortOrder = 'asc' | 'desc'

interface SortOrderControlProps {
  value: SortOrder
  onChange: (value: SortOrder) => void
  label?: string
}

export function SortOrderControl({
  value,
  onChange,
  label = 'Сортировка по дате',
}: SortOrderControlProps) {
  const id = useId()
  const ascId = `${id}-asc`
  const descId = `${id}-desc`

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <RadioGroup
        className="flex flex-row gap-6"
        value={value}
        onValueChange={(next) => onChange(next as SortOrder)}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem id={ascId} value="asc" />
          <Label htmlFor={ascId}>asc</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem id={descId} value="desc" />
          <Label htmlFor={descId}>desc</Label>
        </div>
      </RadioGroup>
    </div>
  )
}
