import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyAuth } from '../context/CompanyAuthContext';
import api from '../services/api';
import { autoService } from '../services/api';
import { Card, Button, Badge, LoadingSpinner, ErrorAlert, Modal, Input } from '../components/UI';
import { computeDaysRemaining, formatDate } from '../utils/helpers';
import CompanyNavbar from '../components/CompanyNavbar';
import CompanyPortalCalendar from '../components/CompanyPortalCalendar';

const CompanyDashboardPage = () => {
  const { company, isAuthenticated, logout, refreshCompanyStatus } = useCompanyAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [areas, setAreas] = useState([]);
  const [ticketData, setTicketData] = useState({
    autos_required: '',
    days_required: '',
    start_date: '',
    area_id: '',
    notes: '',
  });
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState('');
  const [availableAutosCount, setAvailableAutosCount] = useState(null);
  const [fetchingAvailableCount, setFetchingAvailableCount] = useState(false);
  const [selectedAreaPinCode, setSelectedAreaPinCode] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedAreaForCalendar, setSelectedAreaForCalendar] = useState('');

  // Fetch areas when either modal is shown
  useEffect(() => {
    if ((showTicketModal || showCalendarModal) && areas.length === 0) {
      const fetchAreas = async () => {
        try {
          const response = await api.get('/areas');
          setAreas(response.data || []);
        } catch (err) {
          console.error('Failed to load areas:', err);
        }
      };
      fetchAreas();
    }
  }, [showTicketModal, showCalendarModal, areas.length]);

  // Function to fetch available autos count when area and dates change
  const fetchAvailableAutosCount = async () => {
    if (!ticketData.area_id || !ticketData.start_date || !ticketData.days_required) {
      setAvailableAutosCount(null);
      return;
    }

    // Calculate end date
    const startDate = new Date(ticketData.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + parseInt(ticketData.days_required) - 1);
    const endDateStr = endDate.toISOString().split('T')[0];

    setFetchingAvailableCount(true);
    try {
      const response = await autoService.getAvailableCount(
        ticketData.area_id,
        ticketData.start_date,
        endDateStr
      );
      setAvailableAutosCount(response.data.available_count);
    } catch (err) {
      console.error('Failed to fetch available autos count:', err);
      setAvailableAutosCount(null);
    } finally {
      setFetchingAvailableCount(false);
    }
  };

  // Watch for changes in area, start_date, and days_required
  useEffect(() => {
    fetchAvailableAutosCount();
  }, [ticketData.area_id, ticketData.start_date, ticketData.days_required]);

  // Update selected area pin code when area changes
  useEffect(() => {
    if (ticketData.area_id && areas.length > 0) {
      const selectedArea = areas.find(a => a.id === ticketData.area_id);
      setSelectedAreaPinCode(selectedArea?.pin_code || 'N/A');
    } else {
      setSelectedAreaPinCode('');
    }
  }, [ticketData.area_id, areas]);

  useEffect(() => {
    if (!isAuthenticated || !company) {
      navigate('/company/login');
      return;
    }

    const fetchDashboard = async () => {
      try {
        const response = await api.get(`/company-portal/${company.id}/dashboard`);
        setDashboard(response.data);
        setError('');
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to load dashboard';
        const status = err.response?.data?.status;
        
        if (status === 'PENDING_APPROVAL') {
          setError('⏳ Your company registration is pending admin approval. Please check back soon!');
        } else if (status === 'REJECTED') {
          setError('❌ Your company registration has been rejected. Please contact admin.');
        } else if (status === 'INACTIVE') {
          setError('Your account has been deactivated. Please contact admin.');
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [isAuthenticated, company, navigate]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setTicketError('');
    setTicketLoading(true);

    try {
      if (!ticketData.autos_required || !ticketData.days_required || !ticketData.start_date || !ticketData.area_id) {
        setTicketError('Please fill all required fields (including Area)');
        setTicketLoading(false);
        return;
      }

      await api.post('/company-tickets/', {
        company_id: company.id,
        autos_required: parseInt(ticketData.autos_required),
        days_required: parseInt(ticketData.days_required),
        start_date: ticketData.start_date,
        area_id: ticketData.area_id,
        notes: ticketData.notes,
      });

      setTicketSuccess('Ticket created successfully! Awaiting admin approval.');
      setTicketData({
        autos_required: '',
        days_required: '',
        start_date: '',
        area_id: '',
        notes: '',
      });
      setShowTicketModal(false);

      // Refetch dashboard
      const response = await api.get(`/company-portal/${company.id}/dashboard`);
      setDashboard(response.data);

      setTimeout(() => setTicketSuccess(''), 3000);
    } catch (err) {
      setTicketError(err.response?.data?.error || 'Failed to create ticket');
    } finally {
      setTicketLoading(false);
    }
  };

  if (!isAuthenticated || !company) {
    return <div>Redirecting...</div>;
  }

  if (loading) return <LoadingSpinner />;

  // Show pending approval message if company status is PENDING_APPROVAL
  if (company.status === 'PENDING_APPROVAL' || error.includes('pending admin approval')) {
    const handleCheckStatus = async () => {
      setRefreshing(true);
      try {
        const success = await refreshCompanyStatus();
        if (success) {
          setError('');
          // Retry fetching dashboard
          window.location.reload();
        } else {
          alert('Still pending approval. Please try again later.');
        }
      } catch (err) {
        alert('Failed to check status. Please try again.');
      } finally {
        setRefreshing(false);
      }
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <CompanyNavbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="mt-12">
            <div className="text-center py-16">
              <div className="mb-6 text-6xl">⏳</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Pending Approval</h2>
              <p className="text-gray-600 mb-4">Your company registration is awaiting admin approval</p>
              <p className="text-gray-500 text-sm mb-6">
                We've received your registration request. An admin will review your details and approve your account soon.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  <strong>Company:</strong> {company.name}<br />
                  <strong>Email:</strong> {company.email}<br />
                  <strong>Contact:</strong> {company.contact_person}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={handleCheckStatus}
                  disabled={refreshing}
                  variant="primary"
                >
                  {refreshing ? '⏳ Checking...' : '🔄 Check Approval Status'}
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="secondary"
                >
                  ↻ Refresh Page
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
            <p className="text-gray-600">Company Portal</p>
          </div>
          <Button onClick={() => setShowTicketModal(true)} variant="primary">
            + Raise New Request
          </Button>
        </div>

        {error && error.includes('pending admin approval') ? (
          <div className="mb-8 p-8 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="text-5xl">⏳</div>
              <div>
                <h2 className="text-2xl font-bold text-blue-900 mb-2">Registration Under Review</h2>
                <p className="text-lg text-blue-800 mb-3">Your company registration is being reviewed by our admin team.</p>
                <p className="text-blue-700 mb-4">We're processing your request and will notify you once it's approved. This usually takes 24-48 hours.</p>
                <div className="bg-blue-100 p-3 rounded border border-blue-200 text-sm text-blue-700">
                  <strong>Company:</strong> {company.name}<br />
                  <strong>Email:</strong> {company.email}
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <ErrorAlert message={error} />
        ) : null}
        {ticketSuccess && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {ticketSuccess}
          </div>
        )}

        {/* Summary Cards */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <div className="text-center">
                <p className="text-gray-600 text-sm font-medium">Total Assignments</p>
                <p className="text-4xl font-bold text-blue-600 mt-2">{dashboard.summary.total_assignments}</p>
              </div>
            </Card>

            <Card>
              <div className="text-center">
                <p className="text-gray-600 text-sm font-medium">Active Now</p>
                <p className="text-4xl font-bold text-green-600 mt-2">{dashboard.summary.active_assignments}</p>
              </div>
            </Card>

            <Card>
              <div className="text-center">
                <p className="text-gray-600 text-sm font-medium">Pre-booked</p>
                <p className="text-4xl font-bold text-purple-600 mt-2">{dashboard.summary.prebooked_assignments}</p>
              </div>
            </Card>

            <Card>
              <div className="text-center">
                <p className="text-gray-600 text-sm font-medium">Priority (2 Days)</p>
                <p className="text-4xl font-bold text-orange-600 mt-2">{dashboard.summary.priority_count}</p>
              </div>
            </Card>
          </div>
        )}

        {/* Active Assignments */}
        {dashboard && dashboard.active_assignments.length > 0 && (
          <Card className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Badge variant="success">ACTIVE</Badge>
              <span className="ml-2">Current Assignments</span>
            </h2>
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
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.active_assignments.map((assignment) => (
                    <tr key={assignment.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{assignment.auto_no}</td>
                      <td className="px-4 py-2">{assignment.owner_name}</td>
                      <td className="px-4 py-2">{assignment.area_name}</td>
                      <td className="px-4 py-2">{formatDate(assignment.start_date)}</td>
                      <td className="px-4 py-2">{formatDate(assignment.end_date)}</td>
                      <td className="px-4 py-2">
                        <Badge className={assignment.days_remaining <= 2 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                          {assignment.days_remaining} days
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="success">{assignment.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Pre-booked Assignments */}
        {dashboard && dashboard.prebooked_assignments.length > 0 && (
          <Card className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center">
                <Badge variant="warning">PREBOOKED</Badge>
                <span className="ml-2">Upcoming Assignments</span>
              </h2>
              <Button
                onClick={() => setShowCalendarModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                📅 View Calendar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Auto No</th>
                    <th className="px-4 py-2 text-left">Owner</th>
                    <th className="px-4 py-2 text-left">Area</th>
                    <th className="px-4 py-2 text-left">Start Date</th>
                    <th className="px-4 py-2 text-left">End Date</th>
                    <th className="px-4 py-2 text-left">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.prebooked_assignments.map((assignment) => (
                    <tr key={assignment.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{assignment.auto_no}</td>
                      <td className="px-4 py-2">{assignment.owner_name}</td>
                      <td className="px-4 py-2">{assignment.area_name}</td>
                      <td className="px-4 py-2">{formatDate(assignment.start_date)}</td>
                      <td className="px-4 py-2">{formatDate(assignment.end_date)}</td>
                      <td className="px-4 py-2">{assignment.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Pending Tickets */}
        {dashboard && dashboard.pending_tickets.length > 0 && (
          <Card className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Badge>PENDING</Badge>
              <span className="ml-2">Pending Approval</span>
            </h2>
            <div className="space-y-3">
              {dashboard.pending_tickets.map((ticket) => (
                <div key={ticket.id} className="p-4 border rounded-lg bg-yellow-50">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Autos Required</p>
                      <p className="font-semibold">{ticket.autos_required}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Days</p>
                      <p className="font-semibold">{ticket.days_required}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Start Date</p>
                      <p className="font-semibold">{formatDate(ticket.start_date)}</p>
                    </div>
                  </div>
                  {ticket.notes && (
                    <div className="mt-2 text-sm text-gray-700">
                      <p className="font-medium">Notes:</p>
                      <p>{ticket.notes}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Submitted on {formatDate(ticket.created_at)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* No Assignments Message */}
        {dashboard && dashboard.active_assignments.length === 0 && dashboard.prebooked_assignments.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">No active assignments yet</p>
              <Button onClick={() => setShowTicketModal(true)}>
                Create Your First Request
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Ticket Modal */}
      <Modal
        isOpen={showTicketModal}
        onClose={() => {
          setShowTicketModal(false);
          setTicketError('');
        }}
        title="Raise New Auto Request"
      >
        {ticketError && <ErrorAlert message={ticketError} />}
        
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <Input
            type="number"
            label="Autos Required"
            value={ticketData.autos_required}
            onChange={(e) => setTicketData({...ticketData, autos_required: e.target.value})}
            placeholder="e.g., 5"
            required
            min="1"
          />
          <Input
            type="number"
            label="Days Required"
            value={ticketData.days_required}
            onChange={(e) => setTicketData({...ticketData, days_required: e.target.value})}
            placeholder="e.g., 7"
            required
            min="1"
          />
          <Input
            type="date"
            label="Start Date"
            value={ticketData.start_date}
            onChange={(e) => setTicketData({...ticketData, start_date: e.target.value})}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Area *
            </label>
            <select
              value={ticketData.area_id}
              onChange={(e) => setTicketData({...ticketData, area_id: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">-- Select an Area --</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name} {area.pin_code ? `(${area.pin_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Display Area Pin Code and Available Autos Count */}
          {ticketData.area_id && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Pin Code</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {selectedAreaPinCode || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Available Autos</p>
                  {fetchingAvailableCount ? (
                    <p className="text-lg font-semibold text-blue-600">Loading...</p>
                  ) : (
                    <p className="text-lg font-semibold text-blue-600">
                      {availableAutosCount !== null ? availableAutosCount : '-'}
                    </p>
                  )}
                </div>
              </div>
              {ticketData.start_date && ticketData.days_required && availableAutosCount !== null && (
                <p className="text-xs text-blue-700 mt-2">
                  {availableAutosCount} auto{availableAutosCount !== 1 ? 's' : ''} available from {formatDate(ticketData.start_date)} for {ticketData.days_required} day{ticketData.days_required !== '1' ? 's' : ''}
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={ticketData.notes}
              onChange={(e) => setTicketData({...ticketData, notes: e.target.value})}
              placeholder="Any specific requirements or notes for the admin"
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={ticketLoading}
              className="flex-1"
            >
              {ticketLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowTicketModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Monthly Bookings Calendar</h2>
              <button
                onClick={() => {
                  setShowCalendarModal(false);
                  setSelectedAreaForCalendar('');
                }}
                className="text-gray-500 hover:text-gray-700 font-bold text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {dashboard && dashboard.prebooked_assignments.length > 0 ? (
                <CompanyPortalCalendar
                  assignments={dashboard.prebooked_assignments}
                  areas={areas}
                />
              ) : (
                <div className="text-center py-12 text-gray-600">
                  <p className="text-lg">No upcoming bookings to display</p>
                </div>
              )}
            </div>

            <div className="border-t p-4 bg-gray-50 flex justify-end">
              <Button
                onClick={() => {
                  setShowCalendarModal(false);
                  setSelectedAreaForCalendar('');
                }}
                variant="secondary"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDashboardPage;
