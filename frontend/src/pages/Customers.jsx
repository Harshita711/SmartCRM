import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ArrowUpDown, Users } from 'lucide-react';
import { customerApi } from '../api/endpoints.js';
import Loader from '../components/common/Loader.jsx';
import { EmptyState, ErrorState } from '../components/common/States.jsx';
import Badge from '../components/common/Badge.jsx';
import Pagination from '../components/common/Pagination.jsx';

const SEGMENT_OPTIONS = ['New', 'Active', 'Loyal', 'Premium', 'At Risk', 'Inactive', 'Churned'];

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [filters, setFilters] = useState({ search: '', segment: '', category: '', city: '' });
  const [meta, setMeta] = useState({ cities: [], categories: [], segments: [] });
  const [sort, setSort] = useState({ sortBy: 'createdAt', sortOrder: 'desc' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchCustomers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await customerApi.list({
        page,
        limit: 10,
        search: filters.search,
        segment: filters.segment,
        category: filters.category,
        city: filters.city,
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
      });
      setCustomers(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters, sort]);

  useEffect(() => {
    customerApi.filterMeta().then(({ data }) => setMeta(data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(1), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort]);

  const toggleSort = (field) => {
    setSort((prev) => ({
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search by name, email, or phone..."
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filters.segment}
            onChange={(e) => setFilters((f) => ({ ...f, segment: e.target.value }))}
            className="input-field w-auto"
          >
            <option value="">All Segments</option>
            {(meta.segments.length ? meta.segments : SEGMENT_OPTIONS).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            className="input-field w-auto"
          >
            <option value="">All Categories</option>
            {meta.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filters.city}
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            className="input-field w-auto"
          >
            <option value="">All Cities</option>
            {meta.cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <Loader label="Loading customers..." />
        ) : error ? (
          <ErrorState onRetry={() => fetchCustomers(pagination.page)} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="Try adjusting your search or filters, or seed the database with demo data."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100 dark:border-surface-darkBorder">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort('totalSpend')}>
                      <span className="inline-flex items-center gap-1">Total Spend <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort('totalOrders')}>
                      <span className="inline-flex items-center gap-1">Orders <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort('lastPurchaseDate')}>
                      <span className="inline-flex items-center gap-1">Last Purchase <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="px-4 py-3 font-medium">Segment</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr
                      key={c._id}
                      className="border-b border-gray-50 dark:border-surface-darkBorder/60 hover:bg-gray-50 dark:hover:bg-surface-darkBorder/40 transition cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <Link to={`/customers/${c._id}`} className="font-medium text-gray-800 dark:text-gray-100 hover:text-brand-600">
                          {c.name}
                        </Link>
                        <p className="text-xs text-gray-400">{c.category}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        <p>{c.email}</p>
                        <p className="text-xs text-gray-400">{c.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.location?.city}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">₹{c.totalSpend?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.totalOrders}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3"><Badge value={c.segment} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} onPageChange={fetchCustomers} />
          </>
        )}
      </div>
    </div>
  );
};

export default Customers;
