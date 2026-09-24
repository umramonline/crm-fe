import { Pagination } from "@adminlte/react";

type ListPaginationProps = {
  currentPage: number;
  lastPage: number;
  total?: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
};

export function ListPagination({
  currentPage,
  lastPage,
  total,
  isLoading = false,
  onPageChange,
}: ListPaginationProps) {
  const safeLastPage = Math.max(1, lastPage);
  const safePage = Math.min(Math.max(1, currentPage), safeLastPage);

  return (
    <div
      className={`list-table-footer w-100${isLoading ? " list-table-footer--loading" : ""}`}
    >
      <span className="text-muted small list-table-footer-summary">
        {total !== undefined ? (
          <>
            Toplam <strong>{total}</strong> kayıt
            <span className="mx-1" aria-hidden="true">
              ·
            </span>
          </>
        ) : null}
        Sayfa {safePage} / {safeLastPage}
      </span>
      <Pagination
        page={safePage}
        totalPages={safeLastPage}
        size="sm"
        align="end"
        label="Sayfa navigasyonu"
        siblingCount={1}
        onPageChange={(page) => {
          if (isLoading || page < 1 || page > safeLastPage || page === safePage) {
            return;
          }
          onPageChange(page);
        }}
      />
    </div>
  );
}
