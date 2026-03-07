import React from 'react';
import { Badge } from './UI';

const PendingRequestCard = ({ request }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="border-l-4 border-yellow-500 bg-yellow-50 rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="flex justify-between items-start mb-3">
        <Badge variant="warning">PENDING</Badge>
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

      {/* Status Message */}
      <div className="bg-yellow-100 rounded p-3 mb-3">
        <p className="text-sm text-yellow-800">
          Your request is being reviewed by the admin team. You'll receive an update soon.
        </p>
      </div>

      {/* Date */}
      <div className="text-xs text-gray-600">
        Requested on {formatDate(request.created_at)}
      </div>
    </div>
  );
};

export default PendingRequestCard;
