import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, DollarSign, Hash, TrendingUp } from 'lucide-react';
import { orderApi } from '../api/endpoints.js';
import Loader from '../components/common/Loader.jsx';
import { EmptyState, ErrorState } from '../components/common/States.jsx';
import Badge from '../components/common/Badge.jsx';
import Pagination from '../components/common/Pagination.jsx';
import StatCard from '../components/common/StatCard.jsx';

const STATUS_OPTIONS = ['pending', 'completed', 'cancelled', 'refunded'];

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await orderApi.list({ page, limit: 10, search, status });
      setOrders(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    orderApi.summary().then(({ data }) => setSummary(data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchOrders(1), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Hash} label="Total Orders" value={summary.totalOrders.toLocaleString()} accent="brand" />
          <StatCard icon={DollarSign} label="Total Revenue" value={`₹${Math.round(summary.totalRevenue).toLocaleString()}`} accent="emerald" />
          <StatCard icon={TrendingUp} label="Avg Order Value" value={`₹${Math.round(summary.avgOrderValue).toLocaleString()}`} accent="amber" />
        </div>
      )}

      <div className="card p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name or email..."
            className="input-field pl-10"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-auto">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Loader label="Loading orders..." />
        ) : error ? (
          <ErrorState onRetry={() => fetchOrders(pagination.page)} />
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders found" description="Try adjusting your search or filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100 dark:border-surface-darkBorder">
                    <th className="px-4 py-3 font-medium">Order ID</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Items</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o._id} className="border-b border-gray-50 dark:border-surface-darkBorder/60 hover:bg-gray-50 dark:hover:bg-surface-darkBorder/40 transition">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o._id.slice(-8)}</td>
                      <td className="px-4 py-3">
                        <Link to={`/customers/${o.customer._id}`} className="font-medium text-gray-800 dark:text-gray-100 hover:text-brand-600">
                          {o.customer.name}
                        </Link>
                        <p className="text-xs text-gray-400">{o.customer.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                        {o.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">₹{o.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(o.orderDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><Badge value={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} onPageChange={fetchOrders} />
          </>
        )}
      </div>
    </div>
  );
};

export default Orders;
