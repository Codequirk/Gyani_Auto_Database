import React, { useState } from 'react';
import companyRequestService from '../services/companyRequestService';
import { Button, Badge } from './UI';

const RejectedRequestCard = ({ request, onDismiss }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDismiss = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await companyRequestService.dismissRequest(request.id);
      
      // Remove from UI only
      onDismiss(request.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to dismiss notification. Please try again.');
      console.error('Error dismissing request:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="border-l-4 border-red-600 bg-red-50 rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="flex justify-between items-start mb-3">
        <Badge variant="danger">REJECTED</Badge>
        <button 
          onClick={handleDismiss}
          disabled={loading}
          className="text-gray-400 hover:text-red-600 text-2xl leading-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Close notification"
        >
          ✕
        </button>
      </div>

      {/* Request Info */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          {request.auto?.name || 'Auto Request'}
        </h3>
        <p className="text-sm text-gray-600">
          {request.auto?.year} {request.auto?.model}
          {request.auto?.auto_no && ` • ${request.auto.auto_no}`}
        </p>
      </div>

      {/* Rejection Reason */}
      <div className="bg-red-100 rounded p-3 mb-3">
        <h4 className="text-xs font-semibold text-red-900 uppercase mb-1">Rejection Reason</h4>
        <p className="text-sm text-red-800 break-words">
          {request.rejection_reason || 'No reason provided'}
        </p>
      </div>

      {/* Date */}
      <div className="text-xs text-gray-600 mb-3">
        Rejected on {formatDate(request.updated_at)}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-200 border border-red-300 text-red-800 px-3 py-2 rounded text-sm mb-3">
          {error}
        </div>
      )}

      {/* Action Button */}
      <div className="flex gap-2">
        <Button 
          variant="danger"
          size="sm"
          onClick={handleDismiss}
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Dismissing...' : 'Close Notification'}
        </Button>
      </div>
    </div>
  );
};

export default RejectedRequestCard;
