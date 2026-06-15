import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ page, totalPages, total, limit, onPageChange }) => {
  if (!total) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-surface-darkBorder text-sm">
      <p className="text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium text-gray-700 dark:text-gray-200">{start}-{end}</span> of{' '}
        <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          className="btn-ghost px-2 py-1.5 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-gray-600 dark:text-gray-300 font-medium px-2">
          {page} / {totalPages || 1}
        </span>
        <button
          className="btn-ghost px-2 py-1.5 disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
