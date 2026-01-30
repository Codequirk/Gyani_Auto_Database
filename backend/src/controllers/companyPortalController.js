const Company = require('../models/Company');
const Assignment = require('../models/Assignment');
const Auto = require('../models/Auto');
const CompanyTicket = require('../models/CompanyTicket');
const { computeDaysRemaining } = require('../utils/dateUtils');

/**
 * Calculate total days between start and end dates (inclusive)
 */
const calculateDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const timeDiff = end - start;
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
};

/**
 * Helper function to determine correct assignment status based on dates
 * PREBOOKED: start_date > today
 * ACTIVE: start_date <= today <= end_date
 * COMPLETED: end_date < today
 */
function getCorrectAssignmentStatus(startDate, endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  if (end < today) {
    return 'COMPLETED';
  } else if (start > today) {
    return 'PREBOOKED';
  } else {
    return 'ACTIVE';
  }
}

/**
 * Helper function to check if an auto has expired assignments and update auto status if needed
 * Sets auto to IDLE if all assignments are COMPLETED
 */
async function updateAutoStatusIfExpired(autoId) {
  try {
    const assignments = await Assignment.findByAutoId(autoId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Update status for all assignments based on dates
    for (const assignment of assignments) {
      const correctStatus = getCorrectAssignmentStatus(assignment.start_date, assignment.end_date);
      if (assignment.status !== correctStatus) {
        await Assignment.updateStatus(assignment.id, correctStatus);
      }
    }
    
    // Refresh assignments after status updates
    const refreshedAssignments = await Assignment.findByAutoId(autoId);
    
    // Check remaining active/prebooked assignments
    const hasActiveAssignment = refreshedAssignments.some(a => a.status === 'ACTIVE');
    const hasPreAssignedAssignment = refreshedAssignments.some(a => a.status === 'PREBOOKED');
    
    if (hasActiveAssignment) {
      await Auto.updateStatus(autoId, 'ASSIGNED');
    } else if (hasPreAssignedAssignment) {
      await Auto.updateStatus(autoId, 'PRE_ASSIGNED');
    } else {
      // All assignments are COMPLETED or none exist
      await Auto.updateStatus(autoId, 'IDLE');
    }
  } catch (error) {
    console.error(`Error updating auto status for ${autoId}:`, error);
  }
}

exports.getCompanyProfile = async (req, res, next) => {
  try {
    const { company_id } = req.params;

    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Remove sensitive data
    const { password_hash, ...safeCompany } = company;
    res.json(safeCompany);
  } catch (error) {
    next(error);
  }
};

exports.getCompanyAssignments = async (req, res, next) => {
  try {
    const { company_id } = req.params;

    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get all assignments for this company
    const assignments = await Assignment.findByCompanyId(company_id);
    
    // Check each assignment for expiration and update auto status if needed
    const uniqueAutos = new Set(assignments.map(a => a.auto_id));
    for (const autoId of uniqueAutos) {
      await updateAutoStatusIfExpired(autoId);
    }
    
    // Enrich with auto details and days remaining
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        try {
          const auto = await Auto.findById(assignment.auto_id);
          return {
            ...assignment,
            auto_no: auto?.auto_no || 'Unknown',
            owner_name: auto?.owner_name || 'Unknown',
            area_id: auto?.area_id || '',
            area_name: auto?.area_name || 'Unknown',
            days_remaining: computeDaysRemaining(assignment.end_date),
          };
        } catch {
          return {
            ...assignment,
            auto_no: 'Unknown',
            owner_name: 'Unknown',
            area_id: '',
            area_name: 'Unknown',
            days_remaining: computeDaysRemaining(assignment.end_date),
          };
        }
      })
    );

    res.json(enrichedAssignments);
  } catch (error) {
    next(error);
  }
};

exports.getCompanyDashboard = async (req, res, next) => {
  try {
    const { company_id } = req.params;

    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if company is ACTIVE
    if (company.company_status !== 'ACTIVE') {
      return res.status(403).json({ 
        error: 'Your account is pending admin approval or has been deactivated',
        status: company.company_status,
        message: company.company_status === 'PENDING_APPROVAL' 
          ? 'Please wait for admin to approve your registration. Check back soon!'
          : 'Your account has been deactivated. Please contact admin.'
      });
    }

    // Get assignments
    const assignments = await Assignment.findByCompanyId(company_id);
    
    // Check each assignment for expiration and update auto status if needed
    const uniqueAutos = new Set(assignments.map(a => a.auto_id));
    for (const autoId of uniqueAutos) {
      await updateAutoStatusIfExpired(autoId);
    }
    
    const activeAssignments = assignments.filter(a => a.status === 'ACTIVE');
    const prebookedAssignments = assignments.filter(a => a.status === 'PREBOOKED');

    // Enrich ALL assignments with auto details (both ACTIVE and PREBOOKED)
    const enrichAssignments = async (assignmentList) => {
      return Promise.all(
        assignmentList.map(async (assignment) => {
          try {
            const auto = await Auto.findById(assignment.auto_id);
            const calculatedDays = calculateDaysBetween(assignment.start_date, assignment.end_date);
            return {
              ...assignment,
              auto_no: auto?.auto_no || 'Unknown',
              owner_name: auto?.owner_name || 'Unknown',
              area_id: auto?.area_id || '',
              area_name: auto?.area_name || 'Unknown',
              days_remaining: computeDaysRemaining(assignment.end_date),
              days: calculatedDays,
            };
          } catch (err) {
            console.error(`[DASHBOARD] Error enriching assignment ${assignment.id}:`, err);
            const calculatedDays = calculateDaysBetween(assignment.start_date, assignment.end_date);
            return {
              ...assignment,
              auto_no: 'Unknown',
              owner_name: 'Unknown',
              area_id: '',
              area_name: 'Unknown',
              days_remaining: computeDaysRemaining(assignment.end_date),
              days: calculatedDays,
            };
          }
        })
      );
    };

    // Enrich active assignments with auto details
    const enrichedActive = await enrichAssignments(activeAssignments);
    
    // Enrich prebooked assignments with auto details
    const enrichedPrebooked = await enrichAssignments(prebookedAssignments);

    // Get tickets for this company
    const tickets = await CompanyTicket.findByCompanyId(company_id);
    const pendingTickets = tickets.filter(t => t.ticket_status === 'PENDING');

    // Get priority assignments (2 days or less)
    const priorityAssignments = enrichedActive.filter(a => a.days_remaining >= 0 && a.days_remaining <= 2);

    res.json({
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        status: company.company_status,
      },
      summary: {
        total_assignments: assignments.length,
        active_assignments: activeAssignments.length,
        prebooked_assignments: prebookedAssignments.length,
        priority_count: priorityAssignments.length,
        pending_tickets: pendingTickets.length,
      },
      active_assignments: enrichedActive,
      prebooked_assignments: enrichedPrebooked,
      priority_assignments: priorityAssignments,
      tickets: tickets,
      pending_tickets: pendingTickets,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCompanyProfile = async (req, res, next) => {
  try {
    const { company_id } = req.params;
    const { contact_person, phone_number } = req.body;

    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const updateData = {};
    if (contact_person) updateData.contact_person = contact_person;
    if (phone_number) {
      updateData.phone_number = phone_number;
      updateData.phone_numbers = [phone_number];
    }

    const updated = await Company.update(company_id, updateData);
    const { password_hash, ...safeCompany } = updated;
    res.json(safeCompany);
  } catch (error) {
    next(error);
  }
};
