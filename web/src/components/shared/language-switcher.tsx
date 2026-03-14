import { useTranslation } from "react-i18next"
import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface LanguageSwitcherProps {
  variant?: "compact" | "full"
}

export function LanguageSwitcher({ variant = "full" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()

  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
  }

  const currentLanguage = i18n.language || "en"

  if (variant === "compact") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toggleLanguage(currentLanguage === "en" ? "ru" : "en")}
        title={currentLanguage === "en" ? "Switch to Russian" : "Переключить на английский"}
      >
        <span className="text-xs font-bold uppercase">{currentLanguage.substring(0, 2)}</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Languages className="size-4" />
          <span className="uppercase">{currentLanguage.substring(0, 2)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => toggleLanguage("en")}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggleLanguage("ru")}>
          Русский
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
