import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, Button, LoadingSpinner, ErrorAlert, Badge } from '../components/UI';
import Navbar from '../components/Navbar';

const AssignAutosPage = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState(null);
  const [autos, setAutos] = useState([]);
  const [selectedAutos, setSelectedAutos] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchTicketAndAutos();
  }, [ticketId]);

  const fetchTicketAndAutos = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch all tickets to get the one with this ID
      const ticketsResponse = await api.get('/company-tickets/admin/all');
      const currentTicket = ticketsResponse.data.find(t => t.id === ticketId);
      
      if (!currentTicket) {
        setError('Ticket not found');
        setLoading(false);
        return;
      }
      
      setTicket(currentTicket);
      
      // Fetch available autos (filtered by area if specified)
      let autosUrl = '/autos';
      if (currentTicket.area_id) {
        autosUrl = `/autos?area_id=${currentTicket.area_id}`;
      }
      
      const autosResponse = await api.get(autosUrl);
      setAutos(autosResponse.data || []);
      
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
      newSelected.add(autoId);
    }
    setSelectedAutos(newSelected);
  };

  const handleAssign = async () => {
    if (selectedAutos.size === 0) {
      setError('Please select at least one auto');
      return;
    }

    if (selectedAutos.size > ticket.autos_required) {
      setError(`You can only select ${ticket.autos_required} autos but selected ${selectedAutos.size}`);
      return;
    }

    setAssigning(true);
    setError('');
    
    try {
      // Create assignments for selected autos
      const response = await api.post(`/company-tickets/admin/${ticketId}/assign-autos`, {
        auto_ids: Array.from(selectedAutos),
        admin_id: 'current_admin_id'
      });
      
      setSuccess(`Successfully assigned ${selectedAutos.size} autos to the company!`);
      
      setTimeout(() => {
        navigate('/admin/requests');
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign autos');
    } finally {
      setAssigning(false);
    }
  };

  const handleSkip = () => {
    navigate('/admin/requests');
  };

  if (loading) return <LoadingSpinner />;

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <ErrorAlert message="Ticket not found" />
          <Button onClick={() => navigate('/admin/requests')} className="mt-4">
            Back to Requests
          </Button>
        </div>
      </div>
    );
  }

  const selectedCount = selectedAutos.size;
  const requiredCount = ticket.autos_required;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Assign Autos to Company
          </h1>
          
          {/* Company Info Card */}
          <Card className="mb-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-600">Company Name</p>
                <p className="font-semibold">{ticket.company?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-sm">{ticket.company?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Autos Required</p>
                <p className="font-semibold text-lg">{requiredCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Preferred Area</p>
                <p className="font-semibold">{ticket.area_name || 'Any Area'}</p>
              </div>
            </div>
          </Card>

          {/* Selection Info */}
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
        </div>

        {/* Error Alert */}
        {error && <ErrorAlert message={error} className="mb-6" />}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Available Autos List */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Available Autos in {ticket.area_name || 'All Areas'}
          </h2>
          
          {autos.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600">No autos available in this area</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {autos.map((auto) => (
                <Card
                  key={auto.id}
                  className={`p-4 cursor-pointer transition ${
                    selectedAutos.has(auto.id)
                      ? 'border-2 border-blue-500 bg-blue-50'
                      : 'border border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => {
                    if (selectedAutos.has(auto.id) || selectedCount < requiredCount) {
                      toggleAutoSelection(auto.id);
                    }
                  }}
                >
                  {/* Checkbox */}
                  <div className="flex items-start mb-3">
                    <input
                      type="checkbox"
                      checked={selectedAutos.has(auto.id)}
                      onChange={() => toggleAutoSelection(auto.id)}
                      disabled={!selectedAutos.has(auto.id) && selectedCount >= requiredCount}
                      className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                    />
                    <div className="ml-3 flex-1">
                      <p className="font-bold text-gray-900">{auto.auto_no}</p>
                      <p className="text-sm text-gray-600">{auto.owner_name}</p>
                    </div>
                  </div>

                  {/* Auto Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Area:</span>
                      <span className="font-semibold">{auto.area_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className={auto.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {auto.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {selectedAutos.has(auto.id) && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-center text-sm font-semibold text-blue-600">✓ Selected</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            onClick={handleSkip}
            variant="outline"
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedCount === 0 || assigning}
            isLoading={assigning}
          >
            Assign {selectedCount > 0 ? `${selectedCount}` : ''} Auto{selectedCount !== 1 ? 's' : ''}
          </Button>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Selecting and assigning autos will update the company's assignment records. 
            The company will be able to see these assigned autos on their dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssignAutosPage;
