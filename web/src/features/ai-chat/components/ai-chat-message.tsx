import { useState } from 'react'
import { ChatMessage } from '../schemas'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Bot, User, ChevronDown, ChevronUp, Database } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'

interface AiChatMessageProps {
  message: ChatMessage
}

type TableRow = Record<string, unknown>

export function AiChatMessage({ message }: AiChatMessageProps) {
  const { t } = useTranslation()
  const isAssistant = message.role === 'assistant'
  const [isSqlOpen, setIsSqlOpen] = useState(false)
  const tableRows: TableRow[] = message.data ?? []

  // Dynamically generate columns for data table if data exists
  const columns: ColumnDef<TableRow>[] = tableRows.length > 0 && tableRows[0]
    ? Object.keys(tableRows[0]).map((key) => ({
        accessorKey: key as keyof TableRow,
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      }))
    : []

  return (
    <div className={cn(
      "flex w-full gap-4 py-4",
      isAssistant ? "flex-row" : "flex-row-reverse"
    )}>
      <div className={cn(
        "flex size-8 shrink-0 select-none items-center justify-center rounded-md border shadow",
        isAssistant ? "bg-primary text-primary-foreground" : "bg-background"
      )}>
        {isAssistant ? <Bot className="size-5" /> : <User className="size-5" />}
      </div>
      
      <div className={cn(
        "flex flex-col gap-2 max-w-[80%]",
        isAssistant ? "items-start" : "items-end"
      )}>
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-semibold">
            {isAssistant ? t('web.ai_chat.assistant') : t('web.ai_chat.you')}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {format(message.createdAt, 'HH:mm')}
          </span>
        </div>

        <Card className={cn(
          "rounded-2xl",
          isAssistant ? "rounded-tl-none bg-muted/50" : "rounded-tr-none bg-primary text-primary-foreground"
        )}>
          <CardContent className="p-3 text-sm whitespace-pre-wrap">
            {message.content || (isAssistant && !message.sql && t('web.ai_chat.thinking'))}
          </CardContent>
        </Card>

        {isAssistant && message.sql && (
          <Collapsible
            open={isSqlOpen}
            onOpenChange={setIsSqlOpen}
            className="w-full space-y-2"
          >
            <div className="flex items-center justify-between space-x-4 px-1">
              <h4 className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                <Database className="size-3" /> {t('web.ai_chat.sql_query')}
              </h4>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {isSqlOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  <span className="sr-only">{t('web.ai_chat.toggle_sql')}</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-2">
              <pre className="p-3 rounded-md bg-muted text-[10px] font-mono overflow-x-auto border">
                {message.sql}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}

        {isAssistant && tableRows.length > 0 && (
          <div className="w-full mt-2 border rounded-md overflow-hidden bg-background">
            <DataTable 
              columns={columns} 
              data={tableRows}
            />
          </div>
        )}
      </div>
    </div>
  )
}
