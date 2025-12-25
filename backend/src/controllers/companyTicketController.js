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
    const { admin_id, auto_ids } = req.body;

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
      await Company.update(ticket.company_id, { company_status: 'ACTIVE' });
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

      // Create assignments for each auto
      const assignments = [];
      const { getDateNDaysFromNow } = require('../utils/dateUtils');
      
      for (const autoId of assignmentAutos) {
        const endDate = getDateNDaysFromNow(ticket.days_required - 1, ticket.start_date);
        
        console.log(`[APPROVAL] Creating assignment for auto ${autoId}, dates: ${ticket.start_date} to ${endDate}`);
        
        const assignment = await Assignment.create({
          auto_id: autoId,
          company_id: ticket.company_id,
          company_name: company?.name || 'Unknown Company',
          start_date: ticket.start_date,
          end_date: endDate,
          status: new Date(ticket.start_date) > new Date() ? 'PREBOOKED' : 'ACTIVE',
          notes: `From ticket approval: ${ticket.notes || 'No notes'}`,
        });
        
        console.log(`[APPROVAL] Assignment created:`, assignment.id);
        assignments.push(assignment);
      }

      console.log(`[APPROVAL] Total assignments created: ${assignments.length}`);

      res.json({
        ticket: approvedTicket,
        assignments: assignments,
        message: `Ticket approved, company activated, and ${assignments.length} assignment(s) created`,
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
 * Suggest autos for a ticket based on:
 * 1. Priority: Idle autos first, then autos that are free on the requested dates
 * 2. Return metadata showing auto type (Idle vs Assigned)
 */
exports.suggestAutosForTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await CompanyTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Get all autos in the requested area (or all autos if no area specified)
    const filterCriteria = {};
    if (ticket.area_id) {
      filterCriteria.area_id = ticket.area_id;
    }
    
    const allAutos = await Auto.findAll(filterCriteria);
    
    // Convert dates to comparable format
    const startDate = new Date(ticket.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + ticket.days_required - 1);

    // Categorize autos into IDLE and ASSIGNED (free on dates)
    const idleAutos = [];
    const assignableAutos = [];

    for (const auto of allAutos) {
      // Get all assignments for this auto
      const assignments = await Assignment.findByAutoId(auto.id);
      
      // Check if auto has any active or prebooked assignments that overlap with requested dates
      const hasConflict = assignments.some(assignment => {
        const assignStart = new Date(assignment.start_date);
        const assignEnd = new Date(assignment.end_date);
        assignStart.setHours(0, 0, 0, 0);
        assignEnd.setHours(23, 59, 59, 999);
        
        // Check if date ranges overlap
        return !(endDate < assignStart || startDate > assignEnd);
      });

      if (hasConflict) {
        // Auto has conflicting assignment, skip it
        continue;
      }

      if (assignments.length === 0) {
        // Auto has no assignments at all - it's IDLE
        idleAutos.push({
          ...auto,
          type: 'IDLE',
          availability: 'Never assigned',
        });
      } else {
        // Auto has assignments but none conflict with requested dates - it's ASSIGNABLE
        assignableAutos.push({
          ...auto,
          type: 'ASSIGNED',
          availability: `Can be assigned on ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        });
      }
    }

    // Combine: IDLE first, then ASSIGNED
    const suggestedAutos = [...idleAutos, ...assignableAutos];

    // Select the required number of autos
    const selectedAutos = suggestedAutos.slice(0, ticket.autos_required);
    const selectedAutoIds = selectedAutos.map(auto => auto.id);

    // Count by type
    const idleCount = selectedAutos.filter(a => a.type === 'IDLE').length;
    const assignedCount = selectedAutos.filter(a => a.type === 'ASSIGNED').length;

    console.log(`[SUGGEST] Ticket ${id}: Selected ${selectedAutoIds.length} autos (${idleCount} idle, ${assignedCount} assigned)`);

    res.json({
      ticket_id: id,
      autos_required: ticket.autos_required,
      suggested_autos: selectedAutos,
      suggested_auto_ids: selectedAutoIds,
      summary: {
        total_suggested: selectedAutos.length,
        idle_count: idleCount,
        assigned_count: assignedCount,
        available_total: suggestedAutos.length,
      },
      dates: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('[SUGGEST] Error suggesting autos:', error);
    next(error);
  }
};