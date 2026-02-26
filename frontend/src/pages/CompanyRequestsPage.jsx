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
  const [detailsModalPayments, setDetailsModalPayments] = useState([]);
  const [detailsModalPaymentLoading, setDetailsModalPaymentLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      let allRequests = [];

      // Determine company status filter based on current tab
      let companyStatus = null;
      if (filterStatus === 'PENDING') {
        companyStatus = 'REQUESTED';
      } else if (filterStatus === 'APPROVED') {
        companyStatus = 'ACTIVE';
      } else if (filterStatus === 'REJECTED') {
        companyStatus = 'REJECTED';
      }

      // Always fetch company registrations for the current status
      try {
        const companiesResponse = await api.get(`/companies?status=${companyStatus}`);
        const companies = Array.isArray(companiesResponse) ? companiesResponse : (companiesResponse?.data || []);
        
        console.log(`[REQUESTS] ${companyStatus} companies response:`, companies);
        
        // Transform company registration format to match request format
        const transformedRequests = companies.map(company => ({
          id: company.id,
          company_id: company.id,
          type: 'COMPANY_REGISTRATION',
          company: {
            id: company.id,
            name: company.name,
            email: company.email,
            contact_person: company.contact_person,
            phone_number: company.phone_number,
          },
          company_name: company.name,
          email: company.email,
          contact_person: company.contact_person,
          phone_number: company.phone_number,
          ticket_status: filterStatus, // Use the current filter status (PENDING, APPROVED, REJECTED)
          autos_required: 0,
          days_required: 0,
          start_date: company.created_at,
          requested_at: company.created_at,
          admin_notes: company.rejection_reason || '', // Get rejection reason from company object
          rejection_reason: company.rejection_reason, // Also include rejection_reason for consistency
          notes: 'Company registration request',
        }));
        
        console.log(`[REQUESTS] Transformed ${companyStatus} registrations:`, transformedRequests);
        allRequests = transformedRequests;
      } catch (companiesErr) {
        console.error('[REQUESTS] Error fetching companies:', companiesErr);
        // If companies endpoint fails, continue with empty list
        allRequests = [];
      }

      // Also fetch auto/payment request tickets for all tabs
      try {
        const ticketsResponse = await api.get('/company-tickets/admin/all');
        let tickets = ticketsResponse.data || [];
        
        console.log('[REQUESTS] Fetched all tickets:', tickets.length);
        
        // Filter by ticket status matching the current filter
        let ticketStatusFilter = filterStatus; // PENDING, APPROVED, REJECTED map directly
        tickets = tickets.filter(r => r.ticket_status === ticketStatusFilter);
        
        console.log(`[REQUESTS] Filtered tickets for status ${ticketStatusFilter}:`, tickets.length);
        
        // Combine company registrations with tickets
        allRequests = [...allRequests, ...tickets];
        console.log(`[REQUESTS] Combined ${filterStatus} requests:`, allRequests.length);
      } catch (ticketsErr) {
        console.error('[REQUESTS] Error fetching tickets:', ticketsErr);
        // Continue with just company registrations
      }

      setRequests(allRequests);
    } catch (err) {
      console.error('[REQUESTS] Error:', err);
      setError(err.response?.data?.error || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    console.log('Opening modal for request:', request);
    console.log('Request ID:', request.id);
    setSelectedRequest(request);
    setShowDetailsModal(true);
    setAdminNotes(request.admin_notes || '');
    
    // Fetch payment details if approved with autos
    if (request.ticket_status === 'APPROVED' && request.autos_required > 0) {
      setDetailsModalPaymentLoading(true);
      console.log('Fetching payments for ticket ID:', request.id);
      paymentService.getTicketPayments(request.id)
        .then(res => {
          console.log('Payment response:', res.data);
          setDetailsModalPayments(res.data || []);
        })
        .catch(err => {
          console.error('Error fetching payment details:', err);
          console.error('Error response:', err.response?.data);
          setDetailsModalPayments([]);
        })
        .finally(() => {
          setDetailsModalPaymentLoading(false);
        });
    }
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
    
    // Check if this is a company registration request
    if (selectedRequest.type === 'COMPANY_REGISTRATION') {
      setActionLoading(true);
      try {
        // Approve the company registration
        const response = await api.post(`/companies/${selectedRequest.company_id}/approve`);
        alert('Company registration approved');
        setShowDetailsModal(false);
        setSelectedRequest(null);
        // Switch to APPROVED filter to show the newly approved company
        setFilterStatus('APPROVED');
      } catch (err) {
        console.error('[FRONTEND] Company approval error:', err);
        alert(err.response?.data?.error || 'Failed to approve company registration');
      } finally {
        setActionLoading(false);
      }
      return;
    }
    
    // Original auto request approval logic
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
    
    // Load available autos - filtered for date range compatibility
    setLoadingAutos(true);
    try {
      // Get intelligently filtered autos that don't have overlapping assignments
      const suggestionResponse = await api.get(`/company-tickets/admin/${selectedRequest.id}/available-autos`);
      const availableAutosList = suggestionResponse.data.available_autos || [];
      
      // Use ONLY the available autos (which already filters by date overlap)
      setAvailableAutos(availableAutosList);
      
      // Pre-select autos up to the requested count
      // Priority: IDLE first, then ACTIVE, then PREBOOKED
      const requiredCount = selectedRequest.autos_required || 0;
      const newSelected = new Set();
      
      if (requiredCount > 0) {
        // First, add IDLE autos
        const idleAutos = availableAutosList.filter(a => a.display_status === 'IDLE');
        idleAutos.slice(0, requiredCount).forEach(a => newSelected.add(a.id));
        
        // If still need more, add ACTIVE autos
        if (newSelected.size < requiredCount) {
          const activeAutos = availableAutosList.filter(a => a.display_status === 'ACTIVE');
          activeAutos.slice(0, requiredCount - newSelected.size).forEach(a => newSelected.add(a.id));
        }
        
        // If still need more, add PREBOOKED autos
        if (newSelected.size < requiredCount) {
          const prebookedAutos = availableAutosList.filter(a => a.display_status === 'PREBOOKED');
          prebookedAutos.slice(0, requiredCount - newSelected.size).forEach(a => newSelected.add(a.id));
        }
      }
      
      setSelectedAutos(newSelected);
      
      // Show assignment modal
      setShowAutoAssignmentModal(true);
    } catch (err) {
      console.error('Error loading available autos:', err);
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
    if (!selectedRequest) {
      alert('No request selected');
      return;
    }

    // For company registration, rejection reason is optional
    if (selectedRequest.type === 'COMPANY_REGISTRATION') {
      const confirmed = window.confirm('Are you sure you want to reject this company registration?');
      if (!confirmed) return;

      setActionLoading(true);
      try {
        await api.post(`/companies/${selectedRequest.company_id}/reject`, {
          reason: rejectionReason || 'Rejected by admin',
        });
        alert('Company registration rejected successfully');
        setShowRejectionModal(false);
        setShowDetailsModal(false);
        setSelectedRequest(null);
        setRejectionReason('');
        // Switch to REJECTED filter to show the rejected company
        setFilterStatus('REJECTED');
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to reject company registration');
      } finally {
        setActionLoading(false);
      }
      return;
    }

    // For auto request tickets, rejection reason is required
    if (!rejectionReason.trim()) {
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
            <h1 className="text-3xl font-bold text-gray-900">Requests</h1>
            <p className="text-gray-600">Manage company and auto requests</p>
          </div>
          <Button onClick={fetchRequests}>🔄 Refresh</Button>
        </div>

        {error && <ErrorAlert message={error} />}

        {/* Status Filter Buttons */}
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

        {/* Company Requests */}
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
          setDetailsModalPayments([]);
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
                    {selectedRequest.rejection_reason || selectedRequest.rejected_reason || selectedRequest.admin_notes || 'No reason provided'}
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Autos Assigned</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedRequest.autos_required}</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Duration</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedRequest.days_required} days</p>
                  </div>
                </div>

                {/* Payment Details Table */}
                {detailsModalPaymentLoading && (
                  <div className="bg-white p-4 rounded text-center">
                    <LoadingSpinner /> Loading payment details...
                  </div>
                )}

                {!detailsModalPaymentLoading && detailsModalPayments && detailsModalPayments.length > 0 && (
                  <div className="bg-white rounded border border-gray-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-blue-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Cost per Auto (per day)</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Total Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-900 font-semibold">₹{(detailsModalPayments[0]?.cost_per_day || 0).toLocaleString('en-IN')}</span>
                                <span className="text-xs text-gray-500">({detailsModalPayments[0]?.cost_per_day || 0} × {selectedRequest.autos_required} autos × {detailsModalPayments[0]?.total_days || selectedRequest.days_required} days)</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-green-600">₹{(Math.round(detailsModalPayments.reduce((sum, p) => sum + (parseFloat(p.total_cost) || 0), 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!detailsModalPaymentLoading && (!detailsModalPayments || detailsModalPayments.length === 0) && (
                  <div className="bg-white p-4 rounded text-center text-gray-500 text-sm border border-dashed border-gray-300">
                    <p>No payment details available</p>
                    <p className="text-xs text-gray-400 mt-1">Payment information will appear here</p>
                  </div>
                )}
              </div>
            )}

            {/* Fallback: Show basic auto details if no payment data */}
            {selectedRequest.ticket_status === 'APPROVED' && 
             selectedRequest.autos_required > 0 && 
             detailsModalPayments.length === 0 &&
             !detailsModalPaymentLoading &&
             selectedRequest.autos && selectedRequest.autos.length > 0 && (
              <div className="space-y-3">
                <div className="bg-white p-3 rounded">
                  <p className="font-semibold text-gray-900 mb-3 text-sm border-b pb-2">Assigned Autos (Fallback)</p>
                  <div className="space-y-3">
                    {selectedRequest.autos.map((auto, index) => {
                      const costPerDay = auto.cost_per_day || 0;
                      const totalCost = costPerDay * selectedRequest.days_required;
                      return (
                        <div key={auto.id} className="border border-blue-200 p-3 rounded bg-gradient-to-r from-blue-50 to-transparent">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{index + 1}. {auto.registration_number || 'N/A'}</p>
                              <p className="text-xs text-gray-600">{auto.model || 'Model N/A'}</p>
                            </div>
                            <Badge className="bg-blue-100 text-blue-900 text-xs">{auto.area_name || 'Any'}</Badge>
                          </div>
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

                {/* Action Buttons */}
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

                {showApprovalModal && (
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

      {/* Auto Assignment Modal */}
      <Modal
        isOpen={showAutoAssignmentModal && selectedRequest !== null}
        onClose={() => {
          setShowAutoAssignmentModal(false);
          setSelectedAutos(new Set());
        }}
        title={`Select Autos for ${selectedRequest?.company_name || 'Company'}`}
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">📋 Request Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm text-blue-800">
                <div>
                  <p className="text-gray-700">Company</p>
                  <p className="font-bold">{selectedRequest.company_name}</p>
                </div>
                <div>
                  <p className="text-gray-700">Autos Needed</p>
                  <p className="font-bold">{selectedRequest.autos_required}</p>
                </div>
                <div>
                  <p className="text-gray-700">Duration</p>
                  <p className="font-bold">{selectedRequest.days_required} days</p>
                </div>
                <div>
                  <p className="text-gray-700">Start Date</p>
                  <p className="font-bold">{formatDate(selectedRequest.start_date)}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Autos ({availableAutos.length} available)
              </label>
              <div className="border rounded-lg p-3 max-h-64 overflow-y-auto bg-white">
                {availableAutos.length === 0 ? (
                  <p className="text-gray-500 text-sm">No autos available for selection</p>
                ) : (
                  <div className="space-y-2">
                    {availableAutos.map((auto) => (
                      <label key={auto.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAutos.has(auto.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedAutos);
                            if (e.target.checked) {
                              newSelected.add(auto.id);
                            } else {
                              newSelected.delete(auto.id);
                            }
                            setSelectedAutos(newSelected);
                          }}
                          disabled={selectedAutos.size >= selectedRequest.autos_required && !selectedAutos.has(auto.id)}
                          className="cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{auto.auto_no}</p>
                          <p className="text-xs text-gray-600">{auto.owner_name} • {auto.area_name}</p>
                        </div>
                        <Badge className={
                          (auto.display_status || auto.status) === 'IDLE' 
                            ? 'bg-green-100 text-green-800' 
                            : (auto.display_status || auto.status) === 'ACTIVE'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }>
                          {auto.display_status || auto.status || 'IDLE'}
                        </Badge>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Selected: {selectedAutos.size} / {selectedRequest.autos_required}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAssignAutos}
                variant="success"
                disabled={actionLoading || selectedAutos.size === 0}
                className="flex-1"
              >
                {actionLoading ? 'Assigning...' : '✓ Assign Selected Autos'}
              </Button>
              <Button
                onClick={() => {
                  setShowAutoAssignmentModal(false);
                  setSelectedAutos(new Set());
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
