import React, { useState, useRef, useEffect } from 'react';
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

const ActionMenu = ({ onEdit, onDelete, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleEdit = () => {
    onEdit();
    setIsOpen(false);
  };

  const handleDelete = () => {
    onDelete();
    setIsOpen(false);
  };

  const handleMenuOpen = () => {
    if (!isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.top + rect.height / 2, left: rect.right + 8 });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={handleMenuOpen}
        className="text-gray-600 hover:text-gray-900 font-bold text-lg p-1 hover:bg-gray-100 rounded"
        title="Actions"
        type="button"
      >
        ⋮
      </button>
      {isOpen && (
        <div 
          className="fixed w-40 bg-white rounded-lg shadow-xl z-[9999] border border-gray-200 overflow-hidden"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, transform: 'translateY(-50%)' }}
        >
          <button
            onClick={handleEdit}
            type="button"
            className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            type="button"
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

const CompanyDetailPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [selectedAreaForFilter, setSelectedAreaForFilter] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedAreaForCalendar, setSelectedAreaForCalendar] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirmAssignmentId, setDeleteConfirmAssignmentId] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editFormData, setEditFormData] = useState({
    start_date: '',
    end_date: '',
  });

  // Fetch company details
  const { data: company, loading: companyLoading } = useFetch(
    () => companyService.get(companyId),
    [companyId]
  );

  // Fetch assignments for this company
  const { data: companyAssignments, loading: assignmentsLoading, refetch: refetchAssignments } = useFetch(
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

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await assignmentService.delete(assignmentId);
      setDeleteConfirmAssignmentId(null);
      await refetchAssignments();
    } catch (err) {
      console.error('Error deleting assignment:', err);
      setError(err.response?.data?.error || 'Failed to delete assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setEditFormData({
      start_date: assignment.start_date,
      end_date: assignment.end_date,
    });
  };

  const handleUpdateAssignment = async () => {
    if (!editFormData.start_date || !editFormData.end_date) {
      setError('Start date and end date are required');
      return;
    }

    const startDate = new Date(editFormData.start_date);
    const endDate = new Date(editFormData.end_date);
    if (endDate < startDate) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await assignmentService.update(editingAssignment.id, {
        start_date: editFormData.start_date,
        end_date: editFormData.end_date,
      });
      setEditingAssignment(null);
      await refetchAssignments();
    } catch (err) {
      console.error('Error updating assignment:', err);
      setError(err.response?.data?.error || 'Failed to update assignment');
    } finally {
      setLoading(false);
    }
  };

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
              📅 Calendar
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
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Actions
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
                      <td className="px-6 py-3 text-sm">
                        <ActionMenu
                          onEdit={() => handleEditAssignment(assignment)}
                          onDelete={() => handleDeleteAssignment(assignment.id)}
                          isLoading={loading}
                        />
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

        {/* Edit Assignment Modal */}
        {editingAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Edit Assignment</h2>
                <button
                  onClick={() => setEditingAssignment(null)}
                  className="text-white hover:text-gray-200 font-bold text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto Number
                    </label>
                    <input
                      type="text"
                      disabled
                      value={editingAssignment.auto_no}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={editFormData.start_date}
                      onChange={(e) => setEditFormData({...editFormData, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={editFormData.end_date}
                      onChange={(e) => setEditFormData({...editFormData, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleUpdateAssignment}
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      onClick={() => setEditingAssignment(null)}
                      variant="secondary"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDetailPage;
