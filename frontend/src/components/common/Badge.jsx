const COLOR_MAP = {
  // Communication / campaign statuses
  PENDING: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  SENT: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300',
  DELIVERED: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
  FAILED: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
  OPENED: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
  READ: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300',
  CLICKED: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
  CONVERTED: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-300',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  scheduled: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
  running: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300',
  completed: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
  paused: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300',
  failed: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  cancelled: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
  refunded: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
  // Customer segments
  New: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300',
  Active: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
  Loyal: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
  Premium: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300',
  'At Risk': 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
  Inactive: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300',
  Churned: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
};

const Badge = ({ value, className = '' }) => {
  const colorClass = COLOR_MAP[value] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  return <span className={`badge ${colorClass} ${className}`}>{value}</span>;
};

export default Badge;
