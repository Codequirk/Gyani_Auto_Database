import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, Button, LoadingSpinner, ErrorAlert, Badge, Input, Modal } from '../components/UI';
import Navbar from '../components/Navbar';

const CompanyRequestAssignmentPage = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  
  const [request, setRequest] = useState(null);
  const [autos, setAutos] = useState([]);
  const [selectedAutos, setSelectedAutos] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCostModal, setShowCostModal] = useState(false);
  const [costPerDay, setCostPerDay] = useState('');
  const [suggestedAutoIds, setSuggestedAutoIds] = useState([]);

  useEffect(() => {
    fetchRequestAndAutos();
  }, [requestId]);

  const fetchRequestAndAutos = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch the specific request
      const requestsResponse = await api.get('/company-tickets/admin/all');
      const currentRequest = requestsResponse.data.find(r => r.id === requestId);
      
      if (!currentRequest) {
        setError('Request not found');
        setLoading(false);
        return;
      }
      
      setRequest(currentRequest);
      
      // If company requested 0 autos, skip to confirmation
      if (currentRequest.autos_required === 0) {
        setSelectedAutos(new Set());
        setLoading(false);
        return;
      }
      
      // Fetch available autos (intelligently filtered by backend for date overlap)
      const suggestionResponse = await api.get(`/company-tickets/admin/${requestId}/available-autos`);
      const availableAutosList = suggestionResponse.data.available_autos || [];
      
      // Use ONLY the available autos (which already filters by date overlap)
      setAutos(availableAutosList);
      
      // Pre-select autos up to the requested count
      // Priority: IDLE first, then ACTIVE, then PREBOOKED
      const requiredCount = currentRequest.autos_required || 0;
      const newSelected = new Set();
      const suggestedIds = [];
      
      if (requiredCount > 0) {
        // First, add IDLE autos
        const idleAutos = availableAutosList.filter(a => a.display_status === 'IDLE');
        idleAutos.slice(0, requiredCount).forEach(a => {
          newSelected.add(a.id);
          suggestedIds.push(a.id);
        });
        
        // If still need more, add ACTIVE autos
        if (newSelected.size < requiredCount) {
          const activeAutos = availableAutosList.filter(a => a.display_status === 'ACTIVE');
          activeAutos.slice(0, requiredCount - newSelected.size).forEach(a => {
            newSelected.add(a.id);
            suggestedIds.push(a.id);
          });
        }
        
        // If still need more, add PREBOOKED autos
        if (newSelected.size < requiredCount) {
          const prebookedAutos = availableAutosList.filter(a => a.display_status === 'PREBOOKED');
          prebookedAutos.slice(0, requiredCount - newSelected.size).forEach(a => {
            newSelected.add(a.id);
            suggestedIds.push(a.id);
          });
        }
      }
      
      setSuggestedAutoIds(suggestedIds);
      setSelectedAutos(newSelected);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoSelection = (autoId) => {
    const newSelected = new Set(selectedAutos);
    if (newSelected.has(autoId)) {
      newSelected.delete(autoId);
    } else {
      // Allow selection if autos_required is 0 (unlimited) or if we haven't reached the limit
      if (request.autos_required === 0 || newSelected.size < request.autos_required) {
        newSelected.add(autoId);
      } else {
        setError(`You can only select ${request.autos_required} autos`);
        return;
      }
    }
    setSelectedAutos(newSelected);
    setError('');
  };

  const handleAssign = async () => {
    // For requests with required autos, validate selection
    if (request.autos_required > 0) {
      if (selectedAutos.size === 0) {
        setError(`Please select at least one auto (company requested ${request.autos_required} auto(s))`);
        return;
      }

      if (selectedAutos.size > request.autos_required) {
        setError(`You can only select ${request.autos_required} autos but selected ${selectedAutos.size}`);
        return;
      }
    }

    // If autos are being assigned and cost is required, show cost modal
    if (selectedAutos.size > 0) {
      setCostPerDay('');
      setShowCostModal(true);
      return;
    }

    // If no autos (0 required), proceed directly to approval
    proceedWithAssignment(null);
  };

  const proceedWithAssignment = async (costPerDayValue) => {
    setAssigning(true);
    setError('');
    
    try {
      const autoIds = Array.from(selectedAutos);
      
      // Call backend to approve and assign autos
      const response = await api.patch(`/company-tickets/admin/${requestId}/approve`, {
        auto_ids: autoIds,
        cost_per_day: costPerDayValue ? parseFloat(costPerDayValue) : undefined
      });
      
      const message = selectedAutos.size > 0 
        ? `Request approved and ${selectedAutos.size} auto(s) assigned!`
        : 'Request approved (no autos assigned as requested)';
      setSuccess(message);
      
      setTimeout(() => {
        navigate('/admin/requests');
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete assignment');
    } finally {
      setAssigning(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/requests');
  };

  if (loading) return <LoadingSpinner />;

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <ErrorAlert message="Request not found" />
          <Button onClick={() => navigate('/admin/requests')} className="mt-4">
            Back to Requests
          </Button>
        </div>
      </div>
    );
  }

  const selectedCount = selectedAutos.size;
  const requiredCount = request.autos_required;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Assign Autos to Company Request
          </h1>
          
          {/* Company Info Card */}
          <Card className="mb-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-600">Company Name</p>
                <p className="font-semibold">{request.company?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-sm">{request.company?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Autos Required</p>
                <p className="font-semibold text-lg">{requiredCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Preferred Area</p>
                <p className="font-semibold">{request.area_name || 'Any Area'}</p>
              </div>
            </div>
          </Card>

          {/* Selection Info */}
          {requiredCount > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div>
                <p className="text-blue-900 font-semibold">
                  Select {requiredCount} auto(s) from available options below
                </p>
                <p className="text-blue-700 text-sm mt-1">
                  You have selected: <span className="font-bold">{selectedCount} / {requiredCount}</span>
                </p>
              </div>
              <div className="flex gap-2">
                {selectedCount > 0 && (
                  <Badge className="bg-green-100 text-green-800">
                    {selectedCount} selected
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && <ErrorAlert message={error} className="mb-6" />}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Available Autos List */}
        {requiredCount > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Available Autos in {request.area_name || 'All Areas'}
            </h2>
            
            {autos.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-600">No autos available in this area</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {autos.map((auto) => {
                  const isSuggested = suggestedAutoIds.includes(auto.id);
                  const isSelected = selectedAutos.has(auto.id);
                  const canSelect = isSelected || selectedCount < requiredCount;
                  
                  return (
                    <Card
                      key={auto.id}
                      className={`p-4 cursor-pointer transition ${
                        isSelected
                          ? 'border-2 border-blue-500 bg-blue-50'
                          : 'border border-gray-200 hover:border-blue-300'
                      } ${!canSelect ? 'opacity-60 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (canSelect) {
                          toggleAutoSelection(auto.id);
                        }
                      }}
                    >
                      {/* Checkbox */}
                      <div className="flex items-start mb-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (canSelect) toggleAutoSelection(auto.id);
                          }}
                          disabled={!canSelect}
                          className="w-5 h-5 text-blue-600 rounded cursor-pointer disabled:opacity-50"
                        />
                        <div className="ml-3 flex-1">
                          <p className="font-bold text-gray-900">{auto.auto_no}</p>
                          <p className="text-sm text-gray-600">{auto.owner_name}</p>
                        </div>
                      </div>

                      {/* Auto Details */}
                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Area:</span>
                          <span className="font-semibold">{auto.area_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Status:</span>
                          <Badge className={
                            (auto.display_status || auto.status) === 'IDLE' 
                              ? 'bg-green-100 text-green-800' 
                              : (auto.display_status || auto.status) === 'ACTIVE'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }>
                            {auto.display_status || auto.status || 'IDLE'}
                          </Badge>
                        </div>
                        {isSuggested && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Suggested:</span>
                            <Badge className="bg-purple-100 text-purple-800">Recommended</Badge>
                          </div>
                        )}
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="pt-3 border-t border-blue-200">
                          <p className="text-center text-sm font-semibold text-blue-600">✓ Selected</p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={requiredCount > 0 && selectedCount === 0 || assigning}
            isLoading={assigning}
          >
            {requiredCount === 0 
              ? 'Confirm Approval' 
              : `Assign ${selectedCount > 0 ? `${selectedCount}` : ''} Auto${selectedCount !== 1 ? 's' : ''}`
            }
          </Button>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Selecting and assigning autos will update the company's assignment records and approve their request.
            The company will be able to see these assigned autos on their dashboard.
          </p>
        </div>
      </div>

      {/* Cost Input Modal */}
      <Modal
        isOpen={showCostModal}
        onClose={() => {
          setShowCostModal(false);
          setCostPerDay('');
        }}
        title="Enter Cost Per Day"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Please enter the cost per day for the assigned auto(s). This information will be used for billing.
          </p>
          <Input
            type="number"
            placeholder="Cost per day (optional)"
            value={costPerDay}
            onChange={(e) => setCostPerDay(e.target.value)}
            step="0.01"
            min="0"
          />
          <div className="flex gap-3">
            <Button
              onClick={() => proceedWithAssignment(costPerDay)}
              variant="success"
              disabled={assigning}
              isLoading={assigning}
              className="flex-1"
            >
              Confirm
            </Button>
            <Button
              onClick={() => {
                setShowCostModal(false);
                setCostPerDay('');
              }}
              variant="secondary"
              disabled={assigning}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CompanyRequestAssignmentPage;
