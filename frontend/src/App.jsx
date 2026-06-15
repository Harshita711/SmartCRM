import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Customers from './pages/Customers.jsx';
import CustomerProfile from './pages/CustomerProfile.jsx';
import Orders from './pages/Orders.jsx';
import Segments from './pages/Segments.jsx';
import AIAudienceBuilder from './pages/AIAudienceBuilder.jsx';
import Campaigns from './pages/Campaigns.jsx';
import CampaignDetail from './pages/CampaignDetail.jsx';
import AICampaignGenerator from './pages/AICampaignGenerator.jsx';
import Analytics from './pages/Analytics.jsx';
import MarketingAgent from './pages/MarketingAgent.jsx';
import NotFound from './pages/NotFound.jsx';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerProfile />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/segments" element={<Segments />} />
        <Route path="/audience-builder" element={<AIAudienceBuilder />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/campaign-generator" element={<AICampaignGenerator />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/agent" element={<MarketingAgent />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
