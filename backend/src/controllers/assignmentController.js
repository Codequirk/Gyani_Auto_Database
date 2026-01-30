const Assignment = require('../models/Assignment');
const Auto = require('../models/Auto');
const { computeDaysRemaining, computeDaysRemainingByStatus, calculateTotalDays, formatDateForDb, getDateNDaysFromNow } = require('../utils/dateUtils');
const { validateAssignmentDates } = require('../utils/assignmentValidation');
const { calculateAutoStatus } = require('../utils/statusCalculator');

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
 * Helper function to update assignment status based on current date
 * Automatically transitions assignments through their lifecycle
 */
async function updateAssignmentStatusIfNeeded(assignmentId) {
  try {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return;
    
    const correctStatus = getCorrectAssignmentStatus(assignment.start_date, assignment.end_date);
    
    // Only update if status has changed
    if (assignment.status !== correctStatus) {
      await Assignment.updateStatus(assignmentId, correctStatus);
    }
  } catch (error) {
    console.error(`Error updating assignment status for ${assignmentId}:`, error);
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
    
    // Use the new calculateAutoStatus utility
    const correctAutoStatus = calculateAutoStatus(refreshedAssignments);
    
    // Update auto status if it changed
    const auto = await Auto.findById(autoId);
    if (auto.status !== correctAutoStatus) {
      await Auto.updateStatus(autoId, correctAutoStatus);
    }
  } catch (error) {
    console.error(`Error updating auto status for ${autoId}:`, error);
  }
}

exports.createAssignment = async (req, res, next) => {
  try {
    const { auto_id, company_id, days, start_date, is_prebooked } = req.body;

    if (!auto_id || !company_id || !days) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const auto = await Auto.findById(auto_id);
    if (!auto) {
      return res.status(404).json({ error: 'Auto not found' });
    }

    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = getDateNDaysFromNow(days, startDate);
    const totalDays = calculateTotalDays(startDate, endDate);

    // Get auto with all assignments for validation
    const autoWithAssignments = await Auto.getWithAssignments(auto_id);

    // Validate dates
    const validation = validateAssignmentDates(autoWithAssignments, startDate, endDate);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    // Determine status based on start_date (if start is today or before, it's ACTIVE; otherwise PREBOOKED)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkStartDate = new Date(startDate);
    checkStartDate.setHours(0, 0, 0, 0);
    const assignmentStatus = checkStartDate <= today ? 'ACTIVE' : 'PREBOOKED';

    // Get company name for enrichment
    const Company = require('../models/Company');
    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const assignment = await Assignment.create({
      auto_id,
      company_id,
      start_date: formatDateForDb(startDate),
      end_date: formatDateForDb(endDate),
      days: totalDays,
      status: assignmentStatus,
    });

    // Update auto status based on assignment status
    if (assignmentStatus === 'PREBOOKED') {
      await Auto.updateStatus(auto_id, 'PREBOOKED');
    } else {
      await Auto.updateStatus(auto_id, 'ACTIVE');
    }

    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
};

exports.bulkAssignAutos = async (req, res, next) => {
  try {
    console.log('[BULK_ASSIGN] Request body:', JSON.stringify(req.body, null, 2));
    const { auto_ids, company_id, days, start_date, cost_per_day, is_prebooked } = req.body;

    if (!auto_ids || !Array.isArray(auto_ids) || auto_ids.length === 0 || !company_id || !days) {
      console.log('[BULK_ASSIGN] Validation failed:', { auto_ids, company_id, days });
      return res.status(400).json({ error: 'Missing or invalid required fields' });
    }

    // Filter out null/undefined auto_ids
    const validAutoIds = auto_ids.filter(id => id && id !== null && id !== undefined);
    if (validAutoIds.length === 0) {
      return res.status(400).json({ error: 'No valid auto IDs provided' });
    }

    // Get company name
    const Company = require('../models/Company');
    const company = await Company.findById(company_id);
    console.log('[BULK_ASSIGN] Company found:', company?.id, company?.name);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = getDateNDaysFromNow(days, startDate);
    console.log('[BULK_ASSIGN] Dates:', { start_date, startDate: startDate.toISOString(), endDate: endDate.toISOString(), totalDays: calculateTotalDays(startDate, endDate) });
    const totalDays = calculateTotalDays(startDate, endDate);

    // Validate dates for each auto
    const validationErrors = [];
    for (const autoId of validAutoIds) {
      const auto = await Auto.getWithAssignments(autoId);
      if (!auto) {
        validationErrors.push({ auto_id: autoId, error: 'Auto not found' });
        continue;
      }

      const validation = validateAssignmentDates(auto, startDate, endDate);
      if (!validation.isValid) {
        validationErrors.push({ auto_id: autoId, error: validation.error });
      }
    }

    // If any validation errors, return them all
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed for some autos',
        details: validationErrors
      });
    }

    // Determine status based on start_date (if start is today or before, it's ACTIVE; otherwise PREBOOKED)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkStartDate = new Date(startDate);
    checkStartDate.setHours(0, 0, 0, 0);
    const assignmentStatus = checkStartDate <= today ? 'ACTIVE' : 'PREBOOKED';

    const assignmentData = validAutoIds.map(auto_id => ({
      auto_id,
      company_id,
      start_date: formatDateForDb(startDate),
      end_date: formatDateForDb(endDate),
      days: totalDays,
      status: assignmentStatus,
    }));

    const assignments = await Assignment.createBulk(assignmentData);
    console.log('[BULK_ASSIGN] Assignments created successfully:', assignments.length);

    // Create payment records if cost_per_day is provided
    const Payment = require('../models/Payment');
    if (cost_per_day !== undefined && cost_per_day !== null && cost_per_day > 0) {
      console.log('[BULK_ASSIGN] Creating payment records with cost_per_day:', cost_per_day);
      
      for (const assignment of assignments) {
        const auto = await Auto.findById(assignment.auto_id);
        if (auto) {
          try {
            await Payment.create({
              ticket_id: assignment.id,
              auto_id: assignment.auto_id,
              company_id: company_id,
              auto_no: auto.auto_no,
              owner_name: auto.owner_name || '',
              area_id: auto.area_id || null,
              area_name: auto.area_name || '',
              cost_per_day: parseFloat(cost_per_day),
              total_days: totalDays,
              total_cost: parseFloat(cost_per_day) * totalDays,
              payment_status: 'PENDING'
            });
          } catch (paymentError) {
            console.error('[BULK_ASSIGN] Warning: Payment creation failed for auto', assignment.auto_id, ':', paymentError.message);
            // Don't throw - continue with other payments
          }
        }
      }
      console.log('[BULK_ASSIGN] Payment records created successfully');
    }

    // Update auto statuses based on assignment status
    try {
      if (assignmentStatus === 'PREBOOKED') {
        await Promise.all(validAutoIds.map(id => Auto.updateStatus(id, 'PREBOOKED')));
      } else {
        await Promise.all(validAutoIds.map(id => Auto.updateStatus(id, 'ACTIVE')));
      }
      console.log('[BULK_ASSIGN] Auto statuses updated successfully');
    } catch (statusError) {
      console.error('[BULK_ASSIGN] Warning: Auto status update failed (non-critical):', statusError.message);
      // Don't throw - this is non-critical
    }

    res.status(201).json(assignments);
  } catch (error) {
    console.error('[BULK_ASSIGN] Error:', error);
    console.error('[BULK_ASSIGN] Error stack:', error.stack);
    next(error);
  }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { company_id, start_date, end_date, status, days } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const autoId = assignment.auto_id;

    // Prepare update data
    const updateData = {};
    if (company_id) updateData.company_id = company_id;
    if (start_date) updateData.start_date = start_date;
    if (end_date) updateData.end_date = end_date;
    if (days) updateData.days = parseInt(days);

    // If dates changed but status not specified, calculate correct status based on dates
    if ((start_date || end_date) && !status) {
      const newStartDate = start_date || assignment.start_date;
      const newEndDate = end_date || assignment.end_date;
      const newAssignmentStatus = getCorrectAssignmentStatus(newStartDate, newEndDate);
      updateData.status = newAssignmentStatus;
    } else if (status) {
      updateData.status = status;
    }

    const updated = await Assignment.update(id, updateData);

    // Update auto status based on all its assignments (recalculate all statuses)
    await updateAutoStatusIfExpired(autoId);

    // Enrich the response with company_name and days_remaining
    const Company = require('../models/Company');
    if (updated && updated.company_id) {
      const company = await Company.findById(updated.company_id);
      updated.company_name = company?.name || 'Unknown';
    }
    updated.days_remaining = computeDaysRemaining(updated.end_date);

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.getActiveAssignments = async (req, res, next) => {
  try {
    const assignments = await Assignment.findActive();
    
    // Check each assignment for expiration and update auto status if needed
    for (const assignment of assignments) {
      const daysRemaining = computeDaysRemaining(assignment.end_date);
      if (daysRemaining === 0) {
        await updateAutoStatusIfExpired(assignment.auto_id);
      }
    }
    
    const enriched = assignments.map(a => ({
      ...a,
      days_remaining: computeDaysRemaining(a.end_date),
    }));
    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

exports.getAssignmentsByCompany = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Get all assignments for this company (all statuses: ACTIVE, PREBOOKED, COMPLETED, IDLE)
    const assignments = await Assignment.findByCompanyId(companyId);
    
    // Check each assignment for expiration and update auto status if needed
    const uniqueAutos = new Set(assignments.map(a => a.auto_id));
    for (const autoId of uniqueAutos) {
      await updateAutoStatusIfExpired(autoId);
    }
    
    const enriched = assignments.map(a => ({
      ...a,
      days_remaining: computeDaysRemainingByStatus(a.start_date, a.end_date, a.status),
    }));
    
    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

exports.getPriorityAssignments = async (req, res, next) => {
  try {
    const daysThreshold = req.query.threshold ? parseInt(req.query.threshold) : 2;
    const autos = await Auto.getPriorityAutos(daysThreshold);
    
    const enriched = await Promise.all(autos.map(async (auto) => {
      const assignments = await Assignment.findByAutoId(auto.id);
      const activeAssignment = assignments.find(a => a.status === 'ACTIVE');
      
      // Check if assignment has expired
      if (activeAssignment) {
        const daysRemaining = computeDaysRemaining(activeAssignment.end_date);
        if (daysRemaining === 0) {
          await updateAutoStatusIfExpired(auto.id);
        }
      }
      
      return {
        ...auto,
        days_remaining: activeAssignment ? computeDaysRemaining(activeAssignment.end_date) : null,
        end_date: activeAssignment?.end_date,
        company_name: activeAssignment?.company_name,
      };
    }));

    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

exports.getCompletedAssignments = async (req, res, next) => {
  try {
    const { autoId } = req.query;
    
    // Get completed assignments
    const assignments = await Assignment.findCompleted(autoId || null);
    
    // Enrich with auto and company data
    const Company = require('../models/Company');
    const enriched = await Promise.all(assignments.map(async (assignment) => {
      const auto = await Auto.findById(assignment.auto_id);
      const company = await Company.findById(assignment.company_id);
      
      // Calculate days since completion
      const endDate = new Date(assignment.end_date);
      endDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysSinceCompletion = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
      
      // Calculate days until deletion (30 days after end_date)
      const daysUntilDeletion = 30 - daysSinceCompletion;
      
      return {
        id: assignment.id,
        auto_id: assignment.auto_id,
        auto_no: auto?.auto_no,
        company_id: assignment.company_id,
        company_name: company?.name || 'Unknown',
        start_date: assignment.start_date,
        end_date: assignment.end_date,
        status: 'COMPLETED',
        days_since_completion: daysSinceCompletion,
        days_until_deletion: daysUntilDeletion,
        created_at: assignment.created_at,
      };
    }));
    
    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

exports.deleteByAutoId = async (req, res, next) => {
  try {
    const { autoId } = req.params;

    if (!autoId) {
      return res.status(400).json({ error: 'Auto ID is required' });
    }

    // Delete all assignments for the auto
    const result = await Assignment.deleteByAutoId(autoId);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'No assignments found for this auto' });
    }

    // Update auto status to IDLE
    await Auto.updateStatus(autoId, 'IDLE');

    res.json({ 
      message: `${result.deletedCount} assignment(s) deleted successfully. Auto status updated to IDLE.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Assignment ID is required' });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const autoId = assignment.auto_id;

    // Delete the assignment
    const result = await Assignment.deleteById(id);

    if (!result) {
      return res.status(404).json({ error: 'Failed to delete assignment' });
    }

    // Check remaining assignments for this auto
    const remainingAssignments = await Assignment.findByAutoId(autoId);
    
    // If no more active/prebooked assignments, update auto status to IDLE
    const hasActiveAssignments = remainingAssignments.some(a => a.status === 'ACTIVE' || a.status === 'PREBOOKED');
    if (!hasActiveAssignments) {
      await Auto.updateStatus(autoId, 'IDLE');
    }

    res.json({ 
      message: 'Assignment deleted successfully',
      autoId: autoId
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteOldCompletedAssignments = async (req, res, next) => {
  try {
    console.log('[CLEANUP] Starting cleanup of old completed assignments...');
    
    // Find assignments eligible for deletion (30+ days after end_date)
    const toDelete = await Assignment.findEligibleForDeletion();
    console.log(`[CLEANUP] Found ${toDelete.length} assignments eligible for deletion`);
    
    if (toDelete.length === 0) {
      return res.json({
        message: 'No assignments to delete',
        deletedCount: 0
      });
    }
    
    // Group by auto_id to update statuses later
    const affectedAutoIds = new Set(toDelete.map(a => a.auto_id));
    
    // Delete the assignments
    const deletedCount = await Assignment.deleteOldCompleted();
    console.log(`[CLEANUP] Deleted ${deletedCount} old completed assignments`);
    
    // Update auto statuses for affected autos
    for (const autoId of affectedAutoIds) {
      await updateAutoStatusIfExpired(autoId);
    }
    
    console.log(`[CLEANUP] Updated status for ${affectedAutoIds.size} autos`);
    
    res.json({
      message: `Successfully deleted ${deletedCount} old completed assignments (30+ days after completion)`,
      deletedCount,
      affectedAutos: affectedAutoIds.size
    });
  } catch (error) {
    next(error);
  }
};

exports.bulkUpdateAssignments = async (req, res, next) => {
  try {
    console.log('[BULK_UPDATE] Request body:', JSON.stringify(req.body, null, 2));
    const { auto_ids, company_id, days, start_date } = req.body;

    if (!auto_ids || !Array.isArray(auto_ids) || auto_ids.length === 0 || !company_id || !days || !start_date) {
      console.log('[BULK_UPDATE] Validation failed:', { auto_ids, company_id, days, start_date });
      return res.status(400).json({ error: 'Missing or invalid required fields' });
    }

    // Filter out null/undefined auto_ids
    const validAutoIds = auto_ids.filter(id => id && id !== null && id !== undefined);
    if (validAutoIds.length === 0) {
      return res.status(400).json({ error: 'No valid auto IDs provided' });
    }

    // Get company name
    const Company = require('../models/Company');
    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const startDate = new Date(start_date);
    const endDate = getDateNDaysFromNow(days, startDate);
    const totalDays = calculateTotalDays(startDate, endDate);

    // Determine status based on start_date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkStartDate = new Date(startDate);
    checkStartDate.setHours(0, 0, 0, 0);
    const assignmentStatus = checkStartDate <= today ? 'ACTIVE' : 'PREBOOKED';

    // Delete all existing assignments for these autos
    const deletedCount = {};
    for (const autoId of validAutoIds) {
      const result = await Assignment.deleteByAutoId(autoId);
      deletedCount[autoId] = result.deletedCount || 0;
    }

    // Create new assignments for all autos
    const assignmentData = validAutoIds.map(auto_id => ({
      auto_id,
      company_id,
      start_date: formatDateForDb(startDate),
      end_date: formatDateForDb(endDate),
      days: totalDays,
      status: assignmentStatus,
    }));

    const assignments = await Assignment.createBulk(assignmentData);
    console.log('[BULK_UPDATE] Assignments created successfully:', assignments.length);

    // Update auto statuses
    try {
      if (assignmentStatus === 'PREBOOKED') {
        await Promise.all(validAutoIds.map(id => Auto.updateStatus(id, 'PREBOOKED')));
      } else {
        await Promise.all(validAutoIds.map(id => Auto.updateStatus(id, 'ACTIVE')));
      }
      console.log('[BULK_UPDATE] Auto statuses updated successfully');
    } catch (statusError) {
      console.error('[BULK_UPDATE] Warning: Auto status update failed (non-critical):', statusError.message);
      // Don't throw - assignments were already created
    }

    res.status(200).json({
      message: `${assignments.length} assignments updated successfully`,
      assignments,
      deletedCount: Object.values(deletedCount).reduce((a, b) => a + b, 0)
    });
  } catch (error) {
    console.error('[BULK_UPDATE] Error:', error);
    console.error('[BULK_UPDATE] Error stack:', error.stack);
    next(error);
  }
};

