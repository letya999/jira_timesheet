import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ListPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  className?: string;
}

export function ListPagination({
  page,
  pageSize,
  total,
  itemLabel,
  onPageChange,
  className,
}: ListPaginationProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className={cn("flex items-center justify-between gap-3 border-t pt-4", className)}>
      <p className="text-sm text-muted-foreground">
        Showing {from}-{to} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={() => onPageChange(1)} disabled={page <= 1}>
          <span className="sr-only">{t("web.pagination.go_first")}</span>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
          <span className="sr-only">{t("web.pagination.go_prev")}</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 text-sm font-medium">
          {t("common.page")} {page} {t("common.of")} {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          <span className="sr-only">{t("web.pagination.go_next")}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>
          <span className="sr-only">{t("web.pagination.go_last")}</span>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
