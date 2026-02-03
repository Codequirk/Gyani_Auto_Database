import React, { useState, useEffect } from 'react';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import api, { paymentService } from '../services/api';
import { Card, Button, Badge, LoadingSpinner, ErrorAlert, Modal, Input } from '../components/UI';
import { formatDate } from '../utils/helpers';
import Navbar from '../components/Navbar';

const CompanyRequestsPage = () => {
  const { admin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showAutoAssignmentModal, setShowAutoAssignmentModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [availableAutos, setAvailableAutos] = useState([]);
  const [selectedAutos, setSelectedAutos] = useState(new Set());
  const [loadingAutos, setLoadingAutos] = useState(false);
  
  // Payment related states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [costPerDay, setCostPerDay] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [availableAutosForPayment, setAvailableAutosForPayment] = useState([]);
  const [costPerDayForAssignment, setCostPerDayForAssignment] = useState('');
  const [showCostInputModal, setShowCostInputModal] = useState(false);

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
    
    // If company requested 0 autos, directly approve without assignment modal
    if (selectedRequest.autos_required === 0) {
      setActionLoading(true);
      try {
        await api.patch(`/company-tickets/admin/${selectedRequest.id}/approve`, {
          admin_id: admin?.id || 'system',
          auto_ids: []
        });
        alert('Request approved (no autos assigned as requested)');
        setShowDetailsModal(false);
        setSelectedRequest(null);
        fetchRequests();
      } catch (err) {
        console.error('[FRONTEND] Approval error:', err);
        alert(err.response?.data?.error || 'Failed to approve request');
      } finally {
        setActionLoading(false);
      }
      return;
    }
    
    // Load available autos and get suggestions for non-zero auto requests
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
    // Allow zero autos only if the company requested zero autos
    if (selectedAutos.size === 0 && selectedRequest.autos_required > 0) {
      alert(`Please select at least one auto (company requested ${selectedRequest.autos_required} auto(s))`);
      return;
    }

    if (selectedAutos.size > selectedRequest.autos_required) {
      alert(`You can only select ${selectedRequest.autos_required} autos`);
      return;
    }

    // If autos are being assigned (not just approval), ask for cost per day
    if (selectedAutos.size > 0) {
      setCostPerDayForAssignment('');
      setShowCostInputModal(true);
      return;
    }

    // If no autos (0 required), proceed directly
    proceedWithAssignment(null);
  };

  const proceedWithAssignment = async (costPerDay) => {
    setActionLoading(true);
    try {
      const autoIds = Array.from(selectedAutos);
      console.log('[FRONTEND] Sending auto_ids:', autoIds);
      console.log('[FRONTEND] Admin ID:', admin?.id);
      console.log('[FRONTEND] Request ID:', selectedRequest.id);
      
      // Call backend to approve AND assign autos
      const response = await api.patch(`/company-tickets/admin/${selectedRequest.id}/approve`, {
        admin_id: admin?.id || 'system',
        auto_ids: autoIds,
        cost_per_day: costPerDay ? parseFloat(costPerDay) : undefined
      });
      
      console.log('[FRONTEND] Assignment response:', response.data);
      const message = selectedAutos.size > 0 
        ? `Request approved and ${selectedAutos.size} auto(s) assigned!`
        : 'Request approved (no autos assigned as requested)';
      alert(message);
      setShowAutoAssignmentModal(false);
      setShowCostInputModal(false);
      
      // Refresh the selected request to show payment section
      const updatedRequest = await api.get(`/company-tickets/admin/all`);
      const ticket = updatedRequest.data.find(t => t.id === selectedRequest.id);
      if (ticket) {
        setSelectedRequest(ticket);
      }
      
      setSelectedAutos(new Set());
      setAvailableAutos([]);
      setCostPerDayForAssignment('');
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
      // Allow selection if autos_required is 0 (unlimited) or if we haven't reached the limit
      if (selectedRequest.autos_required === 0 || newSelected.size < selectedRequest.autos_required) {
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
    
    const confirmed = window.confirm('Are you sure you want to reject this request?\n\nReason: ' + rejectionReason);
    if (!confirmed) return;

    setActionLoading(true);
    try {
      await api.patch(`/company-tickets/admin/${selectedRequest.id}/reject`, {
        reason: rejectionReason,
      });
      alert('Request rejected successfully');
      setShowRejectionModal(false);
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

  const handleOpenPaymentModal = async () => {
    if (!selectedRequest) return;
    
    setPaymentLoading(true);
    setPaymentError('');
    try {
      // Fetch existing payments and summary
      const [paymentsRes, summaryRes, availableRes] = await Promise.all([
        paymentService.getTicketPayments(selectedRequest.id),
        paymentService.getTicketSummary(selectedRequest.id),
        paymentService.getAvailableAutos(selectedRequest.id),
      ]);
      
      setPayments(paymentsRes.data);
      setPaymentSummary(summaryRes.data);
      setAvailableAutosForPayment(availableRes.data.available_autos || []);
      setShowPaymentModal(true);
    } catch (err) {
      setPaymentError(err.response?.data?.error || 'Failed to load payments');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;

    setPaymentLoading(true);
    try {
      await paymentService.delete(paymentId);
      
      // Refresh payments
      const [paymentsRes, summaryRes, availableRes] = await Promise.all([
        paymentService.getTicketPayments(selectedRequest.id),
        paymentService.getTicketSummary(selectedRequest.id),
        paymentService.getAvailableAutos(selectedRequest.id),
      ]);
      
      setPayments(paymentsRes.data);
      setPaymentSummary(summaryRes.data);
      setAvailableAutosForPayment(availableRes.data.available_autos || []);
      alert('Payment deleted successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete payment');
    } finally {
      setPaymentLoading(false);
    }
  };

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
                          ? '📝 Request for Registration' 
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
        title={`Request Details - ${selectedRequest?.autos_required === 0 && selectedRequest?.days_required === 0 ? 'Registration Request' : `${selectedRequest?.autos_required} Autos`}`}
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

            {/* Action Buttons */}
            {selectedRequest.ticket_status === 'PENDING' && (
              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  variant="success"
                  disabled={actionLoading || loadingAutos}
                  className="flex-1"
                >
                  {loadingAutos ? 'Loading autos...' : actionLoading ? 'Processing...' : '✓ Accept'}
                </Button>
                <Button
                  onClick={() => setShowRejectionModal(true)}
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

      {/* Rejection Modal */}
      <Modal
        isOpen={showRejectionModal}
        onClose={() => {
          setShowRejectionModal(false);
          setRejectionReason('');
        }}
        title="Reject Request"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-3">
                <strong>Company:</strong> {selectedRequest.company?.name}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting this request:
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected"
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleReject}
                variant="danger"
                disabled={!rejectionReason.trim() || actionLoading}
                className="flex-1"
              >
                {actionLoading ? 'Processing...' : '✕ Reject'}
              </Button>
              <Button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                }}
                variant="secondary"
                className="flex-1"
                disabled={actionLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Auto Assignment Modal - REMOVED - Now uses CompanyRequestAssignmentPage */}

      {/* Cost Input Modal - For Payment Calculation */}
      <Modal
        isOpen={showCostInputModal && selectedRequest !== null}
        onClose={() => {
          setShowCostInputModal(false);
          setCostPerDayForAssignment('');
        }}
        title="Set Payment Cost"
      >
        {selectedRequest && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">💰 Payment Calculation</h3>
            <div className="grid grid-cols-2 gap-3 text-sm text-blue-800">
              <div>
                <p className="text-gray-700">Number of Autos</p>
                <p className="font-bold text-lg">{selectedAutos.size}</p>
              </div>
              <div>
                <p className="text-gray-700">Number of Days</p>
                <p className="font-bold text-lg">{selectedRequest.days_required}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost Per Auto Per Day *
            </label>
            <Input
              type="number"
              value={costPerDayForAssignment}
              onChange={(e) => setCostPerDayForAssignment(e.target.value)}
              min="0"
              step="0.01"
              placeholder="e.g., 500"
              className="w-full"
            />
          </div>

          {costPerDayForAssignment && !isNaN(parseFloat(costPerDayForAssignment)) && parseFloat(costPerDayForAssignment) > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-3">💵 Total Cost Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Cost per Auto per Day</span>
                  <span className="font-semibold">₹{parseFloat(costPerDayForAssignment).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Cost per Auto Total (all days)</span>
                  <span className="font-semibold">₹{(parseFloat(costPerDayForAssignment) * selectedRequest?.days_required).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Number of Autos</span>
                  <span className="font-semibold">× {selectedAutos.size}</span>
                </div>
                <div className="border-t border-green-300 pt-2 flex justify-between">
                  <span className="text-green-900 font-bold">Grand Total</span>
                  <span className="text-green-900 font-bold text-lg">₹{(parseFloat(costPerDayForAssignment) * selectedRequest?.days_required * selectedAutos.size).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => proceedWithAssignment(costPerDayForAssignment)}
              variant="success"
              disabled={!costPerDayForAssignment || isNaN(parseFloat(costPerDayForAssignment)) || parseFloat(costPerDayForAssignment) <= 0 || actionLoading}
              className="flex-1"
            >
              {actionLoading ? 'Processing...' : 'Confirm & Assign'}
            </Button>
            <Button
              onClick={() => {
                setShowCostInputModal(false);
                setCostPerDayForAssignment('');
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

      {/* Payment Management Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentError('');
          setCostPerDay('');
        }}
        title={`Payment Management - ${selectedRequest?.company?.name || 'Company'}`}
      >
        {selectedRequest && (
          <div className="space-y-6 max-h-96 overflow-y-auto">
          {paymentError && <ErrorAlert message={paymentError} />}

          {/* Payment Summary */}
          {paymentSummary && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase">Autos Required</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedRequest?.autos_required}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase">Autos Added</p>
                  <p className="text-2xl font-bold text-green-700">{paymentSummary.total_payments}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase">Total Cost</p>
                  <p className="text-2xl font-bold text-purple-900">₹{paymentSummary.total_cost.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase">Remaining</p>
                  <p className="text-2xl font-bold text-orange-700">{paymentSummary.autos_remaining}</p>
                </div>
              </div>
            </div>
          )}

          {/* Add New Payment */}
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-3">Set Cost Per Auto</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Per Day (₹) - Applies to All Autos *
                </label>
                <Input
                  type="number"
                  value={costPerDay}
                  onChange={(e) => setCostPerDay(e.target.value)}
                  placeholder="e.g., 500"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Enter the daily cost rate. This will be applied to all {selectedRequest?.autos_required} autos.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-gray-900">
                  <strong>Remaining Autos:</strong> {paymentSummary?.autos_remaining || selectedRequest?.autos_required} autos
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {paymentSummary?.autos_remaining === selectedRequest?.autos_required
                    ? 'No payments assigned yet'
                    : `${paymentSummary?.total_payments} of ${selectedRequest?.autos_required} autos have payments assigned`}
                </p>
              </div>

              <Button
                onClick={async () => {
                  if (!costPerDay || isNaN(costPerDay) || parseFloat(costPerDay) < 0) {
                    alert('Please enter a valid cost per day');
                    return;
                  }

                  // Add payment for each available auto
                  if (availableAutosForPayment.length === 0) {
                    alert('All autos already have payments assigned!');
                    return;
                  }

                  setPaymentLoading(true);
                  try {
                    let addedCount = 0;
                    for (const auto of availableAutosForPayment) {
                      try {
                        await paymentService.add({
                          ticket_id: selectedRequest.id,
                          auto_id: auto.id,
                          cost_per_day: parseFloat(costPerDay),
                        });
                        addedCount++;
                      } catch (err) {
                        console.error(`Failed to add payment for auto ${auto.auto_no}:`, err);
                      }
                    }

                    // Refresh payments
                    const [paymentsRes, summaryRes, availableRes] = await Promise.all([
                      paymentService.getTicketPayments(selectedRequest.id),
                      paymentService.getTicketSummary(selectedRequest.id),
                      paymentService.getAvailableAutos(selectedRequest.id),
                    ]);

                    setPayments(paymentsRes.data);
                    setPaymentSummary(summaryRes.data);
                    setAvailableAutosForPayment(availableRes.data.available_autos || []);
                    setCostPerDay('');
                    alert(`✓ Payments added for ${addedCount} auto(s) at ₹${costPerDay}/day`);
                  } catch (err) {
                    alert(err.response?.data?.error || 'Failed to add payments');
                  } finally {
                    setPaymentLoading(false);
                  }
                }}
                variant="success"
                className="w-full"
                disabled={paymentLoading || !costPerDay || availableAutosForPayment.length === 0}
              >
                {paymentLoading ? 'Adding...' : `+ Assign ₹${costPerDay || '0'}/day to All Remaining Autos`}
              </Button>
            </div>
          </div>

          {/* Existing Payments List */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              Assigned Payments ({payments.length}/{selectedRequest?.autos_required})
            </h4>
            
            {payments.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4 bg-gray-50 rounded">
                No payments added yet
              </p>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-start p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{payment.auto_no}</p>
                      <p className="text-xs text-gray-600">{payment.owner_name}</p>
                      <div className="flex gap-4 mt-1">
                        <span className="text-sm text-gray-700">
                          <strong>₹{payment.cost_per_day}/day</strong>
                        </span>
                        <span className="text-sm text-gray-700">
                          × {payment.total_days} days = <strong className="text-green-700">₹{payment.total_cost}</strong>
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDeletePayment(payment.id)}
                      variant="danger"
                      className="text-xs px-2 py-1"
                      disabled={paymentLoading}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}
      </Modal>
    </div>
  );
};

export default CompanyRequestsPage;
