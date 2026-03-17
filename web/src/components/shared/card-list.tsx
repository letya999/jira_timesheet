import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ListPagination } from "./list-pagination";
import { cn } from "@/lib/utils";

interface CardListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  isLoading?: boolean;
  isFetching?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  itemLabel?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  className?: string;
  listClassName?: string;
  skeletonCount?: number;
  skeletonHeight?: string;
  showPagination?: boolean;
}

export function CardList<T>({
  items,
  renderItem,
  isLoading,
  isFetching,
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  itemLabel = "items",
  emptyMessage,
  loadingMessage,
  className,
  listClassName,
  skeletonCount = 3,
  skeletonHeight = "h-24",
  showPagination = true,
}: CardListProps<T>) {
  const { t } = useTranslation();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={cn("flex flex-col gap-4", listClassName)}>
          {loadingMessage && <div className="text-sm text-muted-foreground">{loadingMessage}</div>}
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <Skeleton key={i} className={cn("w-full rounded-md", skeletonHeight)} />
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {emptyMessage || t("common.not_found")}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className={cn("flex flex-col gap-4", listClassName)}>
        {isFetching && <div className="text-sm text-muted-foreground animate-pulse">{t("common.loading")}...</div>}
        {items.map((item, index) => (
          <div key={index}>{renderItem(item)}</div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {renderContent()}
      
      {showPagination && total > 0 && onPageChange && (
        <ListPagination
          page={page}
          pageSize={pageSize}
          total={total}
          itemLabel={itemLabel}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
