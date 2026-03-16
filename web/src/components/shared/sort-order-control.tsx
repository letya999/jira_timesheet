import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useTranslation } from 'react-i18next'

export type SortOrder = 'asc' | 'desc'

interface SortOrderControlProps {
  value: SortOrder
  onChange: (value: SortOrder) => void
  label?: string
}

export function SortOrderControl({
  value,
  onChange,
  label,
}: SortOrderControlProps) {
  const { t } = useTranslation()
  const id = useId()
  const ascId = `${id}-asc`
  const descId = `${id}-desc`

  return (
    <div className="flex flex-col gap-2">
      <Label>{label ?? t('journal.sort_order')}</Label>
      <RadioGroup
        className="flex flex-row gap-6"
        value={value}
        onValueChange={(next) => onChange(next as SortOrder)}
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem id={ascId} value="asc" />
          <Label htmlFor={ascId}>{t('web.sort.asc')}</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem id={descId} value="desc" />
          <Label htmlFor={descId}>{t('web.sort.desc')}</Label>
        </div>
      </RadioGroup>
    </div>
  )
}
