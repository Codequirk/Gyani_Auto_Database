const Payment = require('../models/Payment');
const CompanyTicket = require('../models/CompanyTicket');
const Auto = require('../models/Auto');
const Area = require('../models/Area');
const Assignment = require('../models/Assignment');

/**
 * Add payment for an auto in a ticket
 * Admin manually assigns cost per day for each auto
 */
exports.addPayment = async (req, res, next) => {
  try {
    const { ticket_id, auto_id, cost_per_day, notes } = req.body;
    const admin_id = req.admin?.id;

    if (!ticket_id || !auto_id || cost_per_day === undefined) {
      return res.status(400).json({ error: 'Missing required fields: ticket_id, auto_id, cost_per_day' });
    }

    if (cost_per_day < 0) {
      return res.status(400).json({ error: 'Cost per day cannot be negative' });
    }

    // Verify ticket exists
    const ticket = await CompanyTicket.findById(ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Verify auto exists
    const auto = await Auto.findById(auto_id);
    if (!auto) {
      return res.status(404).json({ error: 'Auto not found' });
    }

    // Check if payment already exists for this auto and ticket
    const existingPayments = await Payment.findByTicketId(ticket_id);
    if (existingPayments.some(p => p.auto_id === auto_id)) {
      return res.status(409).json({ error: 'Payment already exists for this auto in this ticket' });
    }

    // Get area name
    let areaName = '';
    if (auto.area_id) {
      try {
        const area = await Area.findById(auto.area_id);
        if (area) areaName = area.name;
      } catch (e) {
        // Area not found
      }
    }

    // Create payment record
    const payment = await Payment.create({
      ticket_id,
      auto_id,
      company_id: ticket.company_id,
      area_id: auto.area_id,
      area_name: areaName,
      auto_no: auto.auto_no,
      owner_name: auto.owner_name,
      cost_per_day: parseFloat(cost_per_day),
      total_days: ticket.days_required,
      assigned_by_admin_id: admin_id,
      notes: notes || '',
    });

    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all payments for a ticket
 */
exports.getTicketPayments = async (req, res, next) => {
  try {
    const { ticket_id } = req.params;

    const ticket = await CompanyTicket.findById(ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const payments = await Payment.findByTicketId(ticket_id);
    
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment summary for a ticket
 * Includes total cost, payment count by status, etc.
 */
exports.getTicketPaymentSummary = async (req, res, next) => {
  try {
    const { ticket_id } = req.params;

    const ticket = await CompanyTicket.findById(ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const summary = await Payment.getTicketPaymentsSummary(ticket_id);
    
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

/**
 * Update payment details (cost, status, notes)
 */
exports.updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cost_per_day, payment_status, notes } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const updateData = {};
    
    if (cost_per_day !== undefined) {
      if (cost_per_day < 0) {
        return res.status(400).json({ error: 'Cost per day cannot be negative' });
      }
      updateData.cost_per_day = parseFloat(cost_per_day);
    }

    if (payment_status !== undefined) {
      const validStatuses = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'];
      if (!validStatuses.includes(payment_status)) {
        return res.status(400).json({ error: `Invalid payment_status. Must be one of: ${validStatuses.join(', ')}` });
      }
      updateData.payment_status = payment_status;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedPayment = await Payment.update(id, updateData);
    
    res.json(updatedPayment);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a payment record
 */
exports.deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await Payment.delete(id);
    
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all payments (for admin dashboard)
 */
exports.getAllPayments = async (req, res, next) => {
  try {
    const payments = await Payment.findAll();
    
    // Enrich payments with assignment data (start_date, end_date)
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        try {
          const assignment = await Assignment.findById(payment.ticket_id);
          return {
            ...payment,
            start_date: assignment?.start_date || null,
            end_date: assignment?.end_date || null,
          };
        } catch (e) {
          // If assignment not found, just return payment without dates
          return {
            ...payment,
            start_date: null,
            end_date: null,
          };
        }
      })
    );
    
    res.json(enrichedPayments);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all payments for a company
 */
exports.getCompanyPayments = async (req, res, next) => {
  try {
    const { company_id } = req.params;

    const payments = await Payment.findByCompanyId(company_id);
    
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

/**
 * Get payments by status
 */
exports.getPaymentsByStatus = async (req, res, next) => {
  try {
    const { status } = req.params;
    
    const validStatuses = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const payments = await Payment.findByStatus(status);
    
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update payment status for multiple payments
 */
exports.bulkUpdatePaymentStatus = async (req, res, next) => {
  try {
    const { payment_ids, status } = req.body;

    if (!payment_ids || !Array.isArray(payment_ids) || payment_ids.length === 0) {
      return res.status(400).json({ error: 'payment_ids must be a non-empty array' });
    }

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const validStatuses = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updates = await Promise.all(
      payment_ids.map(id => Payment.update(id, { payment_status: status }))
    );

    res.json({
      updated_count: updates.length,
      payments: updates,
      message: `Updated ${updates.length} payment(s) to status: ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get auto availability for adding payment
 * Shows which autos are not yet added as payments for this ticket
 */
exports.getAvailableAutosForTicketPayment = async (req, res, next) => {
  try {
    const { ticket_id } = req.params;

    const ticket = await CompanyTicket.findById(ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Get all payments already added for this ticket
    const existingPayments = await Payment.findByTicketId(ticket_id);
    const addedAutoIds = new Set(existingPayments.map(p => p.auto_id));

    // Get autos in the ticket's area (or all if no area specified)
    const filterCriteria = {};
    if (ticket.area_id) {
      filterCriteria.area_id = ticket.area_id;
    }

    const allAutos = await Auto.findAll(filterCriteria);

    // Filter out already added autos
    const availableAutos = allAutos.filter(auto => !addedAutoIds.has(auto.id));

    // Limit to the number of autos still needed
    const autosNeeded = ticket.autos_required - existingPayments.length;
    const suggestedAutos = availableAutos.slice(0, Math.max(0, autosNeeded));

    res.json({
      ticket_id,
      autos_required: ticket.autos_required,
      autos_added: existingPayments.length,
      autos_remaining: autosNeeded,
      available_autos: suggestedAutos,
    });
  } catch (error) {
    next(error);
  }
};
