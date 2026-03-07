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

    // Step 1: Always fetch company record first
    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    console.log('[DASHBOARD] Company status:', { id: company_id, status: company.company_status });

    // Step 2: Always fetch company tickets (excluding dismissed rejected ones)
    const allTickets = await CompanyTicket.findByCompanyId(company_id, { includeDismissed: false });
    const pendingTickets = allTickets.filter(t => t.ticket_status === 'PENDING');
    const rejectedTickets = allTickets.filter(t => t.ticket_status === 'REJECTED' && !t.dismissed_by_company);
    const approvedTickets = allTickets.filter(t => t.ticket_status === 'APPROVED');

    console.log(`[DASHBOARD] Tickets for ${company_id}: pending=${pendingTickets.length}, rejected=${rejectedTickets.length}, approved=${approvedTickets.length}`);

    // Step 3: Calculate dashboard counts from approved tickets
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate ticket-based statistics
    const activeTickets = approvedTickets.filter(ticket => {
      const startDate = new Date(ticket.start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + ticket.days_required - 1);
      endDate.setHours(23, 59, 59, 999);
      
      // Active if today falls within start and end date
      return startDate <= today && today <= endDate;
    });

    const prebookedTickets = approvedTickets.filter(ticket => {
      const startDate = new Date(ticket.start_date);
      startDate.setHours(0, 0, 0, 0);
      // Pre-booked if start date is in the future
      return startDate > today;
    });

    const priorityTickets = approvedTickets.filter(ticket => {
      return ticket.days_required <= 2;
    });

    // Step 4: Enrich approved tickets with assigned autos
    const enrichedApprovedTickets = await Promise.all(
      approvedTickets.map(async (ticket) => {
        try {
          // Find all assignments for this company that overlap with the ticket date range
          const ticketStart = new Date(ticket.start_date);
          ticketStart.setHours(0, 0, 0, 0);
          const ticketEnd = new Date(ticketStart);
          ticketEnd.setDate(ticketEnd.getDate() + ticket.days_required - 1);
          ticketEnd.setHours(23, 59, 59, 999);

          // Get all assignments for this company
          const allAssignments = await Assignment.findByCompanyId(company_id);
          
          // Filter assignments that overlap with this ticket's date range
          const overlappingAssignments = allAssignments.filter(assignment => {
            const assignStart = new Date(assignment.start_date);
            assignStart.setHours(0, 0, 0, 0);
            const assignEnd = new Date(assignment.end_date);
            assignEnd.setHours(23, 59, 59, 999);
            
            // Check if assignment overlaps with ticket date range
            return assignStart <= ticketEnd && assignEnd >= ticketStart;
          });

          // Enrich each assignment with auto details
          const assignedAutos = await Promise.all(
            overlappingAssignments.map(async (assignment) => {
              try {
                const auto = await Auto.findById(assignment.auto_id);
                if (!auto) return null;

                const Area = require('../models/Area');
                const area = auto.area_id ? await Area.findById(auto.area_id) : null;

                return {
                  auto_no: auto.auto_no || 'Unknown',
                  owner_name: auto.owner_name || 'Unknown',
                  area_name: area?.name || auto.area_name || 'Unknown',
                  start_date: assignment.start_date,
                  end_date: assignment.end_date,
                  assignment_status: assignment.status,
                };
              } catch (err) {
                console.error(`[DASHBOARD] Error enriching auto for assignment:`, err);
                return null;
              }
            })
          );

          return {
            ...ticket,
            assigned_autos: assignedAutos.filter(a => a !== null),
          };
        } catch (err) {
          console.error(`[DASHBOARD] Error enriching ticket ${ticket.id}:`, err);
          return {
            ...ticket,
            assigned_autos: [],
          };
        }
      })
    );

    // Step 5: Always fetch assignments (regardless of company status)
    // Companies should see their approved/assigned autos even if not yet ACTIVE
    let activeAssignments = [];
    let prebookedAssignments = [];
    let completedAssignments = [];
    let priorityAssignments = [];
    let enrichedActive = [];
    let enrichedPrebooked = [];
    let enrichedCompleted = [];

    // Fetch assignments for this company
    const assignments = await Assignment.findByCompanyId(company_id);
    
    // Filter and update statuses if needed - mark COMPLETED if end_date has passed
    // (reuse today variable declared in Step 3)
    
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
    activeAssignments = assignments.filter(a => a.status === 'ACTIVE');
    prebookedAssignments = assignments.filter(a => a.status === 'PREBOOKED');
    completedAssignments = assignments.filter(a => a.status === 'COMPLETED');

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
    enrichedActive = await enrichAssignments(activeAssignments);
    
    // Enrich prebooked assignments with auto details
    enrichedPrebooked = await enrichAssignments(prebookedAssignments);
    
    // Enrich completed assignments with auto details
    enrichedCompleted = await enrichAssignments(completedAssignments);

    // Get priority assignments (2 days or less) from enriched data
    priorityAssignments = enrichedActive.filter(a => a.days_remaining >= 0 && a.days_remaining <= 2);

    // Step 6: Return unified dashboard response object
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
        rejected_tickets: rejectedTickets.length,
      },
      active_assignments: enrichedActive,
      prebooked_assignments: enrichedPrebooked,
      completed_assignments: enrichedCompleted,
      priority_assignments: priorityAssignments,
      // Include all ticket states in response
      tickets: allTickets,
      pending_tickets: pendingTickets,
      rejected_tickets: rejectedTickets,
      approved_tickets: enrichedApprovedTickets,
      // Notifications for frontend display
      notifications: {
        pending: pendingTickets.map(t => ({
          id: t.id,
          type: 'PENDING_TICKET',
          title: 'Request Pending',
          message: `Your request for ${t.autos_required} auto(s) is awaiting admin approval`,
          details: {
            autos_required: t.autos_required,
            days_required: t.days_required,
            area_name: t.area_name,
            start_date: t.start_date,
          }
        })),
        rejected: rejectedTickets.map(t => ({
          id: t.id,
          type: 'REJECTED_TICKET',
          title: 'Request Rejected',
          message: t.rejected_reason || 'Your request has been rejected',
          details: {
            autos_required: t.autos_required,
            days_required: t.days_required,
            rejected_reason: t.rejected_reason,
          }
        }))
      }
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
