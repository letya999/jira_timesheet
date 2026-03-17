import * as React from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterToggleButtonProps {
  isOpen: boolean;
  showLabel?: string;
  hideLabel?: string;
}

export const FilterToggleButton = React.forwardRef<
  HTMLButtonElement,
  FilterToggleButtonProps & React.ComponentPropsWithoutRef<typeof Button>
>(function FilterToggleButton(
  {
    isOpen,
    showLabel = "Show Filters",
    hideLabel = "Hide Filters",
    ...props
  },
  ref
) {
  return (
    <Button ref={ref} variant="outline" size="sm" className="gap-2" {...props}>
      <Filter className="h-4 w-4" />
      {isOpen ? hideLabel : showLabel}
    </Button>
  );
});
