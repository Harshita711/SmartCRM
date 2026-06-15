import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Tag, TrendingUp, ShoppingBag, Calendar } from 'lucide-react';
import { customerApi } from '../api/endpoints.js';
import Loader from '../components/common/Loader.jsx';
import { ErrorState, EmptyState } from '../components/common/States.jsx';
import Badge from '../components/common/Badge.jsx';

const CustomerProfile = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await customerApi.getById(id);
      setCustomer(data.data.customer);
      setOrders(data.data.orders);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Loader fullHeight label="Loading customer profile..." />;
  if (error || !customer) return <ErrorState onRetry={load} />;

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600">
        <ArrowLeft className="w-4 h-4" /> Back to customers
      </Link>

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-xl font-display font-semibold">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-display font-semibold text-xl text-gray-900 dark:text-white">{customer.name}</h2>
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {customer.email}</span>
                <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {customer.phone}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {customer.location?.city}, {customer.location?.state}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge value={customer.segment} />
            <span className="badge bg-gray-100 text-gray-600 dark:bg-surface-darkBorder dark:text-gray-300">
              <Tag className="w-3 h-3" /> {customer.category}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Spend</p>
          <p className="text-2xl font-display font-semibold mt-1.5 text-gray-900 dark:text-white">₹{customer.totalSpend?.toLocaleString()}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Orders</p>
          <p className="text-2xl font-display font-semibold mt-1.5 text-gray-900 dark:text-white">{customer.totalOrders}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lead Score</p>
          <div className="flex items-center gap-3 mt-1.5">
            <p className="text-2xl font-display font-semibold text-gray-900 dark:text-white">{customer.leadScore}</p>
            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-surface-darkBorder overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${customer.leadScore}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-brand-500" /> Purchase History
        </h3>
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" description="This customer hasn't placed any orders." />
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o._id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-surface-darkBorder">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {o.items.map((i) => i.productName).join(', ')}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" /> {new Date(o.orderDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-800 dark:text-gray-100">₹{o.amount.toLocaleString()}</p>
                  <Badge value={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerProfile;
