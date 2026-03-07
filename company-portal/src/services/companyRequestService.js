import api from './api';

const companyRequestService = {
  /**
   * Get all company requests (PENDING, APPROVED, REJECTED)
   * Excludes dismissed rejected requests by default
   */
  getCompanyRequests: (companyId) => {
    return api.get(`/company-requests/company/${companyId}`);
  },

  /**
   * Get a single company request by ID
   */
  getRequestById: (requestId) => {
    return api.get(`/company-requests/${requestId}`);
  },

  /**
   * Create a new company request
   */
  createRequest: (companyId, autoId) => {
    return api.post('/company-requests', {
      companyId,
      autoId,
    });
  },

  /**
   * Company: Dismiss a rejected request notification (soft dismiss)
   */
  dismissRequest: (requestId) => {
    return api.patch(`/company-requests/${requestId}/dismiss`);
  },

  /**
   * Admin: Approve a company request
   */
  approveRequest: (requestId) => {
    return api.patch(`/company-requests/${requestId}/approve`);
  },

  /**
   * Admin: Reject a company request with reason
   */
  rejectRequest: (requestId, rejectionReason) => {
    return api.patch(`/company-requests/${requestId}/reject`, {
      rejectionReason,
    });
  },

  /**
   * Admin: Delete a company request
   */
  deleteRequest: (requestId) => {
    return api.delete(`/company-requests/${requestId}`);
  },
};

export default companyRequestService;
