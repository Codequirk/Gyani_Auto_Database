const CompanyRequest = require('../models/CompanyRequest');
const Company = require('../models/Company');
const Auto = require('../models/Auto');

/**
 * ⚠️  DEPRECATED - Use CompanyTicketController instead
 * 
 * This controller is being phased out in favor of a unified company_tickets system.
 * All new functionality should use CompanyTicketController and company_tickets table.
 * 
 * Keeping these methods for backward compatibility during transition period.
 * These will be removed in the next major version.
 */
exports.getCompanyRequests = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get all requests for this company (excludes dismissed)
    const requests = await CompanyRequest.findByCompanyId(companyId, { includeDismissed: false });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching company requests:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch company requests',
      message: error.message 
    });
  }
};

/**
 * Get a single company request by ID
 */
exports.getCompanyRequestById = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const request = await CompanyRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Company request not found' });
    }

    return res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error fetching company request:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch company request',
      message: error.message 
    });
  }
};

/**
 * Create a new company request (e.g., company requests an auto)
 */
exports.createCompanyRequest = async (req, res, next) => {
  try {
    const { companyId, autoId } = req.body;

    if (!companyId || !autoId) {
      return res.status(400).json({ 
        error: 'Company ID and Auto ID are required' 
      });
    }

    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Verify auto exists
    const auto = await Auto.findById(autoId);
    if (!auto) {
      return res.status(404).json({ error: 'Auto not found' });
    }

    // Check if request already exists
    const existingRequest = await CompanyRequest.findByAutoId(autoId);
    if (existingRequest && existingRequest.company_id === companyId) {
      return res.status(409).json({ 
        error: 'Request already exists for this auto' 
      });
    }

    const request = await CompanyRequest.create({
      company_id: companyId,
      auto_id: autoId,
      status: 'PENDING',
    });

    console.log(`✓ New company request created: ${request.id}`);

    return res.status(201).json({
      success: true,
      message: 'Request created successfully',
      data: request
    });
  } catch (error) {
    console.error('Error creating company request:', error);
    return res.status(500).json({ 
      error: 'Failed to create company request',
      message: error.message 
    });
  }
};

/**
 * Admin: Approve a company request
 */
exports.approveCompanyRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const request = await CompanyRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Company request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Cannot approve a ${request.status} request` 
      });
    }

    const updatedRequest = await CompanyRequest.approve(requestId);

    console.log(`✓ Company request approved: ${requestId}`);

    return res.status(200).json({
      success: true,
      message: 'Company request approved successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error approving company request:', error);
    return res.status(500).json({ 
      error: 'Failed to approve company request',
      message: error.message 
    });
  }
};

/**
 * Admin: Reject a company request with reason
 */
exports.rejectCompanyRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { rejectionReason } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const request = await CompanyRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Company request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Cannot reject a ${request.status} request` 
      });
    }

    const updatedRequest = await CompanyRequest.reject(requestId, rejectionReason);

    console.log(`✓ Company request rejected: ${requestId}`);
    console.log(`  Reason: ${rejectionReason}`);

    return res.status(200).json({
      success: true,
      message: 'Company request rejected successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error rejecting company request:', error);
    return res.status(500).json({ 
      error: 'Failed to reject company request',
      message: error.message 
    });
  }
};

/**
 * Company: Dismiss a rejected request notification (soft dismiss)
 * Only hides from UI, does not delete database record
 */
exports.dismissCompanyRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const request = await CompanyRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Company request not found' });
    }

    if (request.status !== 'REJECTED') {
      return res.status(400).json({ 
        error: 'Only rejected requests can be dismissed' 
      });
    }

    if (request.dismissed_by_company) {
      return res.status(400).json({ 
        error: 'Request already dismissed' 
      });
    }

    const updatedRequest = await CompanyRequest.dismiss(requestId);

    console.log(`✓ Company request dismissed by company: ${requestId}`);

    return res.status(200).json({
      success: true,
      message: 'Request dismissed successfully'
    });
  } catch (error) {
    console.error('Error dismissing company request:', error);
    return res.status(500).json({ 
      error: 'Failed to dismiss company request',
      message: error.message 
    });
  }
};

/**
 * Delete a company request (admin only)
 */
exports.deleteCompanyRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const request = await CompanyRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Company request not found' });
    }

    await CompanyRequest.delete(requestId);

    console.log(`✓ Company request deleted: ${requestId}`);

    return res.status(200).json({
      success: true,
      message: 'Request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting company request:', error);
    return res.status(500).json({ 
      error: 'Failed to delete company request',
      message: error.message 
    });
  }
};
