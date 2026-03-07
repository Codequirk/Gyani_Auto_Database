import React from 'react';
import { Badge } from './UI';

const ApprovedRequestCard = ({ request }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get list of assigned autos, fall back to empty array
  const assignedAutos = request.assigned_autos || [];

  return (
    <div className="border-l-4 border-green-600 bg-green-50 rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="flex justify-between items-start mb-3">
        <Badge variant="success">APPROVED</Badge>
      </div>

      {/* Request Info */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Autos Required</p>
          <p className="font-semibold text-lg">{request.autos_required}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Days</p>
          <p className="font-semibold text-lg">{request.days_required}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Area</p>
          <p className="font-semibold text-lg">{request.area_name || 'Any Area'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Start Date</p>
          <p className="font-semibold text-lg">{formatDate(request.start_date)}</p>
        </div>
      </div>

      {/* Assigned Autos Section */}
      {assignedAutos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-green-300">
          <p className="font-semibold text-green-900 mb-3">
            Assigned Autos ({assignedAutos.length})
          </p>
          <div className="space-y-2">
            {assignedAutos.map((auto, idx) => (
              <div
                key={idx}
                className="bg-white rounded p-3 border border-green-200"
              >
                <div className="grid grid-cols-5 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-600">Auto No</p>
                    <p className="font-medium text-gray-800">{auto.auto_no}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Owner</p>
                    <p className="font-medium text-gray-800">{auto.owner_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Area</p>
                    <p className="font-medium text-gray-800">{auto.area_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Assignment Status</p>
                    <Badge
                      variant={
                        auto.assignment_status === 'ACTIVE'
                          ? 'success'
                          : auto.assignment_status === 'PREBOOKED'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {auto.assignment_status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Duration</p>
                    <p className="font-medium text-gray-800">
                      {formatDate(auto.start_date)} to {formatDate(auto.end_date)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approval Message */}
      <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-sm text-green-900">
        <p className="font-medium">✓ Request Approved</p>
        <p>Your auto(s) have been assigned for your requested period.</p>
      </div>

      <p className="text-xs text-gray-500 mt-2">Submitted on {formatDate(request.created_at)}</p>
    </div>
  );
};

export default ApprovedRequestCard;
