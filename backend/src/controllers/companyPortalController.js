const Company = require('../models/Company');
const Assignment = require('../models/Assignment');
const Auto = require('../models/Auto');
const CompanyTicket = require('../models/CompanyTicket');
const { computeDaysRemaining } = require('../utils/dateUtils');
const { deleteOldCompletedAssignments } = require('../utils/assignmentCleanup');

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
    
    // Update statuses for expired assignments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const assignment of assignments) {
      const endDate = new Date(assignment.end_date);
      endDate.setHours(0, 0, 0, 0);
      
      if (endDate < today && assignment.status !== 'COMPLETED') {
        await Assignment.updateStatus(assignment.id, 'COMPLETED');
        assignment.status = 'COMPLETED';
      }
    }
    
    // Filter to show ACTIVE, PREBOOKED, and recently COMPLETED assignments (within 1 day)
    const oneDayAgo = new Date(today);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const activeAssignments = assignments.filter(a => {
      if (a.status === 'ACTIVE' || a.status === 'PREBOOKED') {
        return true;
      }
      // Also show COMPLETED assignments from yesterday/today for reference
      if (a.status === 'COMPLETED') {
        const endDate = new Date(a.end_date);
        endDate.setHours(0, 0, 0, 0);
        // Show if ended today or yesterday
        return endDate >= oneDayAgo && endDate <= today;
      }
      return false;
    });

    // Enrich with auto details and days remaining
    const enrichedAssignments = (await Promise.all(
      activeAssignments.map(async (assignment) => {
        try {
          const auto = await Auto.findById(assignment.auto_id);
          
          // Skip assignments where auto doesn't exist (deleted auto)
          if (!auto) {
            return null;
          }
          
          return {
            ...assignment,
            auto_no: auto.auto_no || 'Unknown',
            owner_name: auto.owner_name || 'Unknown',
            area_id: auto.area_id || '',
            area_name: auto.area_name || 'Unknown',
            days_remaining: computeDaysRemaining(assignment.end_date),
          };
        } catch {
          // Return null to filter out assignments with errors
          return null;
        }
      })
    )).filter(item => item !== null);

    res.json(enrichedAssignments);
  } catch (error) {
    next(error);
  }
};

exports.getCompanyDashboard = async (req, res, next) => {
  try {
    // Clean up old completed assignments (30+ days old)
    await deleteOldCompletedAssignments();

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
    
    // Filter and update statuses if needed - mark COMPLETED if end_date has passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Recalculate display status for each assignment based on TODAY
    for (const assignment of assignments) {
      const correctStatus = getCorrectAssignmentStatus(assignment.start_date, assignment.end_date);
      
      // Update database if status has changed
      if (correctStatus !== assignment.status) {
        await Assignment.updateStatus(assignment.id, correctStatus);
        assignment.status = correctStatus;
      }
    }
    
    // Filter only ACTIVE and PREBOOKED (not COMPLETED)
    const activeAssignments = assignments.filter(a => a.status === 'ACTIVE');
    const prebookedAssignments = assignments.filter(a => a.status === 'PREBOOKED');
    const completedAssignments = assignments.filter(a => a.status === 'COMPLETED');

    // Enrich ALL assignments with auto details (ACTIVE, PREBOOKED, and COMPLETED)
    const enrichAssignments = async (assignmentList) => {
      const enriched = await Promise.all(
        assignmentList.map(async (assignment) => {
          try {
            const auto = await Auto.findById(assignment.auto_id);
            
            // Skip assignments where auto doesn't exist (deleted auto)
            if (!auto) {
              return null;
            }
            
            const calculatedDays = calculateDaysBetween(assignment.start_date, assignment.end_date);
            return {
              ...assignment,
              auto_no: auto.auto_no || 'Unknown',
              owner_name: auto.owner_name || 'Unknown',
              area_id: auto.area_id || '',
              area_name: auto.area_name || 'Unknown',
              days_remaining: computeDaysRemaining(assignment.end_date),
              days: calculatedDays,
            };
          } catch (err) {
            console.error(`[DASHBOARD] Error enriching assignment ${assignment.id}:`, err);
            // Return null to filter out assignments with errors
            return null;
          }
        })
      );
      
      // Filter out null entries (deleted autos or errors)
      return enriched.filter(item => item !== null);
    };

    // Enrich active assignments with auto details
    const enrichedActive = await enrichAssignments(activeAssignments);
    
    // Enrich prebooked assignments with auto details
    const enrichedPrebooked = await enrichAssignments(prebookedAssignments);
    
    // Enrich completed assignments with auto details
    const enrichedCompleted = await enrichAssignments(completedAssignments);

    // Get tickets for this company
    const tickets = await CompanyTicket.findByCompanyId(company_id);
    const pendingTickets = tickets.filter(t => t.ticket_status === 'PENDING');

    // Get priority assignments (2 days or less) from enriched data
    const priorityAssignments = enrichedActive.filter(a => a.days_remaining >= 0 && a.days_remaining <= 2);

    res.json({
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        status: company.company_status,
      },
      summary: {
        total_assignments: enrichedActive.length + enrichedPrebooked.length,
        active_assignments: enrichedActive.length,
        prebooked_assignments: enrichedPrebooked.length,
        completed_assignments: enrichedCompleted.length,
        priority_count: priorityAssignments.length,
        pending_tickets: pendingTickets.length,
      },
      active_assignments: enrichedActive,
      prebooked_assignments: enrichedPrebooked,
      completed_assignments: enrichedCompleted,
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
