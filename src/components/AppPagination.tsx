"use client";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "~/components/ui/pagination";

interface AppPaginationProps {
  total: number;
  page: number;
  limit: number;
  size: number;
  onPageChange: (page: number) => void;
  render?: (page: number) => React.ReactNode;
}

export function AppPagination(props: AppPaginationProps) {
  const totalPage = Math.ceil(props.total / props.limit);

  // size에 맞게 현재 페이지를 중간에 배치하여 페이지 번호들을 계산
  const getVisiblePages = () => {
    const { page, size } = props;
    const half = Math.floor(size / 2);

    let start = Math.max(1, page - half);
    const end = Math.min(totalPage, start + size - 1);

    // 끝에서 size만큼 확보하지 못하면 시작점을 조정
    if (end - start + 1 < size) {
      start = Math.max(1, end - size + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };

  const pageNumbers = getVisiblePages();

  function handlePageChange(newPage: number) {
    props.onPageChange(newPage);
  }

  return (
    <Pagination>
      <PaginationContent className="flex-wrap justify-center">
        {pageNumbers.map((number) => (
          <PaginationItem key={number} onClick={() => handlePageChange(number)}>
            {props.render ? (
              props.render(number)
            ) : (
              <PaginationLink isActive={number === props.page}>
                {number}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
      </PaginationContent>
    </Pagination>
  );
}
