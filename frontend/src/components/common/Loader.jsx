import { Loader2 } from 'lucide-react';

const Loader = ({ label = 'Loading...', fullHeight = false }) => (
  <div className={`flex flex-col items-center justify-center gap-3 text-gray-400 ${fullHeight ? 'h-64' : 'py-12'}`}>
    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
    <p className="text-sm">{label}</p>
  </div>
);

export default Loader;
