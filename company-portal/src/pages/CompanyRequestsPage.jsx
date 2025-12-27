import React, { useState, useEffect } from 'react';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import api from '../services/api';
import { Card, Button, Badge, LoadingSpinner, ErrorAlert, Modal, Input } from '../components/UI';
import { formatDate } from '../utils/helpers';
import Navbar from '../components/Navbar';

const CompanyRequestsPage = () => {
  const { admin } = useAuth();
  const { darkMode } = useDarkMode();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showAutoAssignmentModal, setShowAutoAssignmentModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [availableAutos, setAvailableAutos] = useState([]);
  const [selectedAutos, setSelectedAutos] = useState(new Set());
  const [loadingAutos, setLoadingAutos] = useState(false);

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

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
    setAdminNotes(request.admin_notes || '');
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
    
    // Load available autos and get suggestions
    setLoadingAutos(true);
    try {
      // Get all autos in the area
      let autosUrl = '/autos';
      if (selectedRequest.area_id) {
        autosUrl = `/autos?area_id=${selectedRequest.area_id}`;
      }
      
      const autosResponse = await api.get(autosUrl);
      setAvailableAutos(autosResponse.data || []);
      
      // Get intelligent suggestions from backend
      const suggestionResponse = await api.get(`/company-tickets/admin/${selectedRequest.id}/suggest-autos`);
      const suggestedAutoIds = suggestionResponse.data.suggested_auto_ids || [];
      
      // Pre-select the suggested autos
      const newSelected = new Set(suggestedAutoIds);
      setSelectedAutos(newSelected);
      
      // Store suggestion data for display
      selectedRequest._suggestionData = suggestionResponse.data;
      
      // Show assignment modal instead of approving directly
      setShowAutoAssignmentModal(true);
    } catch (err) {
      console.error('Error loading autos or suggestions:', err);
      alert(err.response?.data?.error || 'Failed to load available autos');
      setSelectedAutos(new Set());
    } finally {
      setLoadingAutos(false);
    }
  };

  const handleAssignAutos = async () => {
    if (selectedAutos.size === 0) {
      alert('Please select at least one auto');
      return;
    }

    if (selectedAutos.size > selectedRequest.autos_required) {
      alert(`You can only select ${selectedRequest.autos_required} autos`);
      return;
    }

    setActionLoading(true);
    try {
      const autoIds = Array.from(selectedAutos);
      console.log('[FRONTEND] Sending auto_ids:', autoIds);
      console.log('[FRONTEND] Admin ID:', admin?.id);
      console.log('[FRONTEND] Request ID:', selectedRequest.id);
      
      // Call backend to approve AND assign autos
      const response = await api.patch(`/company-tickets/admin/${selectedRequest.id}/approve`, {
        admin_id: admin?.id || 'system',
        auto_ids: autoIds
      });
      
      console.log('[FRONTEND] Assignment response:', response.data);
      alert(`Request approved and ${selectedAutos.size} auto(s) assigned!`);
      setShowAutoAssignmentModal(false);
      setShowDetailsModal(false);
      setSelectedRequest(null);
      setSelectedAutos(new Set());
      setAvailableAutos([]);
      fetchRequests();
    } catch (err) {
      console.error('[FRONTEND] Assignment error:', err);
      alert(err.response?.data?.error || 'Failed to approve and assign');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleAutoSelection = (autoId) => {
    const newSelected = new Set(selectedAutos);
    if (newSelected.has(autoId)) {
      newSelected.delete(autoId);
    } else {
      if (newSelected.size < selectedRequest.autos_required) {
        newSelected.add(autoId);
      } else {
        alert(`You can only select ${selectedRequest.autos_required} autos`);
        return;
      }
    }
    setSelectedAutos(newSelected);
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
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Company Requests</h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Manage company registration and auto requests</p>
          </div>
          <Button onClick={fetchRequests}>🔄 Refresh</Button>
        </div>

        {error && <ErrorAlert message={error} />}

        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
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
              <Card key={request.id} className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} cursor-pointer hover:shadow-lg transition-shadow`} onDoubleClick={() => handleViewDetails(request)}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {request.autos_required} Autos for {request.days_required} Days
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

                    <div className={`grid grid-cols-3 gap-4 text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-gray-300' : ''}`}>Company</p>
                        <p className={darkMode ? 'text-gray-200' : ''}>{request.company?.name || request.company_id}</p>
                      </div>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-gray-300' : ''}`}>Area</p>
                        <p className={darkMode ? 'text-gray-200' : ''}>{request.area_name || 'Any Area'}</p>
                      </div>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-gray-300' : ''}`}>Start Date</p>
                        <p>{formatDate(request.start_date)}</p>
                      </div>
                    </div>

                    {request.notes && (
                      <div className={`p-2 rounded text-sm mb-3 ${darkMode ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-50'}`}>
                        <p className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>Notes:</p>
                        <p className={darkMode ? 'text-blue-200' : 'text-blue-800'}>{request.notes}</p>
                      </div>
                    )}

                    {request.admin_notes && (
                      <div className={`p-2 rounded text-sm ${darkMode ? 'bg-yellow-900 bg-opacity-30' : 'bg-yellow-50'}`}>
                        <p className={`font-medium ${darkMode ? 'text-yellow-300' : 'text-yellow-900'}`}>Admin Notes:</p>
                        <p className={darkMode ? 'text-yellow-200' : 'text-yellow-800'}>{request.admin_notes}</p>
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
        title={`Request Details - ${selectedRequest?.autos_required} Autos`}
      >
        {selectedRequest && (
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
              <div>
                <p className="text-sm text-gray-600">Autos Required</p>
                <p className="text-lg font-semibold">{selectedRequest.autos_required}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Days Required</p>
                <p className="text-lg font-semibold">{selectedRequest.days_required}</p>
              </div>
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
            {showApprovalModal && selectedRequest.ticket_status === 'PENDING' && (
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
            {selectedRequest.ticket_status === 'PENDING' && (
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

      {/* Auto Assignment Modal */}
      <Modal
        isOpen={showAutoAssignmentModal}
        onClose={() => {
          setShowAutoAssignmentModal(false);
          setSelectedAutos(new Set());
          setAvailableAutos([]);
        }}
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
                <p className="text-sm text-gray-600">Autos to Select</p>
                <p className="font-semibold">{selectedRequest.autos_required}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Preferred Area</p>
                <p className="font-semibold">{selectedRequest.area_name || 'Any Area'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Selected</p>
                <p className="font-semibold text-blue-600">{selectedAutos.size} / {selectedRequest.autos_required}</p>
              </div>
            </div>

            {/* Selected Autos - At Top */}
            {selectedAutos.size > 0 && (
              <div>
                <p className="font-semibold text-gray-900 mb-3">✓ Selected Autos ({selectedAutos.size}):</p>
                <div className="space-y-2 border border-green-200 bg-green-50 rounded p-3 mb-4">
                  {availableAutos.map((auto) => {
                    if (!selectedAutos.has(auto.id)) return null;
                    
                    const isSuggested = selectedRequest._suggestionData?.suggested_auto_ids?.includes(auto.id);
                    const suggestedAutoData = selectedRequest._suggestionData?.suggested_autos?.find(a => a.id === auto.id);
                    
                    return (
                      <div
                        key={auto.id}
                        onClick={() => toggleAutoSelection(auto.id)}
                        className="p-3 rounded cursor-pointer border border-green-400 bg-white hover:bg-green-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={true}
                            onChange={() => toggleAutoSelection(auto.id)}
                            className="w-4 h-4 text-green-600 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{auto.auto_no}</p>
                              {isSuggested && (
                                <span className="inline-block px-2 py-1 text-xs font-bold rounded">
                                  {suggestedAutoData?.type === 'IDLE' ? (
                                    <span className="bg-red-200 text-red-800">IDLE</span>
                                  ) : (
                                    <span className="bg-blue-200 text-blue-800">ASSIGNED (FREE)</span>
                                  )}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{auto.owner_name}</p>
                            <p className="text-xs text-gray-500">Area: {auto.area_name || 'N/A'}</p>
                          </div>
                          <span className="text-green-600 font-bold text-lg">✓</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Other Available Autos */}
            <div>
              <p className="font-semibold text-gray-900 mb-3">Available Autos:</p>
              
              {availableAutos.length === 0 ? (
                <p className="text-gray-600 text-sm">No autos available in this area</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded p-3">
                  {availableAutos.map((auto) => {
                    if (selectedAutos.has(auto.id)) return null; // Skip already selected
                    
                    const isSuggested = selectedRequest._suggestionData?.suggested_auto_ids?.includes(auto.id);
                    const suggestedAutoData = selectedRequest._suggestionData?.suggested_autos?.find(a => a.id === auto.id);
                    
                    return (
                      <div
                        key={auto.id}
                        onClick={() => toggleAutoSelection(auto.id)}
                        className="p-3 rounded cursor-pointer border border-gray-200 hover:border-blue-300 transition bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => toggleAutoSelection(auto.id)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{auto.auto_no}</p>
                              {isSuggested && (
                                <span className="inline-block px-2 py-1 text-xs font-bold rounded">
                                  {suggestedAutoData?.type === 'IDLE' ? (
                                    <span className="bg-red-200 text-red-800">IDLE</span>
                                  ) : (
                                    <span className="bg-blue-200 text-blue-800">ASSIGNED (FREE)</span>
                                  )}
                                </span>
                              )}
                              {!isSuggested && (
                                <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-gray-200 text-gray-700">
                                  AVAILABLE
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{auto.owner_name}</p>
                            <p className="text-xs text-gray-500">Area: {auto.area_name || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleAssignAutos}
                variant="success"
                disabled={selectedAutos.size === 0 || actionLoading}
                className="flex-1"
              >
                {actionLoading ? 'Assigning...' : `Confirm Assignment (${selectedAutos.size}/${selectedRequest.autos_required})`}
              </Button>
              <Button
                onClick={() => {
                  setShowAutoAssignmentModal(false);
                  setSelectedAutos(new Set());
                  setAvailableAutos([]);
                }}
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
