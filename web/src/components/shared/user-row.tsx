import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { UserResponse } from "@/api/generated/types.gen"

interface UserRowProps {
  user: UserResponse
  className?: string
  showStatus?: boolean
}

export function UserRow({
  user,
  className,
  showStatus = true,
}: UserRowProps) {
  const initials = user.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || user.email?.[0]?.toUpperCase() || "?"

  return (
    <div className={cn("flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors", className)}>
      <Avatar className="size-9 border">
        <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.full_name || user.email} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium leading-none truncate">
          {user.full_name || user.email}
        </span>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground truncate">
            {user.role || "User"}
          </span>
          {user.org_unit_id && (
            <>
              <span className="text-muted-foreground text-[10px]">•</span>
              <span className="text-xs text-muted-foreground truncate">
                Dept #{user.org_unit_id}
              </span>
            </>
          )}
        </div>
      </div>
      {showStatus && (
        <Badge 
          variant={user.is_active ? "default" : "secondary"}
          className={cn("text-[10px] h-5 px-1.5 uppercase", user.is_active ? "bg-success hover:bg-success/90" : "")}
        >
          {user.is_active ? "Active" : "Inactive"}
        </Badge>
      )}
    </div>
  )
}
