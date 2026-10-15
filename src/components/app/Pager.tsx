import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Client-side paging for long tables; resets to the first page when the list changes length
export function usePaged<T>(rows: T[], pageSize = 25) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => setPage(0), [rows.length]);
  const current = Math.min(page, pages - 1);
  return { page: current, pages, setPage, slice: rows.slice(current * pageSize, current * pageSize + pageSize), pageSize, total: rows.length };
}

export const Pager = ({ page, pages, setPage, pageSize, total }: { page: number; pages: number; setPage: (p: number) => void; pageSize: number; total: number }) => {
  if (total <= pageSize) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, from + pageSize - 1);
  return (
    <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5 text-xs text-muted-foreground print:hidden">
      <span>{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
        <span className="px-1">Page {page + 1} of {pages}</span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};
