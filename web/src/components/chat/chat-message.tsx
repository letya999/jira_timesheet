import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { JiraKeyLink } from "@/components/jira/jira-key-link"

export interface ChatMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role: "user" | "assistant" | "system"
  content: string
  avatarUrl?: string
  username?: string
}

export function ChatMessage({
  className,
  role,
  content,
  avatarUrl,
  username,
  ...props
}: ChatMessageProps) {
  const isAssistant = role === "assistant"

  return (
    <div
      className={cn(
        "flex w-full gap-3 py-4",
        isAssistant ? "flex-row" : "flex-row-reverse",
        className
      )}
      {...props}
    >
      <Avatar className="size-8 border shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} />}
        <AvatarFallback className={isAssistant ? "bg-primary text-primary-foreground" : "bg-muted"}>
          {username ? username.substring(0, 2).toUpperCase() : role.substring(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "flex flex-col max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
          isAssistant
            ? "bg-muted text-foreground rounded-tl-none"
            : "bg-primary text-primary-foreground rounded-tr-none"
        )}
      >
        <div className={cn(
          "prose prose-sm dark:prose-invert max-w-none",
          isAssistant ? "" : "text-primary-foreground prose-p:text-primary-foreground prose-headings:text-primary-foreground prose-strong:text-primary-foreground"
        )}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // @ts-ignore
              a: ({ node, children, ...props }) => {
                const text = children?.toString() || ""
                if (/^[A-Z]+-\d+$/.test(text)) {
                  return (
                    <JiraKeyLink 
                      issueKey={text} 
                      className={cn(!isAssistant && "text-white underline")} 
                      baseUrl={props.href?.includes("/browse/") ? props.href.split("/browse/")[0] : undefined}
                    />
                  )
                }
                return <a {...props} className={cn(props.className, !isAssistant && "text-white underline")}>{children}</a>
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
ChatMessage.displayName = "ChatMessage"
