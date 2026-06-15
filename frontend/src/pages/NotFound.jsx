import { Link } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-surface-subtle dark:bg-surface-dark text-center px-4">
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center mb-4">
      <Zap className="w-7 h-7 text-white" />
    </div>
    <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">404</h1>
    <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">This page doesn't exist in your workspace.</p>
    <Link to="/" className="btn-primary">
      <ArrowLeft className="w-4 h-4" /> Back to dashboard
    </Link>
  </div>
);

export default NotFound;
