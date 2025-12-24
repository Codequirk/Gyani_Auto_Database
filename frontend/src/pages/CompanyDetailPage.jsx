import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { companyService, assignmentService, autoService, areaService } from '../services/api';
import { Card, Button, LoadingSpinner, ErrorAlert, Badge } from '../components/UI';
import { computeDaysRemaining, formatDate, getStatusBadgeColor } from '../utils/helpers';
import Navbar from '../components/Navbar';
import AssignmentCalendar from '../components/AssignmentCalendar';

// Helper function to calculate days between two dates
const calculateDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const timeDiff = end - start;
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
};

// Helper function to calculate total assigned days considering gaps
const calculateTotalAssignedDays = (assignments) => {
  if (assignments.length === 0) return 0;
  
  // Sort assignments by start date
  const sorted = [...assignments].sort((a, b) => 
    new Date(a.start_date) - new Date(b.start_date)
  );
  
  let totalDays = 0;
  let currentStart = new Date(sorted[0].start_date);
  let currentEnd = new Date(sorted[0].end_date);
  currentStart.setHours(0, 0, 0, 0);
  currentEnd.setHours(0, 0, 0, 0);
  
  for (let i = 1; i < sorted.length; i++) {
    const nextStart = new Date(sorted[i].start_date);
    const nextEnd = new Date(sorted[i].end_date);
    nextStart.setHours(0, 0, 0, 0);
    nextEnd.setHours(0, 0, 0, 0);
    
    // Check if there's a gap (more than 1 day between current end and next start)
    const gapDays = (nextStart - currentEnd) / (1000 * 60 * 60 * 24);
    
    if (gapDays > 1) {
      // There's a gap, so add days up to currentEnd and start fresh
      totalDays += calculateDaysBetween(currentStart, currentEnd);
      currentStart = nextStart;
      currentEnd = nextEnd;
    } else {
      // No gap, extend the current period
      currentEnd = new Date(Math.max(currentEnd, nextEnd));
    }
  }
  
  // Add the last period
  totalDays += calculateDaysBetween(currentStart, currentEnd);
  
  return totalDays;
};

const CompanyDetailPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [selectedAreaForFilter, setSelectedAreaForFilter] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedAreaForCalendar, setSelectedAreaForCalendar] = useState('');

  // Fetch company details
  const { data: company, loading: companyLoading } = useFetch(
    () => companyService.get(companyId),
    [companyId]
  );

  // Fetch assignments for this company
  const { data: companyAssignments, loading: assignmentsLoading } = useFetch(
    () => assignmentService.getByCompany(companyId),
    [companyId]
  );

  // Fetch areas
  const { data: areas = [] } = useFetch(() => areaService.list(), []);

  // Fetch auto details for each assignment
  const { data: allAutos } = useFetch(() => autoService.list({ limit: 1000 }), []);

  // Create a map of auto details
  const autoMap = {};
  if (allAutos) {
    allAutos.forEach((auto) => {
      autoMap[auto.id] = auto;
    });
  }

  // Enrich assignments with auto details
  const enrichedAssignments = (companyAssignments || []).map((assignment) => {
    const auto = autoMap[assignment.auto_id];
    const days = calculateDaysBetween(assignment.start_date, assignment.end_date);
    return {
      ...assignment,
      auto_no: auto?.auto_no || 'N/A',
      owner_name: auto?.owner_name || 'N/A',
      area_name: auto?.area_name || 'N/A',
      area_id: auto?.area_id,
      auto_status: auto?.status || 'N/A',
      calculated_days: days,
    };
  });

  // Filter assignments by selected area
  const filteredAssignments = selectedAreaForFilter
    ? enrichedAssignments.filter(a => a.area_id === selectedAreaForFilter)
    : enrichedAssignments;

  // Get unique areas from assignments for the dropdown
  const uniqueAreas = [...new Map(
    enrichedAssignments.map(a => [a.area_id, { id: a.area_id, name: a.area_name }])
  ).values()];

  // Prepare calendar data for selected area - filter by area_id for calendar
  const calendarAssignments = company ? (selectedAreaForCalendar
    ? enrichedAssignments
        .filter(a => a.area_id === selectedAreaForCalendar)
        .map(a => ({
          start_date: a.start_date,
          end_date: a.end_date,
          company_name: company.name,
          status: a.status,
          area_id: a.area_id,
          area_name: a.area_name,
        }))
    : enrichedAssignments.map(a => ({
        start_date: a.start_date,
        end_date: a.end_date,
        company_name: company.name,
        status: a.status,
        area_id: a.area_id,
        area_name: a.area_name,
      }))) : [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (companyLoading || assignmentsLoading) return <LoadingSpinner />;

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <ErrorAlert message="Company not found. The company may have been deleted or the ID is invalid." />
          <Button onClick={() => navigate('/companies')} className="mt-4">Back to Companies</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              ← Back to Companies
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
            <p className="text-gray-600 mt-2">{company.contact_person}</p>
          </div>
          <Badge className={getStatusColor(company.status || 'ACTIVE')}>
            {company.status || 'ACTIVE'}
          </Badge>
        </div>

        {error && <ErrorAlert message={error} />}

        {/* Company Info Card */}
        <Card className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Contact Person</p>
              <p className="text-lg font-semibold text-gray-900">{company.contact_person}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Emails</p>
              <div className="text-lg font-semibold text-gray-900">
                {(company.emails && company.emails.length > 0) ? (
                  <div className="space-y-1">
                    {company.emails.map((email, idx) => (
                      <div key={idx} className="text-sm">{email}</div>
                    ))}
                  </div>
                ) : company.email ? (
                  <div>{company.email}</div>
                ) : (
                  <div>N/A</div>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Phones</p>
              <div className="text-lg font-semibold text-gray-900">
                {(company.phone_numbers && company.phone_numbers.length > 0) ? (
                  <div className="space-y-1">
                    {company.phone_numbers.map((phone, idx) => (
                      <div key={idx} className="text-sm">{phone}</div>
                    ))}
                  </div>
                ) : company.phone_number ? (
                  <div>{company.phone_number}</div>
                ) : (
                  <div>N/A</div>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Created</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(company.created_at)}</p>
            </div>
          </div>
        </Card>

        {/* Assigned Autos Section */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Assigned Autos ({filteredAssignments.length})
            </h2>
            <Button
              onClick={() => setShowCalendarModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              📅 View Calendar
            </Button>
          </div>

          {/* Summary Stats - MOVED TO TOP */}
          <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Autos Assigned</p>
              <p className="text-2xl font-bold text-gray-900">{enrichedAssignments.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Active Assignments</p>
              <p className="text-2xl font-bold text-green-600">
                {enrichedAssignments.filter(a => a.status === 'ACTIVE').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Pre-booked</p>
              <p className="text-2xl font-bold text-blue-600">
                {enrichedAssignments.filter(a => a.status === 'PREBOOKED').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Remaining Days</p>
              <p className="text-2xl font-bold text-purple-600">
                {calculateTotalAssignedDays(enrichedAssignments)} days
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Area
              </label>
              <select
                value={selectedAreaForFilter}
                onChange={(e) => setSelectedAreaForFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Areas</option>
                {uniqueAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No autos assigned {selectedAreaForFilter ? 'in this area' : 'to this company'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Auto Number
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Owner Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Area
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Days
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map((assignment) => (
                    <tr key={assignment.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        <button
                          onClick={() => navigate(`/autos/${assignment.auto_id}`)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {assignment.auto_no}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {assignment.owner_name}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {assignment.area_name}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {formatDate(assignment.start_date)}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {formatDate(assignment.end_date)}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        {assignment.calculated_days}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <Badge className={getStatusBadgeColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Calendar Modal */}
        {showCalendarModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Assignment Calendar</h2>
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
                {/* Area Filter for Calendar */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Area
                  </label>
                  <select
                    value={selectedAreaForCalendar}
                    onChange={(e) => setSelectedAreaForCalendar(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Areas</option>
                    {uniqueAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Calendar Component */}
                <AssignmentCalendar assignments={calendarAssignments} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDetailPage;
