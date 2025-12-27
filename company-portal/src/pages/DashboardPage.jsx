import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardService, assignmentService, autoService } from '../services/api';
import { Card, Button, LoadingSpinner, Badge } from '../components/UI';
import { computeDaysRemaining, formatDate, getStatusBadgeColor } from '../utils/helpers';
import Navbar from '../components/Navbar';

const DashboardPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [idleAutos, setIdleAutos] = useState([]);
  const [priorityAutos, setPriorityAutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedList, setExpandedList] = useState(false);
  const [allAutos, setAllAutos] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const summaryRes = await dashboardService.getSummary();
        setSummary(summaryRes.data.summary);
        setIdleAutos(summaryRes.data.idle_autos);
        setPriorityAutos(summaryRes.data.priority_autos);

        if (expandedList) {
          try {
            const autosRes = await autoService.list({});
            const autosWithDays = autosRes.data.map((auto) => ({
              ...auto,
              days_remaining: auto.days_remaining || null,
              current_company: auto.current_company || null,
            }));
            setAllAutos(autosWithDays);
          } catch (autosErr) {
            console.error('Error fetching all autos:', autosErr);
            setError('Failed to load all autos');
          }
        }

        setError('');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, expandedList]);

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm font-medium">Idle</p>
              <p className="text-4xl font-bold text-yellow-600 mt-2">{summary?.idle || 0}</p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm font-medium">Pre-assigned</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">{summary?.pre_assigned || 0}</p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm font-medium">Assigned</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{summary?.assigned || 0}</p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm font-medium">Priority (2 days)</p>
              <p className="text-4xl font-bold text-orange-600 mt-2">{summary?.priority_2days || 0}</p>
            </div>
          </Card>
        </div>

        {/* Priority Autos List */}
        <Card className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Badge variant="danger">PRIORITY</Badge>
            <span className="ml-2">2 Days Remaining</span>
          </h2>
          {priorityAutos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Auto No</th>
                    <th className="px-4 py-2 text-left">Owner</th>
                    <th className="px-4 py-2 text-left">Company</th>
                    <th className="px-4 py-2 text-left">Start Date</th>
                    <th className="px-4 py-2 text-left">End Date</th>
                    <th className="px-4 py-2 text-left">Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityAutos.map((auto) => (
                    <tr key={auto.id} className="border-t hover:bg-gray-50 cursor-pointer" onDoubleClick={() => navigate(`/autos/${auto.id}`)}>
                      <td className="px-4 py-2 font-medium">{auto.auto_no}</td>
                      <td className="px-4 py-2">{auto.owner_name}</td>
                      <td className="px-4 py-2">{auto.company_name || '-'}</td>
                      <td className="px-4 py-2">{formatDate(auto.start_date)}</td>
                      <td className="px-4 py-2">{formatDate(auto.end_date)}</td>
                      <td className="px-4 py-2">
                        <Badge className={auto.days_remaining <= 2 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                          {auto.days_remaining} days
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No priority autos</p>
          )}
        </Card>

        {/* Idle Slots List */}
        <Card className="mb-8">
          <h2 className="text-xl font-bold mb-4">Empty Slots</h2>
          {idleAutos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Auto No</th>
                    <th className="px-4 py-2 text-left">Owner</th>
                    <th className="px-4 py-2 text-left">Area</th>
                    <th className="px-4 py-2 text-left">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {idleAutos.map((auto) => (
                    <tr key={auto.id} className="border-t hover:bg-gray-50 cursor-pointer" onDoubleClick={() => navigate(`/autos/${auto.id}`)}>
                      <td className="px-4 py-2 font-medium">{auto.auto_no}</td>
                      <td className="px-4 py-2">{auto.owner_name}</td>
                      <td className="px-4 py-2">{auto.area_name}</td>
                      <td className="px-4 py-2">{formatDate(auto.last_updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No idle autos</p>
          )}
        </Card>

        {/* Expandable Autos List */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">All Autos</h2>
            <Button
              onClick={() => setExpandedList(!expandedList)}
              variant={expandedList ? 'secondary' : 'primary'}
            >
              {expandedList ? '▼ Collapse' : '+ Expand'}
            </Button>
          </div>

          {expandedList && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Auto No</th>
                    <th className="px-4 py-2 text-left">Owner</th>
                    <th className="px-4 py-2 text-left">Area</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Company</th>
                    <th className="px-4 py-2 text-left">Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  {allAutos.map((auto) => (
                    <tr key={auto.id} className="border-t hover:bg-gray-50 cursor-pointer" onDoubleClick={() => navigate(`/autos/${auto.id}`)}>
                      <td className="px-4 py-2 font-medium">{auto.auto_no}</td>
                      <td className="px-4 py-2">{auto.owner_name}</td>
                      <td className="px-4 py-2">{auto.area_name}</td>
                      <td className="px-4 py-2">
                        <Badge variant={auto.status === 'ASSIGNED' ? 'primary' : 'default'}>
                          {auto.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">{auto.current_company || '-'}</td>
                      <td className="px-4 py-2">
                        {auto.days_remaining !== null ? `${auto.days_remaining} days` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
