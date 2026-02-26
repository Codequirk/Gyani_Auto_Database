import React, { useState, useEffect } from 'react';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Card, Button, Badge, LoadingSpinner, ErrorAlert, Modal, Input } from '../components/UI';
import { formatDate } from '../utils/helpers';
import Navbar from '../components/Navbar';

// Get backend base URL (strip '/api' from the API URL)
let BACKEND_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');

// Ensure it doesn't end with a slash
if (BACKEND_BASE_URL.endsWith('/')) {
  BACKEND_BASE_URL = BACKEND_BASE_URL.slice(0, -1);
}

// Ensure it has a protocol
if (!BACKEND_BASE_URL.startsWith('http://') && !BACKEND_BASE_URL.startsWith('https://')) {
  BACKEND_BASE_URL = 'http://localhost:5001';
}

console.log('[CompanyRequestsPage] BACKEND_BASE_URL:', BACKEND_BASE_URL);

const CompanyRequestsPage = () => {
  const { admin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showAutoSelectionModal, setShowAutoSelectionModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [availableAutos, setAvailableAutos] = useState([]);
  const [selectedAutosSet, setSelectedAutosSet] = useState(new Set());
  const [loadingAutos, setLoadingAutos] = useState(false);
  const [detailsModalPayments, setDetailsModalPayments] = useState([]);
  const [detailsModalPaymentLoading, setDetailsModalPaymentLoading] = useState(false);
  const [autoImages, setAutoImages] = useState({}); // Map of autoId -> image data
  const [fullViewImage, setFullViewImage] = useState(null); // For full-screen image modal

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      // Always fetch all tickets
      const response = await api.get('/company-tickets/admin/all');
      let allRequests = response.data;
      
      // Filter by status on frontend
      if (filterStatus === 'PENDING') {
        allRequests = allRequests.filter(r => r.ticket_status === 'PENDING');
      } else if (filterStatus === 'APPROVED') {
        allRequests = allRequests.filter(r => r.ticket_status === 'APPROVED');
      } else if (filterStatus === 'REJECTED') {
        allRequests = allRequests.filter(r => r.ticket_status === 'REJECTED');
      }
      
      setRequests(allRequests);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
    setAdminNotes(request.admin_notes || '');
    
    // Fetch images for all autos in this request
    if (request.autos && request.autos.length > 0) {
      try {
        const response = await api.get('/auto-images/image-sections');
        const sections = response.data;
        const imagesMap = {};
        
        // Search all 3 sections for images of autos in this request
        const allAutos = [...(sections.missing || []), ...(sections.buffer || []), ...(sections.uploaded || [])];
        request.autos.forEach((auto) => {
          const autoData = allAutos.find(a => a.id === auto.id);
          if (autoData && autoData.image_url) {
            imagesMap[auto.id] = {
              image_url: autoData.image_url,
              image_upload_date: autoData.image_upload_date,
              image_week_number: autoData.image_week_number,
              image_status: autoData.image_status,
            };
          }
        });
        setAutoImages(imagesMap);
      } catch (err) {
        console.error('Failed to fetch auto images:', err);
        setAutoImages({});
      }
    } else {
      setAutoImages({});
    }
    
    // No payment fetching needed for company-portal
    setDetailsModalPayments([]);
  };

  const handleUpdateNotes = async () => {
    if (!selectedRequest) return;
    
    setActionLoading(true);
    try {
      await api.patch(`/company-tickets/admin/${selectedRequest.id}`, {
        admin_notes: adminNotes,
      });
      setSelectedRequest({...selectedRequest, admin_notes: adminNotes});
      alert('Notes updated successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update notes');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setLoadingAutos(true);
    setSelectedAutosSet(new Set());
    try {
      // Fetch available autos from backend
      const response = await api.get(`/company-tickets/admin/${selectedRequest.id}/available-autos`);
      
      // Store exactly as received - NO mutations
      const autos = response.data.available_autos || [];
      setAvailableAutos(autos);
      
      // Log for verification
      console.log('[FRONTEND] Available autos received from backend:');
      autos.forEach((auto, idx) => {
        console.log(`  [${idx}] ${auto.auto_no} - ${auto.display_status}`);
      });
      
      // Show modal
      setShowAutoSelectionModal(true);
    } catch (err) {
      console.error('[FRONTEND] Error fetching autos:', err);
      alert(err.response?.data?.error || 'Failed to fetch available autos');
    } finally {
      setLoadingAutos(false);
    }
  };

  // ===== AUTO SELECTION HELPERS =====
  // NOTE: Frontend receives a sorted array from backend.
  // We ONLY select items, NEVER reorder or transform.

  const toggleAutoSelection = (autoId) => {
    const newSelected = new Set(selectedAutosSet);
    if (newSelected.has(autoId)) {
      newSelected.delete(autoId);
    } else {
      if (newSelected.size < selectedRequest.autos_required) {
        newSelected.add(autoId);
      } else {
        alert(`You can only select ${selectedRequest.autos_required} auto(s)`);
        return;
      }
    }
    setSelectedAutosSet(newSelected);
  };

  const handleSubmitAutoSelection = async () => {
    if (selectedAutosSet.size === 0) {
      alert('Please select at least one auto');
      return;
    }

    const autoIds = Array.from(selectedAutosSet);
    setActionLoading(true);

    try {
      // Call approve endpoint with selected auto IDs
      const response = await api.patch(`/company-tickets/admin/${selectedRequest.id}/approve`, {
        admin_id: admin?.id || 'system',
        auto_ids: autoIds,
      });

      alert(`Request approved and ${autoIds.length} auto(s) assigned!`);
      
      // Close all modals and reset
      setShowAutoSelectionModal(false);
      setShowDetailsModal(false);
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setSelectedAutosSet(new Set());
      setAvailableAutos([]);
      
      // Refresh list
      fetchRequests();
    } catch (err) {
      console.error('[FRONTEND] Approval error:', err);
      alert(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseAutoSelectionModal = () => {
    setShowAutoSelectionModal(false);
    setSelectedAutosSet(new Set());
    setAvailableAutos([]);
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    
    setActionLoading(true);
    try {
      await api.patch(`/company-tickets/admin/${selectedRequest.id}/reject`, {
        reason: rejectionReason,
      });
      alert('Request rejected successfully');
      setShowApprovalModal(false);
      setShowDetailsModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Company Requests</h1>
            <p className="text-gray-600">Manage company registration and auto requests</p>
          </div>
          <Button onClick={fetchRequests}>🔄 Refresh</Button>
        </div>

        {error && <ErrorAlert message={error} />}

        <div className="mb-6 p-4 rounded-lg bg-white border border-gray-200">
          <div className="flex gap-2">
            {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'primary' : 'secondary'}
                onClick={() => setFilterStatus(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        {requests.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600">No {filterStatus.toLowerCase()} requests</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="p-4 bg-white cursor-pointer hover:shadow-lg transition-shadow" onDoubleClick={() => handleViewDetails(request)}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.autos_required === 0 && request.days_required === 0 
                          ? '📝 Registration Request' 
                          : `${request.autos_required} Autos for ${request.days_required} Days`
                        }
                      </h3>
                      <Badge
                        variant={
                          request.ticket_status === 'APPROVED'
                            ? 'success'
                            : request.ticket_status === 'REJECTED'
                            ? 'danger'
                            : 'default'
                        }
                      >
                        {request.ticket_status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm mb-3 text-gray-600">
                      <div>
                        <p className="font-medium">Company</p>
                        <p>{request.company?.name || request.company_id}</p>
                      </div>
                      <div>
                        <p className="font-medium">Area</p>
                        <p>{request.area_name || 'Any Area'}</p>
                      </div>
                      <div>
                        <p className="font-medium">Start Date</p>
                        <p>{formatDate(request.start_date)}</p>
                      </div>
                    </div>

                    {request.notes && (
                      <div className="p-2 rounded text-sm mb-3 bg-blue-50">
                        <p className="font-medium text-blue-900">Notes:</p>
                        <p className="text-blue-800">{request.notes}</p>
                      </div>
                    )}

                    {request.admin_notes && (
                      <div className="p-2 rounded text-sm bg-yellow-50">
                        <p className="font-medium text-yellow-900">Admin Notes:</p>
                        <p className="text-yellow-800">{request.admin_notes}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {request.ticket_status === 'PENDING' && (
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(request);
                            setShowDetailsModal(true);
                          }}
                          variant="primary"
                          disabled={actionLoading || loadingAutos}
                          className="text-sm px-3 py-1"
                        >
                          Action
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedRequest(null);
          setShowApprovalModal(false);
          setAdminNotes('');
        }}
        title={
          selectedRequest?.ticket_status === 'REJECTED' 
            ? 'Rejection Details'
            : selectedRequest?.autos_required === 0 && selectedRequest?.days_required === 0 
              ? 'Registration Request Details' 
              : `Auto Request Details - ${selectedRequest?.autos_required} Autos`
        }
      >
        {selectedRequest && (
          <div className="space-y-4">
            {/* REJECTED REQUEST - Show only rejection reason */}
            {selectedRequest.ticket_status === 'REJECTED' && (
              <div className="bg-red-50 p-4 rounded border border-red-200">
                <div className="mb-4 pb-4 border-b border-red-200">
                  <p className="text-sm text-gray-600">Company</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedRequest.company?.name || 'Unknown'}</p>
                </div>
                
                <div className="bg-white p-3 rounded">
                  <p className="text-sm font-semibold text-red-900 mb-2">Rejection Reason:</p>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedRequest.admin_notes || 'No reason provided'}
                  </p>
                </div>
              </div>
            )}

            {/* APPROVED COMPANY-ONLY REQUEST (Registration) - Show basic company info */}
            {selectedRequest.ticket_status === 'APPROVED' && 
             selectedRequest.autos_required === 0 && 
             selectedRequest.days_required === 0 && (
              <div className="bg-green-50 p-4 rounded border border-green-200">
                <h3 className="font-bold text-green-900 mb-4">Company Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Company Name</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedRequest.company?.name || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Email</p>
                    <p className="text-sm text-gray-900 break-all">{selectedRequest.company?.email || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Contact Person</p>
                    <p className="text-sm text-gray-900">{selectedRequest.company?.contact_person || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Phone</p>
                    <p className="text-sm text-gray-900">{selectedRequest.company?.phone_number || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* APPROVED AUTO REQUEST - Show payment/cost details */}
            {selectedRequest.ticket_status === 'APPROVED' && 
             selectedRequest.autos_required > 0 && (
              <div className="bg-blue-50 p-4 rounded border border-blue-200 space-y-4">
                <h3 className="font-bold text-blue-900 mb-4">Assignment & Payment Details</h3>
                
                {/* Company & Request Summary */}
                <div className="bg-white p-4 rounded border border-blue-100">
                  <h4 className="font-semibold text-gray-900 mb-3">Request Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Company</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedRequest.company?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-600">{selectedRequest.company?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Contact</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedRequest.company?.contact_person || 'N/A'}</p>
                      <p className="text-xs text-gray-600">{selectedRequest.company?.phone_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Area Required</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedRequest.area_name || 'Any Area'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Duration</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedRequest.days_required} days</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Start Date</p>
                      <p className="text-sm font-semibold text-gray-900">{formatDate(selectedRequest.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">End Date</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedRequest.start_date && selectedRequest.days_required
                          ? formatDate(new Date(new Date(selectedRequest.start_date).getTime() + (selectedRequest.days_required - 1) * 24 * 60 * 60 * 1000))
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assignment Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Autos Assigned</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedRequest.autos_required}</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Duration</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedRequest.days_required} days</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Assigned Autos</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedRequest.autos?.length || 0}</p>
                  </div>
                </div>

                {/* Assigned Autos with Payment Details */}
                {selectedRequest.autos && selectedRequest.autos.length > 0 && (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded">
                      <p className="font-semibold text-gray-900 mb-3 text-sm border-b pb-2">Assigned Autos</p>
                      <div className="space-y-3">
                        {selectedRequest.autos.map((auto, index) => {
                          const costPerDay = auto.cost_per_day || 0;
                          const totalCost = costPerDay * selectedRequest.days_required;
                          const autoImage = autoImages[auto.id];
                          return (
                            <div key={auto.id} className="border border-blue-200 p-3 rounded bg-gradient-to-r from-blue-50 to-transparent">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-bold text-gray-900 text-sm">{index + 1}. {auto.registration_number || 'N/A'}</p>
                                  <p className="text-xs text-gray-600">{auto.model || 'Model N/A'}</p>
                                </div>
                                <Badge className="bg-blue-100 text-blue-900 text-xs">{auto.area_name || 'Any'}</Badge>
                              </div>
                              
                              {/* Auto Image Section */}
                              {autoImage && (
                                <div className="mb-3 p-2 bg-white rounded border border-gray-200">
                                  <p className="text-xs font-semibold text-gray-600 mb-2">Weekly Image</p>
                                  <div className="relative">
                                    <img 
                                      src={`${BACKEND_BASE_URL}${autoImage.image_url}`} 
                                      alt={auto.registration_number}
                                      className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80 transition"
                                      onDoubleClick={() => setFullViewImage(autoImage)}
                                      title="Double-click to view full size"
                                    />
                                  </div>
                                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                                    {autoImage.image_upload_date && (
                                      <p>📅 {new Date(autoImage.image_upload_date).toLocaleDateString('en-IN')}</p>
                                    )}
                                    {autoImage.image_week_number && (
                                      <p>📆 Week {autoImage.image_week_number}</p>
                                    )}
                                    {autoImage.image_status && (
                                      <p>
                                        Status: 
                                        <span className={`ml-1 px-2 py-0.5 rounded text-white text-xs font-bold ${
                                          autoImage.image_status === 'UPLOADED' ? 'bg-green-500' :
                                          autoImage.image_status === 'BUFFER' ? 'bg-yellow-500' :
                                          'bg-red-500'
                                        }`}>
                                          {autoImage.image_status}
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-4 gap-2 text-xs">
                                <div className="bg-white p-2 rounded">
                                  <p className="text-gray-600 font-semibold">Cost/Day</p>
                                  <p className="text-green-600 font-bold">₹{costPerDay?.toLocaleString('en-IN') || '0'}</p>
                                </div>
                                <div className="bg-white p-2 rounded">
                                  <p className="text-gray-600 font-semibold">Days</p>
                                  <p className="text-blue-600 font-bold">{selectedRequest.days_required}</p>
                                </div>
                                <div className="bg-white p-2 rounded">
                                  <p className="text-gray-600 font-semibold">Total</p>
                                  <p className="text-purple-600 font-bold">₹{totalCost?.toLocaleString('en-IN') || '0'}</p>
                                </div>
                                <div className="bg-white p-2 rounded">
                                  <p className="text-gray-600 font-semibold">Status</p>
                                  <p className="text-blue-600 font-bold text-xs">{auto.status || 'Active'}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Total Payment Summary */}
                    {selectedRequest.autos.length > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded border border-green-200">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <p className="text-xs font-semibold text-gray-600 mb-1">Total Autos</p>
                            <p className="text-2xl font-bold text-blue-900">{selectedRequest.autos.length}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold text-gray-600 mb-1">Total Days</p>
                            <p className="text-2xl font-bold text-blue-900">{selectedRequest.days_required}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold text-gray-600 mb-1">Total Cost</p>
                            <p className="text-2xl font-bold text-green-600">
                              ₹{(selectedRequest.autos.reduce((sum, a) => sum + ((a.cost_per_day || 0) * selectedRequest.days_required), 0)).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(!selectedRequest.autos || selectedRequest.autos.length === 0) && (
                  <div className="bg-white p-4 rounded text-center text-gray-500 text-sm border border-dashed border-gray-300">
                    <p>No autos assigned yet</p>
                    <p className="text-xs text-gray-400 mt-1">Autos will appear here once assignment is completed</p>
                  </div>
                )}
              </div>
            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-600">Cost/Day</p>
                            <p className="font-bold text-green-600">₹{auto.cost_per_day?.toLocaleString('en-IN') || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Status</p>
                            <p className="font-semibold text-blue-900">{auto.status || 'Active'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(!selectedRequest.autos || selectedRequest.autos.length === 0) && (
                  <div className="bg-white p-3 rounded text-center text-gray-500 text-sm">
                    No auto details available
                  </div>
                )}
              </div>
            )}

            {/* PENDING REQUEST - Show full details with action buttons */}
            {selectedRequest.ticket_status === 'PENDING' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm text-gray-600">Company</p>
                    <p className="text-lg font-semibold">{selectedRequest.company?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Area</p>
                    <p className="text-lg font-semibold">{selectedRequest.area_name || 'Any Area'}</p>
                  </div>
                  {!(selectedRequest.autos_required === 0 && selectedRequest.days_required === 0) && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Autos Required</p>
                        <p className="text-lg font-semibold">{selectedRequest.autos_required}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Days Required</p>
                        <p className="text-lg font-semibold">{selectedRequest.days_required}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="text-lg font-semibold">{formatDate(selectedRequest.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge>{selectedRequest.ticket_status}</Badge>
                  </div>
                </div>

                {selectedRequest.notes && (
                  <div>
                    <p className="font-semibold text-gray-900">Company Notes:</p>
                    <p className="mt-1 text-gray-700">{selectedRequest.notes}</p>
                  </div>
                )}

                {/* Admin Notes Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add your notes here"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={handleUpdateNotes}
                    variant="secondary"
                    className="mt-2"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Saving...' : 'Save Notes'}
                  </Button>
                </div>

                {/* Rejection Reason (if needed) */}
                {showApprovalModal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason (if rejecting)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this request is being rejected"
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleApprove}
                    variant="success"
                    disabled={actionLoading || loadingAutos}
                    className="flex-1"
                  >
                    {loadingAutos ? 'Loading autos...' : actionLoading ? 'Processing...' : '✓ Approve & Assign'}
                  </Button>
                <Button
                  onClick={() => setShowApprovalModal(!showApprovalModal)}
                  variant="danger"
                  disabled={actionLoading}
                  className="flex-1"
                >
                  ✕ Reject
                </Button>
              </div>
            )}

            {showApprovalModal && selectedRequest.ticket_status === 'PENDING' && (
              <div className="flex gap-3">
                <Button
                  onClick={handleReject}
                  variant="danger"
                  disabled={!rejectionReason.trim() || actionLoading}
                  className="flex-1"
                >
                  {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                </Button>
                <Button
                  onClick={() => setShowApprovalModal(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Full-Screen Image Modal */}
      {fullViewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setFullViewImage(null)}
        >
          <div 
            className="max-w-4xl max-h-screen relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setFullViewImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 z-10"
            >
              ✕
            </button>
            <img 
              src={`${BACKEND_BASE_URL}${fullViewImage.image_url}`} 
              alt="Full view"
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-3 text-sm">
              {fullViewImage.image_upload_date && (
                <p>📅 Uploaded: {new Date(fullViewImage.image_upload_date).toLocaleDateString('en-IN')}</p>
              )}
              {fullViewImage.image_week_number && (
                <p>📆 Week {fullViewImage.image_week_number}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auto Selection Modal - Clean Implementation */}
      <Modal
        isOpen={showAutoSelectionModal}
        onClose={handleCloseAutoSelectionModal}
        title={`Select ${selectedRequest?.autos_required} Auto(s) to Assign`}
      >
        {selectedRequest && (
          <div className="space-y-4">
            {/* Request Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded">
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="font-semibold">{selectedRequest.company?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Required</p>
                <p className="font-semibold text-blue-600">{selectedRequest.autos_required}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Area</p>
                <p className="font-semibold">{selectedRequest.area_name || 'Any Area'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Selected</p>
                <p className="font-semibold text-green-600">{selectedAutosSet.size} / {selectedRequest.autos_required}</p>
              </div>
            </div>

            {/* Loading State */}
            {loadingAutos && (
              <div className="p-4 text-center text-gray-600">
                <LoadingSpinner /> Fetching available autos...
              </div>
            )}

            {/* Auto List - RENDERED IN EXACT BACKEND ORDER */}
            {!loadingAutos && availableAutos.length > 0 && (
              <div>
                <p className="font-semibold text-gray-900 mb-3">
                  Available Autos ({availableAutos.length})
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded p-3">
                  {/* CRITICAL: Use map() without filter() or sort() to preserve backend order */}
                  {availableAutos.map((auto) => (
                    <div
                      key={auto.id}
                      onClick={() => toggleAutoSelection(auto.id)}
                      className={`p-3 rounded cursor-pointer border transition ${
                        selectedAutosSet.has(auto.id)
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedAutosSet.has(auto.id)}
                          onChange={() => toggleAutoSelection(auto.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{auto.auto_no}</p>
                            {/* Display Status Badge - backend calculated */}
                            <span
                              className={`inline-block px-2 py-1 text-xs font-bold rounded ${
                                auto.display_status === 'IDLE'
                                  ? 'bg-red-200 text-red-800'
                                  : auto.display_status === 'ACTIVE'
                                  ? 'bg-blue-200 text-blue-800'
                                  : 'bg-yellow-200 text-yellow-800'
                              }`}
                            >
                              {auto.display_status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{auto.owner_name}</p>
                          <p className="text-xs text-gray-500">Area: {auto.area_name || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loadingAutos && availableAutos.length === 0 && (
              <div className="p-4 text-center text-gray-600 border border-gray-200 rounded">
                No autos available for the requested dates and area.
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmitAutoSelection}
                variant="success"
                disabled={selectedAutosSet.size === 0 || actionLoading}
                className="flex-1"
              >
                {actionLoading ? 'Assigning...' : `✓ Confirm (${selectedAutosSet.size}/${selectedRequest.autos_required})`}
              </Button>
              <Button
                onClick={handleCloseAutoSelectionModal}
                variant="secondary"
                disabled={actionLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CompanyRequestsPage;
