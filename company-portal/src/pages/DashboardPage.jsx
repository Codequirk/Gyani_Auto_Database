import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { companyPortalService, assignmentService, autoService } from '../services/api';
import { Card, Button, LoadingSpinner, Badge } from '../components/UI';
import { computeDaysRemaining, formatDate, getStatusBadgeColor } from '../utils/helpers';
import Navbar from '../components/Navbar';

const DashboardPage = () => {
  const { isAuthenticated, admin } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [prebookedAssignments, setPrebookedAssignments] = useState([]);
  const [priorityAssignments, setPriorityAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedList, setExpandedList] = useState(false);
  const [allAutos, setAllAutos] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [dismissedNotifications, setDismissedNotifications] = useState(() => {
    const saved = localStorage.getItem('dismissedRejections');
    return saved ? JSON.parse(saved) : [];
  });

  const handleDismissNotification = (requestId) => {
    const updated = [...dismissedNotifications, requestId];
    setDismissedNotifications(updated);
    localStorage.setItem('dismissedRejections', JSON.stringify(updated));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get company_id from auth context
        const companyId = admin?.id;
        if (!companyId) {
          setError('Company ID not found');
          setLoading(false);
          return;
        }

        // Fetch dashboard data for this company
        const dashboardRes = await companyPortalService.getDashboard(companyId);
        setSummary(dashboardRes.data.summary);
        setActiveAssignments(dashboardRes.data.active_assignments || []);
        setPrebookedAssignments(dashboardRes.data.prebooked_assignments || []);
        setPriorityAssignments(dashboardRes.data.priority_assignments || []);

        // Fetch company's own requests (pending and rejected)
        try {
          const ticketsRes = await api.get('/company-tickets/company/my-requests');
          const allTickets = ticketsRes.data || [];
          const pending = allTickets.filter(ticket => ticket.ticket_status === 'PENDING');
          const rejected = allTickets.filter(ticket => ticket.ticket_status === 'REJECTED');
          setPendingRequests(pending);
          setRejectedRequests(rejected);
        } catch (ticketsErr) {
          console.error('Error fetching requests:', ticketsErr);
          // Don't fail dashboard if requests fetch fails
        }

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

      // Set up auto-refresh every 10 seconds to catch deleted assignments
      const intervalId = setInterval(fetchData, 10000);
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, admin, expandedList]);

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

        {/* Pending & Rejected Requests Section */}
        <div className="mb-8 space-y-3">
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1">
                      <span className="text-blue-600 text-xl mr-3">⏳</span>
                      <div className="flex-1">
                        <p className="font-semibold text-blue-900">
                          Your {request.autos_required > 0 ? 'Auto Request' : 'Company Registration'} is Pending
                        </p>
                        <p className="text-blue-800 text-sm mt-1">
                          Waiting for admin approval...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rejected Requests */}
          {rejectedRequests.length > 0 && (
            <div className="space-y-3">
              {rejectedRequests.map((request) => {
                // Skip if this notification has been dismissed
                if (dismissedNotifications.includes(request.id)) {
                  return null;
                }

                return (
                  <div key={request.id} className="bg-red-50 border border-red-300 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1">
                        <span className="text-red-600 text-xl mr-3">ℹ️</span>
                        <div className="flex-1">
                          <p className="font-semibold text-red-900">
                            Your {request.autos_required > 0 ? 'Auto Request' : 'Company Registration'} was rejected
                          </p>
                          <p className="text-red-800 text-sm mt-1">
                            <strong>Reason:</strong> {request.admin_notes || request.rejection_reason || 'No reason provided'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDismissNotification(request.id)}
                        className="ml-4 text-red-600 hover:text-red-800 text-2xl leading-none"
                        title="Close notification"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm font-medium">Total Assigned</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{summary?.total_assignments || 0}</p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm font-medium">Active</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{activeAssignments.length}</p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm font-medium">Prebooked</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">{prebookedAssignments.length}</p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 text-sm font-medium">Priority (2 days)</p>
              <p className="text-4xl font-bold text-orange-600 mt-2">{priorityAssignments.length}</p>
            </div>
          </Card>
        </div>

        {/* Priority Autos List */}
        <Card className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Badge variant="danger">PRIORITY</Badge>
            <span className="ml-2">2 Days Remaining</span>
          </h2>
          {priorityAssignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Auto No</th>
                    <th className="px-4 py-2 text-left">Owner</th>
                    <th className="px-4 py-2 text-left">Start Date</th>
                    <th className="px-4 py-2 text-left">End Date</th>
                    <th className="px-4 py-2 text-left">Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityAssignments.map((auto) => (
                    <tr key={auto.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{auto.auto_no}</td>
                      <td className="px-4 py-2">{auto.owner_name}</td>
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

        {/* Active Assignments List */}
        <Card className="mb-8">
          <h2 className="text-xl font-bold mb-4">Active Assignments</h2>
          {activeAssignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Auto No</th>
                    <th className="px-4 py-2 text-left">Owner</th>
                    <th className="px-4 py-2 text-left">Area</th>
                    <th className="px-4 py-2 text-left">Start Date</th>
                    <th className="px-4 py-2 text-left">End Date</th>
                    <th className="px-4 py-2 text-left">Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAssignments.map((auto) => (
                    <tr key={auto.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{auto.auto_no}</td>
                      <td className="px-4 py-2">{auto.owner_name}</td>
                      <td className="px-4 py-2">{auto.area_name}</td>
                      <td className="px-4 py-2">{formatDate(auto.start_date)}</td>
                      <td className="px-4 py-2">{formatDate(auto.end_date)}</td>
                      <td className="px-4 py-2">
                        <Badge className="bg-green-100 text-green-800">{auto.days_remaining} days</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No active assignments</p>
          )}
        </Card>

        {/* Prebooked Assignments List */}
        <Card className="mb-8">
          <h2 className="text-xl font-bold mb-4">Prebooked Assignments</h2>
          {prebookedAssignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Auto No</th>
                    <th className="px-4 py-2 text-left">Owner</th>
                    <th className="px-4 py-2 text-left">Area</th>
                    <th className="px-4 py-2 text-left">Start Date</th>
                    <th className="px-4 py-2 text-left">End Date</th>
                    <th className="px-4 py-2 text-left">Days Until Start</th>
                  </tr>
                </thead>
                <tbody>
                  {prebookedAssignments.map((auto) => (
                    <tr key={auto.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{auto.auto_no}</td>
                      <td className="px-4 py-2">{auto.owner_name}</td>
                      <td className="px-4 py-2">{auto.area_name}</td>
                      <td className="px-4 py-2">{formatDate(auto.start_date)}</td>
                      <td className="px-4 py-2">{formatDate(auto.end_date)}</td>
                      <td className="px-4 py-2">
                        <Badge className="bg-purple-100 text-purple-800">{auto.days_remaining} days</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No prebooked assignments</p>
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
                    <tr key={auto.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{auto.auto_no}</td>
                      <td className="px-4 py-2">{auto.owner_name}</td>
                      <td className="px-4 py-2">{auto.area_name}</td>
                      <td className="px-4 py-2">
                        <Badge variant={auto.status === 'ACTIVE' ? 'primary' : 'default'}>
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
