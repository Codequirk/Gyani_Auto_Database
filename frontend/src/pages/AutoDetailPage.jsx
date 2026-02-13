import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { autoService, assignmentService, companyService, autoMonthlyPaymentService } from '../services/api';
import { Card, Button, Badge, ErrorAlert, LoadingSpinner, Input, Modal } from '../components/UI';
import { computeDaysRemaining, computeDaysRemainingByStatus, formatDate, getStatusBadgeColor } from '../utils/helpers';
import Navbar from '../components/Navbar';
import AssignmentCalendar from '../components/AssignmentCalendar';

const AssignmentActionMenu = ({ assignment, onEdit, onDelete, isLoading }) => {
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
        className="text-gray-600 hover:text-gray-800 font-bold text-lg p-1"
        title="Actions"
      >
        ⋮
      </button>
      {isOpen && (
        <div 
          className="fixed w-40 bg-white rounded shadow-lg z-[9999] border border-gray-200"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, transform: 'translateY(-50%)' }}
        >
          <button
            onClick={() => {
              onEdit(assignment);
              setIsOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
          >
            Edit
          </button>
          <button
            onClick={() => {
              onDelete(assignment);
              setIsOpen(false);
            }}
            disabled={isLoading}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

const AutoDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [editFormData, setEditFormData] = useState({ company_id: '', start_date: '', days: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [confirmOverlapDialog, setConfirmOverlapDialog] = useState(false);
  const [overlappingAssignments, setOverlappingAssignments] = useState([]);
  const [pendingCompanyChange, setPendingCompanyChange] = useState(null);
  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageSuccess, setImageSuccess] = useState('');
  const [advertisements, setAdvertisements] = useState({});
  const { data: auto, loading, error, refetch } = useFetch(
    () => autoService.get(id),
    [id]
  );
  const { data: companies } = useFetch(() => companyService.list());
  const { data: paymentsResponse } = useFetch(
    () => autoMonthlyPaymentService.getByAuto(id),
    [id]
  );
  const payments = paymentsResponse?.list || [];

  // Load advertisement images for the current assignment
  useEffect(() => {
    if (auto?.id) {
      const currentAssignment = auto.assignments
        ?.filter(a => a.status === 'ACTIVE' || a.status === 'PREBOOKED')
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];
      
      if (currentAssignment && (currentAssignment.status === 'ACTIVE' || currentAssignment.status === 'PREBOOKED')) {
        const checkAdvertisement = async () => {
          try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/autos/${auto.id}/advertisement-image`, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            // If image exists (200 OK), mark it as available
            if (response.ok) {
              setAdvertisements(prev => ({ 
                ...prev, 
                [currentAssignment.id]: { 
                  id: `${auto.id}-image`,
                  url: `/api/autos/${auto.id}/advertisement-image`
                } 
              }));
            }
            // If 404, image doesn't exist - that's fine, just don't show it
          } catch (err) {
            console.error('Error checking advertisement:', err);
          }
        };
        
        checkAdvertisement();
      }
    }
  }, [auto?.id, auto?.assignments]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!auto) return <ErrorAlert message="Auto not found" />;

  // Get active/current assignment - the one with the earliest start date
  const currentAssignment = auto.assignments
    ?.filter(a => a.status === 'ACTIVE' || a.status === 'PREBOOKED')
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];

  // Helper function to check if two date ranges overlap
  const datesOverlap = (start1, end1, start2, end2) => {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);
    
    // Normalize times to compare just dates
    s1.setHours(0, 0, 0, 0);
    e1.setHours(0, 0, 0, 0);
    s2.setHours(0, 0, 0, 0);
    e2.setHours(0, 0, 0, 0);
    
    return s1 <= e2 && s2 <= e1;
  };

  // Helper function to find overlapping assignments
  const findOverlappingAssignments = (newStartDate, newEndDate) => {
    return auto.assignments?.filter(a => 
      a.id !== selectedAssignment?.id && 
      (a.status === 'ACTIVE' || a.status === 'PREBOOKED') &&
      datesOverlap(newStartDate, newEndDate, a.start_date, a.end_date)
    ) || [];
  };

  // Helper function to calculate overlap details for display
  const getOverlapDetail = (newStartDate, newEndDate, existingAssignment) => {
    const newStart = new Date(newStartDate);
    const newEnd = new Date(newEndDate);
    const existStart = new Date(existingAssignment.start_date);
    const existEnd = new Date(existingAssignment.end_date);

    // Normalize times
    newStart.setHours(0, 0, 0, 0);
    newEnd.setHours(0, 0, 0, 0);
    existStart.setHours(0, 0, 0, 0);
    existEnd.setHours(0, 0, 0, 0);

    // Calculate overlap range
    const overlapStart = new Date(Math.max(newStart.getTime(), existStart.getTime()));
    const overlapEnd = new Date(Math.min(newEnd.getTime(), existEnd.getTime()));

    const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return `Overlapping for ${overlapDays} days (${formatDate(overlapStart)} to ${formatDate(overlapEnd)})`;
  };

  const handleEditAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setEditFormData({
      company_id: assignment.company_id || '',
      start_date: assignment.start_date || '',
      days: assignment.days || '',
    });
    setShowEditModal(true);
    setEditError('');
  };

  const handleUpdateAssignment = async (confirmed = false) => {
    if (!selectedAssignment || !editFormData.company_id || !editFormData.start_date || !editFormData.days) {
      setEditError('All fields are required');
      return;
    }

    setEditLoading(true);
    setEditError('');
    try {
      const startDate = new Date(editFormData.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(editFormData.days));
      const endDateStr = endDate.toISOString().split('T')[0];

      // Check for overlapping assignments
      const overlaps = findOverlappingAssignments(editFormData.start_date, endDateStr);

      if (overlaps.length > 0 && !confirmed) {
        // Show confirmation dialog
        setOverlappingAssignments(overlaps);
        setConfirmOverlapDialog(true);
        setEditLoading(false);
        return;
      }

      // If confirmed or no overlaps, proceed with update
      // Delete overlapping assignments
      if (overlaps.length > 0) {
        for (const overlap of overlaps) {
          await assignmentService.delete(overlap.id);
        }
      }

      // Update the main assignment
      await assignmentService.update(selectedAssignment.id, {
        company_id: editFormData.company_id,
        start_date: editFormData.start_date,
        end_date: endDateStr,
        days: parseInt(editFormData.days),
      });

      setEditSuccess('Assignment updated successfully');
      setShowEditModal(false);
      setSelectedAssignment(null);
      setEditFormData({ company_id: '', start_date: '', days: '' });
      setConfirmOverlapDialog(false);
      setOverlappingAssignments([]);
      
      // Refetch to get updated data
      await refetch();
      
      setTimeout(() => setEditSuccess(''), 3000);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update assignment');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignment) => {
    if (!window.confirm(`Are you sure you want to delete this assignment? This cannot be undone.`)) {
      return;
    }

    setEditLoading(true);
    try {
      // Delete the single assignment
      await assignmentService.delete(assignment.id);

      // Update local state immediately - remove assignment from list
      const updatedAssignments = auto.assignments.filter(a => a.id !== assignment.id);
      
      // Update the auto object in state
      const updatedAuto = { ...auto, assignments: updatedAssignments };
      
      // Manually trigger refetch to update the data
      await refetch();

      setEditSuccess('Assignment deleted successfully');
      setTimeout(() => setEditSuccess(''), 3000);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to delete assignment');
    } finally {
      setEditLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!currentAssignment || currentAssignment.status !== 'ACTIVE') {
      setImageError('Can only upload images for ACTIVE autos');
      return;
    }

    // Validate file type
    if (file.type !== 'image/png') {
      setImageError('Only PNG files are allowed');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setImageError('File size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setImageError('');
    setImageSuccess('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setImageError('Not authenticated. Please login again.');
        setUploadingImage(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `/api/autos/${auto.id}/advertisement-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to upload image');
      }

      const data = await response.json();
      setAdvertisements(prev => ({ ...prev, [currentAssignment.id]: data.image }));
      setImageSuccess('Image uploaded successfully!');
      setTimeout(() => setImageSuccess(''), 3000);
    } catch (err) {
      setImageError(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async () => {
    if (!currentAssignment || !advertisements[currentAssignment.id]) {
      setImageError('No image to delete');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this advertisement image?')) {
      return;
    }

    setUploadingImage(true);
    setImageError('');
    setImageSuccess('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setImageError('Not authenticated. Please login again.');
        setUploadingImage(false);
        return;
      }

      const response = await fetch(
        `/api/autos/${auto.id}/advertisement-image`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete image');
      }

      setAdvertisements(prev => {
        const updated = { ...prev };
        delete updated[currentAssignment.id];
        return updated;
      });
      setImageSuccess('Image deleted successfully!');
      setTimeout(() => setImageSuccess(''), 3000);
    } catch (err) {
      setImageError(err.message || 'Failed to delete image');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="max-w-4xl mx-auto p-4 mt-8">
        {/* Header with Calendar Toggle */}
        <div className="flex items-center gap-4 mb-6 justify-between">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => navigate('/autos')}>
              ← Back
            </Button>
            <h1 className="text-3xl font-bold">{auto.auto_no}</h1>
          </div>
          <Button 
            variant={showCalendar ? "primary" : "secondary"}
            onClick={() => setShowCalendar(!showCalendar)}
            className="px-4 py-2"
          >
            📅 {showCalendar ? 'Hide' : ''} Calendar
          </Button>
        </div>

        {/* Calendar Section - Inline (Hidden by default) */}
        {showCalendar && (
          <div className="mb-6">
            <AssignmentCalendar assignments={auto.assignments || []} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Basic Info */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Auto Number</p>
                <p className="text-lg font-medium">{auto.auto_no}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Owner Name</p>
                <p className="text-lg font-medium">{auto.owner_name}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Driver Phone</p>
                <p className="text-lg font-medium">{auto.driver_phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Area</p>
                <p className="text-lg font-medium">{auto.area_name || 'N/A'}</p>
              </div>
              {auto.is_blocked && (
                <div className="col-span-2">
                  <p className="text-gray-600 text-sm">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-red-100 text-red-800">Blocked - Overdue Payment</Badge>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Current Assignment */}
          {currentAssignment && (
            <Card className="bg-blue-50 border-2 border-blue-200">
              <h2 className="text-xl font-semibold mb-4 text-blue-900">Current Assignment</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Company</p>
                  <p className="text-lg font-medium">{currentAssignment.company_name}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Status</p>
                  <Badge className={currentAssignment.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {currentAssignment.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Start Date</p>
                  <p className="text-lg font-medium">{formatDate(currentAssignment.start_date)}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">End Date</p>
                  <p className="text-lg font-medium">{formatDate(currentAssignment.end_date)}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Days Remaining</p>
                  <p className={`text-lg font-bold ${currentAssignment.days_remaining <= 2 ? 'text-red-600' : 'text-green-600'}`}>
                    {currentAssignment.days_remaining !== null ? `${currentAssignment.days_remaining} days` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Total Days</p>
                  <p className="text-lg font-medium">
                    {currentAssignment.days && currentAssignment.days > 0 ? currentAssignment.days : '-'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Advertisement Image Section - Only for ACTIVE autos with current assignment */}
          {currentAssignment && currentAssignment.status === 'ACTIVE' && (
            <Card className="bg-purple-50 border-2 border-purple-200">
              <h2 className="text-xl font-semibold mb-4 text-purple-900">📢 Advertisement Image</h2>
              
              {imageError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {imageError}
                </div>
              )}
              {imageSuccess && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                  {imageSuccess}
                </div>
              )}

              <div className="space-y-4">
                {advertisements[currentAssignment.id] ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">Current Advertisement:</p>
                    <div className="relative inline-block">
                      <img 
                        src={`/api/autos/${auto.id}/advertisement-image?t=${Date.now()}`}
                        alt="Advertisement"
                        className="max-w-sm max-h-72 border-2 border-purple-300 rounded cursor-pointer hover:shadow-lg transition-shadow"
                        title="Double-click to view full size"
                        onDoubleClick={() => {
                          const win = window.open(`/api/autos/${auto.id}/advertisement-image`, '_blank');
                          win.focus();
                        }}
                      />
                    </div>
                    <div className="mt-4 space-x-2">
                      <Button 
                        disabled={uploadingImage}
                        className="cursor-pointer"
                        onClick={() => document.getElementById('advertisement-file-input-replace').click()}
                      >
                        {uploadingImage ? 'Uploading...' : '🖼️ Replace Image'}
                      </Button>
                      <input 
                        id="advertisement-file-input-replace"
                        type="file" 
                        accept=".png,image/png"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                      <Button 
                        variant="danger"
                        onClick={handleImageDelete}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? 'Processing...' : '🗑️ Delete Image'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">No advertisement image uploaded yet.</p>
                    <div>
                      <Button 
                        disabled={uploadingImage} 
                        className="cursor-pointer"
                        onClick={() => document.getElementById('advertisement-file-input').click()}
                      >
                        {uploadingImage ? 'Uploading...' : '📤 Upload Advertisement (PNG)'}
                      </Button>
                      <input 
                        id="advertisement-file-input"
                        type="file" 
                        accept=".png,image/png"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Additional Info */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Additional Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Notes</p>
                <p className="text-lg">{auto.notes || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Last Updated</p>
                <p className="text-lg">{formatDate(auto.last_updated_at)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Created</p>
                <p className="text-lg">{formatDate(auto.created_at)}</p>
              </div>
            </div>
          </Card>

          {/* Payment Details */}
          {payments && payments.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
              <div className="space-y-4">
                {payments.map((payment, index) => (
                  <div key={payment.id || index} className="border-t pt-4 first:border-t-0 first:pt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-600 text-sm">Start Date</p>
                        <p className="text-lg font-medium">{formatDate(payment.start_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">End Date</p>
                        <p className="text-lg font-medium">{formatDate(payment.end_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">Monthly Cost</p>
                        <p className="text-lg font-medium">₹{payment.monthly_cost?.toLocaleString('en-IN') || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">Advance Payment</p>
                        <p className="text-lg font-medium">₹{payment.advance_payment?.toLocaleString('en-IN') || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Assignment Status Panel - ACTIVE and PREBOOKED only */}
          {auto.assignments && auto.assignments.filter(a => ['ACTIVE', 'PREBOOKED'].includes(a.status)).length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Assignment Status</h2>
              {editSuccess && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                  {editSuccess}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Company</th>
                      <th className="px-4 py-2 text-left">Start Date</th>
                      <th className="px-4 py-2 text-left">End Date</th>
                      <th className="px-4 py-2 text-left">Days</th>
                      <th className="px-4 py-2 text-left">Remaining</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auto.assignments.filter(a => ['ACTIVE', 'PREBOOKED'].includes(a.status)).map((assignment) => (
                      <tr key={assignment.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{assignment.company_name}</td>
                        <td className="px-4 py-2">{formatDate(assignment.start_date)}</td>
                        <td className="px-4 py-2">{formatDate(assignment.end_date)}</td>
                        <td className="px-4 py-2">{assignment.days || '-'}</td>
                        <td className="px-4 py-2">
                          <span className={computeDaysRemainingByStatus(assignment.start_date, assignment.end_date, assignment.status) <= 2 && computeDaysRemainingByStatus(assignment.start_date, assignment.end_date, assignment.status) > 0 ? 'font-bold text-red-600' : ''}>
                            {assignment.days_remaining !== null ? `${computeDaysRemainingByStatus(assignment.start_date, assignment.end_date, assignment.status)}` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <Badge className={assignment.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {assignment.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                          <AssignmentActionMenu
                            assignment={assignment}
                            onEdit={handleEditAssignment}
                            onDelete={handleDeleteAssignment}
                            isLoading={editLoading}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Completed Assignments Panel */}
          {auto.assignments && auto.assignments.filter(a => a.status === 'COMPLETED').length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Completed</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Company</th>
                      <th className="px-4 py-2 text-left">Start Date</th>
                      <th className="px-4 py-2 text-left">End Date</th>
                      <th className="px-4 py-2 text-left">Total Days</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auto.assignments.filter(a => a.status === 'COMPLETED').map((assignment) => (
                      <tr key={assignment.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{assignment.company_name}</td>
                        <td className="px-4 py-2">{formatDate(assignment.start_date)}</td>
                        <td className="px-4 py-2">{formatDate(assignment.end_date)}</td>
                        <td className="px-4 py-2">{assignment.days || '-'}</td>
                        <td className="px-4 py-2">
                          <Badge className="bg-gray-200 text-gray-800">
                            {assignment.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {(!auto.assignments || auto.assignments.length === 0) && (
            <Card>
              <p className="text-center py-8 text-gray-600">No assignments for this auto</p>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Assignment Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAssignment(null);
          setEditError('');
        }}
        title={`Edit Assignment - ${selectedAssignment?.company_name || ''}`}
      >
        {selectedAssignment && (
          <div className="space-y-4">
            {editError && <ErrorAlert message={editError} />}

            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-3">Current Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Company:</span>
                  <span className="font-medium">{selectedAssignment.company_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Start Date:</span>
                  <span className="font-medium">{formatDate(selectedAssignment.start_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">End Date:</span>
                  <span className="font-medium">{formatDate(selectedAssignment.end_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Days:</span>
                  <span className="font-medium">{selectedAssignment.days}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
              <h3 className="font-semibold mb-3">Edit Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company *
                  </label>
                  <select
                    value={editFormData.company_id}
                    onChange={(e) => {
                      const newCompanyId = e.target.value;
                      
                      // Only check for overlaps if changing to a DIFFERENT company
                      if (newCompanyId && newCompanyId !== selectedAssignment.company_id) {
                        // Use current form values or fall back to assignment values
                        const startDate = editFormData.start_date || selectedAssignment.start_date;
                        const days = editFormData.days || selectedAssignment.days;
                        
                        if (startDate && days) {
                          const endDate = new Date(startDate);
                          endDate.setDate(endDate.getDate() + parseInt(days));
                          const endDateStr = endDate.toISOString().split('T')[0];
                          const overlaps = findOverlappingAssignments(startDate, endDateStr);
                          
                          if (overlaps.length > 0) {
                            // Show dialog and store the pending company change
                            setOverlappingAssignments(overlaps);
                            setPendingCompanyChange(newCompanyId);
                            setConfirmOverlapDialog(true);
                            return; // Don't update the form yet
                          }
                        }
                      }
                      
                      // If no overlaps or same company, update immediately
                      setEditFormData({ ...editFormData, company_id: newCompanyId });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Select Company</option>
                    {companies?.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <Input
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Days *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={editFormData.days}
                    onChange={(e) => setEditFormData({ ...editFormData, days: e.target.value })}
                    placeholder="e.g., 7"
                  />
                </div>

                {editFormData.start_date && editFormData.days && (
                  <div className="p-2 bg-blue-100 rounded text-sm text-blue-800">
                    End Date: {formatDate(new Date(new Date(editFormData.start_date).getTime() + parseInt(editFormData.days) * 24 * 60 * 60 * 1000))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleUpdateAssignment}
                disabled={editLoading || !editFormData.company_id || !editFormData.start_date || !editFormData.days}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {editLoading ? 'Updating...' : 'Update Assignment'}
              </button>

              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAssignment(null);
                  setEditError('');
                }}
                className="w-full py-2 px-4 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Overlap Confirmation Dialog */}
      {confirmOverlapDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-red-600">⚠️ Overlapping Assignments Detected</h2>
              <button
                onClick={() => {
                  setConfirmOverlapDialog(false);
                  setOverlappingAssignments([]);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="text-sm text-yellow-800">
                  The new assignment dates <strong>overlap</strong> with the following existing assignments:
                </p>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {overlappingAssignments.map((assignment) => {
                  const newEndDate = new Date(editFormData.start_date);
                  newEndDate.setDate(newEndDate.getDate() + parseInt(editFormData.days));
                  const overlapDetail = getOverlapDetail(editFormData.start_date, newEndDate.toISOString().split('T')[0], assignment);
                  
                  return (
                    <div key={assignment.id} className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold">{assignment.company_name}</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(assignment.start_date)} to {formatDate(assignment.end_date)}
                          </p>
                          <p className="text-xs text-red-600 font-medium mt-1">{overlapDetail}</p>
                        </div>
                        <Badge className={assignment.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {assignment.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>These assignments will be DELETED</strong> when you proceed. They will be permanently removed and won't appear in history.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    // If there's a pending company change, apply it first
                    if (pendingCompanyChange) {
                      setEditFormData({ ...editFormData, company_id: pendingCompanyChange });
                      setPendingCompanyChange(null);
                    }
                    setConfirmOverlapDialog(false);
                    handleUpdateAssignment(true);
                  }}
                  disabled={editLoading}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {editLoading ? 'Processing...' : 'Yes, Delete & Update Assignment'}
                </button>
                <button
                  onClick={() => {
                    setConfirmOverlapDialog(false);
                    setOverlappingAssignments([]);
                    setPendingCompanyChange(null);
                  }}
                  disabled={editLoading}
                  className="flex-1 py-2 px-4 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AutoDetailPage;

