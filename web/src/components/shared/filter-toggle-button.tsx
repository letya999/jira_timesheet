import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterToggleButtonProps {
  isOpen: boolean;
  showLabel?: string;
  hideLabel?: string;
}

export function FilterToggleButton({
  isOpen,
  showLabel = "Show Filters",
  hideLabel = "Hide Filters",
}: FilterToggleButtonProps) {
  return (
    <Button variant="outline" size="sm" className="gap-2">
      <Filter className="h-4 w-4" />
      {isOpen ? hideLabel : showLabel}
    </Button>
  );
}
