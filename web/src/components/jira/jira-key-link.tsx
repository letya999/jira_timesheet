import * as React from "react"
import { ExternalLink, Ticket } from "lucide-react"
import { cn } from "@/lib/utils"
import { Typography } from "@/components/ui/typography"

export interface JiraKeyLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  issueKey: string
  baseUrl?: string
  showIcon?: boolean
}

const JiraKeyLink = React.forwardRef<HTMLAnchorElement, JiraKeyLinkProps>(
  ({ className, issueKey, baseUrl, showIcon = true, children, ...props }, ref) => {
    const href = baseUrl ? `${baseUrl}/browse/${issueKey}` : undefined

    const content = (
      <>
        {showIcon && <Ticket className="size-3.5 text-[#0052CC] shrink-0" />}
        <Typography variant="mono" as="span" className="text-sm">
          {issueKey}
        </Typography>
        {href && (
          <ExternalLink className="size-3 opacity-0 group-hover/jira-link:opacity-50 transition-opacity" />
        )}
        {children}
      </>
    )

    if (!href) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-medium text-muted-foreground",
            className
          )}
        >
          {content}
        </span>
      )
    }

    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "inline-flex items-center gap-1.5 font-medium text-primary hover:underline group/jira-link",
          className
        )}
        {...props}
      >
        {content}
      </a>
    )
  }
)
JiraKeyLink.displayName = "JiraKeyLink"

export { JiraKeyLink }
