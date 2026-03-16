import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Calendar, Clock, Check, X } from "lucide-react"
import { useTranslation } from "react-i18next"

interface ApprovalCardProps {
  id: number
  userName: string
  userEmail: string
  startDate: string
  endDate: string
  totalHours: number
  status: string
  onApprove: (id: number) => Promise<void>
  onReject: (id: number) => Promise<void>
  className?: string
}

export function ApprovalCard({
  id,
  userName,
  userEmail,
  startDate,
  endDate,
  totalHours,
  status,
  onApprove,
  onReject,
  className,
}: ApprovalCardProps) {
  const { t } = useTranslation()
  const [isProcessing, setIsProcessing] = useState(false)
  const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase()

  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      await onApprove(id)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    setIsProcessing(true)
    try {
      await onReject(id)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Avatar className="size-10 border">
          <AvatarImage src={`https://avatar.vercel.sh/${userEmail}.png`} alt={userName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1 min-w-0">
          <CardTitle className="text-sm font-bold">{userName}</CardTitle>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
        </div>
        <Badge variant="outline" className="uppercase text-xs">
          {status}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4 pt-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="size-4" />
            <span>{startDate} - {endDate}</span>
          </div>
          <div className="flex items-center gap-2 font-bold">
            <Clock className="size-4" />
            <span>{totalHours}{t('common.hours_short')}</span>
          </div>
        </div>
      </CardContent>
      {status === 'SUBMITTED' && (
        <CardFooter className="flex justify-end gap-2 pt-2 border-t mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-destructive hover:text-destructive gap-1"
            onClick={handleReject}
            disabled={isProcessing}
          >
            <X className="size-4" />
            {t('common.reject')}
          </Button>
          <Button 
            size="sm" 
            className="bg-success hover:bg-success/90 gap-1"
            onClick={handleApprove}
            disabled={isProcessing}
          >
            <Check className="size-4" />
            {t('common.approve')}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
