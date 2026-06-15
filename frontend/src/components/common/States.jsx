import { Inbox, AlertTriangle } from 'lucide-react';

export const EmptyState = ({ icon: Icon = Inbox, title = 'Nothing here yet', description = '', action = null }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
    <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-surface-darkBorder flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-brand-500" />
    </div>
    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
    {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState = ({ title = 'Something went wrong', description = 'Please try again in a moment.', onRetry }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
    <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-4">
      <AlertTriangle className="w-6 h-6 text-rose-500" />
    </div>
    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{description}</p>
    {onRetry && (
      <button onClick={onRetry} className="btn-secondary mt-4">
        Try again
      </button>
    )}
  </div>
);
