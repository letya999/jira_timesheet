import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Typography } from "@/components/ui/typography"

interface ReportSummaryCardProps {
  title: string
  period: string
  totalHours: number
  capexHours: number
  opexHours: number
  className?: string
}

export function ReportSummaryCard({
  title,
  period,
  totalHours,
  capexHours,
  opexHours,
  className,
}: ReportSummaryCardProps) {
  const capexPercent = totalHours > 0 ? (capexHours / totalHours) * 100 : 0
  const opexPercent = totalHours > 0 ? (opexHours / totalHours) * 100 : 0

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{period}</p>
          </div>
          <div className="text-right">
            <Typography variant="h3" className="font-bold">{totalHours}h</Typography>
            <p className="text-xs text-muted-foreground uppercase font-medium">Total logged</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium">CapEx</span>
              <span className="text-muted-foreground">{capexHours}h ({capexPercent.toFixed(1)}%)</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${capexPercent}%` }} 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium">OpEx</span>
              <span className="text-muted-foreground">{opexHours}h ({opexPercent.toFixed(1)}%)</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-500" 
                style={{ width: `${opexPercent}%` }} 
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
