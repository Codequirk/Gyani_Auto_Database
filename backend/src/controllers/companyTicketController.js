const CompanyTicket = require('../models/CompanyTicket');
const Company = require('../models/Company');
const Area = require('../models/Area');
const Assignment = require('../models/Assignment');
const Auto = require('../models/Auto');
const { calculateTotalDays, formatDateForDb } = require('../utils/dateUtils');

exports.createTicket = async (req, res, next) => {
  try {
    const { company_id, autos_required, days_required, start_date, area_id, notes } = req.body;

    if (!company_id || !autos_required || !days_required || !start_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify company exists
    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get area name if area_id provided
    let areaName = 'Any Area';
    if (area_id) {
      try {
        const area = await Area.findById(area_id);
        if (area) {
          areaName = area.name;
        }
      } catch (e) {
        // Area not found, use default
      }
    }

    const ticket = await CompanyTicket.create({
      company_id,
      autos_required: parseInt(autos_required),
      days_required: parseInt(days_required),
      start_date: new Date(start_date),
      area_id: area_id || null,
      area_name: areaName,
      ticket_status: 'PENDING',
      notes: notes || '',
    });

    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
};

exports.getCompanyTickets = async (req, res, next) => {
  try {
    const { company_id } = req.params;

    const tickets = await CompanyTicket.findByCompanyId(company_id);
    res.json(tickets);
  } catch (error) {
    next(error);
  }
};

exports.getPendingTickets = async (req, res, next) => {
  try {
    const tickets = await CompanyTicket.findPending();
    
    // Enrich tickets with company details
    const enrichedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        const company = await Company.findById(ticket.company_id);
        return {
          ...ticket,
          company: company ? {
            id: company.id,
            name: company.name,
            email: company.email,
            contact_person: company.contact_person,
            phone_number: company.phone_number,
          } : null,
        };
      })
    );
    
    res.json(enrichedTickets);
  } catch (error) {
    next(error);
  }
};

exports.getAllTickets = async (req, res, next) => {
  try {
    const tickets = await CompanyTicket.findAll();
    
    // Enrich tickets with company details
    const enrichedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        const company = await Company.findById(ticket.company_id);
        return {
          ...ticket,
          company: company ? {
            id: company.id,
            name: company.name,
            email: company.email,
            contact_person: company.contact_person,
            phone_number: company.phone_number,
          } : null,
        };
      })
    );
    
    res.json(enrichedTickets);
  } catch (error) {
    next(error);
  }
};

exports.approveTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { admin_id, auto_ids, cost_per_day } = req.body;

    if (!id || !admin_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ticket = await CompanyTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Approve the ticket
    const approvedTicket = await CompanyTicket.approve(id, admin_id);

    // Update company status to ACTIVE if still PENDING_APPROVAL
    const company = await Company.findById(ticket.company_id);
    if (company && company.company_status === 'PENDING_APPROVAL') {
      await Company.update(ticket.company_id, { company_status: 'ACTIVE', status: 'ACTIVE' });
    }

    // Create Assignment records for the approved ticket
    try {
      let assignmentAutos = auto_ids || [];
      
      console.log('[APPROVAL] Processing auto_ids:', assignmentAutos);
      
      // If no specific autos provided, get available autos in the requested area
      if (assignmentAutos.length === 0) {
        const filterCriteria = {};
        if (ticket.area_id) {
          filterCriteria.area_id = ticket.area_id;
        }
        
        const availableAutos = await Auto.findAll(filterCriteria);
        // Take as many available autos as required
        assignmentAutos = availableAutos
          .slice(0, ticket.autos_required)
          .map(auto => auto.id);
      }

      console.log('[APPROVAL] Creating assignments for autos:', assignmentAutos);
      console.log('[APPROVAL] Cost per day:', cost_per_day);

      // Create assignments for each auto
      const assignments = [];
      const { getDateNDaysFromNow, calculateTotalDays } = require('../utils/dateUtils');
      const Payment = require('../models/Payment');
      
      for (const autoId of assignmentAutos) {
        // Calculate end date: if 1 day is required, end date = start date (so add 0 days)
        // If 5 days required, add 4 days to start date (days 1,2,3,4,5)
        const endDate = getDateNDaysFromNow(ticket.days_required - 1, ticket.start_date);
        const totalDays = calculateTotalDays(ticket.start_date, endDate);
        
        // Determine assignment status based on start_date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ticketStart = new Date(ticket.start_date);
        ticketStart.setHours(0, 0, 0, 0);
        const assignmentStatus = ticketStart > today ? 'PREBOOKED' : 'ACTIVE';
        
        console.log(`[APPROVAL] Creating assignment for auto ${autoId}, dates: ${ticket.start_date} to ${endDate}, days: ${totalDays}, status: ${assignmentStatus}`);
        
        const assignment = await Assignment.create({
          auto_id: autoId,
          company_id: ticket.company_id,
          start_date: ticket.start_date,
          end_date: endDate,
          days: totalDays,
          status: assignmentStatus,
        });
        
        console.log(`[APPROVAL] Assignment created:`, assignment.id);
        assignments.push(assignment);

        // Update auto status after creating assignment
        try {
          await Auto.recalculateAndUpdateStatus(autoId);
          console.log(`[APPROVAL] Auto status recalculated for auto ${autoId}`);
        } catch (statusError) {
          console.error(`[APPROVAL] Warning: Failed to recalculate auto status for ${autoId}:`, statusError.message);
          // Don't throw - continue with other operations
        }

        // Create payment record if cost_per_day is provided
        if (cost_per_day !== undefined && cost_per_day !== null && cost_per_day > 0) {
          try {
            const auto = await Auto.findById(autoId);
            if (auto) {
              // Get area name if not present
              let areaName = auto.area_name || '';
              if (!areaName && auto.area_id) {
                const area = await Area.findById(auto.area_id);
                if (area) areaName = area.name;
              }

              await Payment.create({
                ticket_id: assignment.id,
                auto_id: autoId,
                company_id: ticket.company_id,
                auto_no: auto.auto_no,
                owner_name: auto.owner_name || '',
                area_id: auto.area_id || null,
                area_name: areaName,
                cost_per_day: parseFloat(cost_per_day),
                total_days: totalDays,
                total_cost: parseFloat(cost_per_day) * totalDays,
                payment_status: 'PENDING'
              });
              console.log(`[APPROVAL] Payment record created for auto ${autoId} with ${totalDays} days`);
            }
          } catch (paymentError) {
            console.error(`[APPROVAL] Warning: Payment creation failed for auto ${autoId}:`, paymentError.message);
            // Don't throw - continue with other payments
          }
        }
      }

      console.log(`[APPROVAL] Total assignments created: ${assignments.length}`);

      // Enrich assignments with company_name
      const Company = require('../models/Company');
      const enrichedAssignments = await Promise.all(
        assignments.map(async (a) => {
          const company = await Company.findById(a.company_id);
          return { ...a, company_name: company?.name || 'Unknown' };
        })
      );

      res.json({
        ticket: approvedTicket,
        assignments: enrichedAssignments,
        message: `Ticket approved, company activated, and ${enrichedAssignments.length} assignment(s) created`,
      });
    } catch (assignmentError) {
      // Log assignment creation error but still return successful ticket approval
      console.error('[APPROVAL] Error creating assignments:', assignmentError);
      res.json({
        ticket: approvedTicket,
        assignments: [],
        message: 'Ticket approved and company activated, but assignment creation failed',
        error: assignmentError.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.rejectTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Ticket ID is required' });
    }

    const ticket = await CompanyTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Reject the ticket
    const rejectedTicket = await CompanyTicket.reject(id, reason || '');

    // Update company status to REJECTED if this is first ticket
    const companyTickets = await CompanyTicket.findByCompanyId(ticket.company_id);
    const hasAnyApproved = companyTickets.some(t => t.ticket_status === 'APPROVED');
    
    if (!hasAnyApproved) {
      await Company.update(ticket.company_id, { company_status: 'REJECTED' });
    }

    res.json({
      ticket: rejectedTicket,
      message: 'Ticket rejected',
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Ticket ID is required' });
    }

    const ticket = await CompanyTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const updated = await CompanyTicket.update(id, { admin_notes });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tickets/:id/available-autos
 * 
 * Fetch available autos for a ticket with deterministic sorting.
 * 
 * BACKEND OWNS ALL LOGIC:
 * - Filtering by area
 * - Excluding overlapping assignments
 * - Calculating display_status
 * - Sorting by priority (IDLE > ACTIVE > PREBOOKED) + auto_no
 * 
 * FRONTEND RECEIVES: Sorted array only, NO mutations allowed
 */
exports.getAvailableAutosForTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get ticket
    const ticket = await CompanyTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    console.log(`\n[AUTO-SUGGEST] Fetching autos for ticket ${id}`);
    console.log(`  Ticket area_id: ${ticket.area_id || 'Any Area'}`);
    console.log(`  Request dates: ${ticket.start_date} to ${new Date(new Date(ticket.start_date).getTime() + (ticket.days_required - 1) * 86400000)}`);

    // ===== STEP 1: Fetch autos from database =====
    const filterCriteria = {};
    if (ticket.area_id) {
      filterCriteria.area_id = ticket.area_id;
    }
    const allAutos = await Auto.findAll(filterCriteria);
    console.log(`  Found ${allAutos.length} autos in area`);

    // ===== STEP 2: Fetch all assignments to check overlaps =====
    const allAssignments = await Assignment.findAll();
    console.log(`  Total assignments in DB: ${allAssignments.length}`);

    // ===== STEP 3: Filter autos - exclude those with overlapping assignments =====
    const ticketStartDate = new Date(ticket.start_date);
    ticketStartDate.setHours(0, 0, 0, 0);
    
    const ticketEndDate = new Date(ticketStartDate);
    ticketEndDate.setDate(ticketEndDate.getDate() + (ticket.days_required - 1));
    ticketEndDate.setHours(23, 59, 59, 999);

    console.log(`  Ticket date range: ${ticketStartDate.toISOString()} to ${ticketEndDate.toISOString()}`);

    const availableAutos = allAutos.filter(auto => {
      // Check if this auto has any ACTIVE or PREBOOKED assignments overlapping with ticket dates
      const hasConflict = allAssignments.some(assignment => {
        if (assignment.auto_id !== auto.id) return false;
        if (!['ACTIVE', 'PREBOOKED'].includes(assignment.status)) return false;

        const assignStart = new Date(assignment.start_date);
        assignStart.setHours(0, 0, 0, 0);
        
        const assignEnd = new Date(assignment.end_date);
        assignEnd.setHours(23, 59, 59, 999);

        // Check for overlap
        const overlaps = !(ticketEndDate < assignStart || ticketStartDate > assignEnd);
        return overlaps;
      });

      return !hasConflict;
    });

    console.log(`  Available autos (no conflicts): ${availableAutos.length}`);

    // ===== STEP 4: Calculate display_status for each auto =====
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const autosWithStatus = availableAutos.map(auto => {
      // Find all ACTIVE or PREBOOKED assignments for this auto
      const relevantAssignments = allAssignments.filter(a => 
        a.auto_id === auto.id && ['ACTIVE', 'PREBOOKED'].includes(a.status)
      );

      // Calculate display_status based on TODAY
      let display_status = 'IDLE'; // Default if no assignments
      
      for (const assignment of relevantAssignments) {
        const assignStart = new Date(assignment.start_date);
        assignStart.setHours(0, 0, 0, 0);
        
        const assignEnd = new Date(assignment.end_date);
        assignEnd.setHours(0, 0, 0, 0);

        // Check if today falls within this assignment
        if (today >= assignStart && today <= assignEnd) {
          display_status = 'ACTIVE';
          break; // ACTIVE takes priority
        }
        // Check if assignment starts in future
        else if (today < assignStart) {
          if (display_status !== 'ACTIVE') {
            display_status = 'PREBOOKED'; // Only set if not already ACTIVE
          }
        }
      }

      return {
        ...auto,
        display_status,
      };
    });

    console.log(`  Display statuses calculated for ${autosWithStatus.length} autos`);

    // ===== STEP 5: Sort by priority (IDLE > ACTIVE > PREBOOKED) + secondary by auto_no =====
    const statusPriority = { 'IDLE': 0, 'ACTIVE': 1, 'PREBOOKED': 2 };

    const sortedAutos = autosWithStatus.sort((a, b) => {
      // Primary: display_status priority
      const statusDiff = statusPriority[a.display_status] - statusPriority[b.display_status];
      if (statusDiff !== 0) return statusDiff;

      // Secondary: auto_no alphabetically (stable)
      return (a.auto_no || '').localeCompare(b.auto_no || '');
    });

    console.log(`  ✓ Sorted autos:`);
    sortedAutos.forEach((auto, idx) => {
      console.log(`    [${idx}] ${auto.auto_no} - ${auto.display_status} (${auto.owner_name})`);
    });

    // ===== STEP 6: Count by status for metadata =====
    const metadata = {
      idle: sortedAutos.filter(a => a.display_status === 'IDLE').length,
      active: sortedAutos.filter(a => a.display_status === 'ACTIVE').length,
      prebooked: sortedAutos.filter(a => a.display_status === 'PREBOOKED').length,
    };

    console.log(`  Metadata: IDLE=${metadata.idle}, ACTIVE=${metadata.active}, PREBOOKED=${metadata.prebooked}`);
    console.log(`[AUTO-SUGGEST] ✓ Response ready with ${sortedAutos.length} autos\n`);

    // ===== RETURN: Single sorted array + metadata =====
    res.json({
      available_autos: sortedAutos,
      meta: metadata,
    });

  } catch (error) {
    console.error('[AUTO-SUGGEST] Error:', error);
    next(error);
  }
};