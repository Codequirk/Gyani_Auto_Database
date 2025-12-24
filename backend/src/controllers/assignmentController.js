const Assignment = require('../models/Assignment');
const Auto = require('../models/Auto');
const { computeDaysRemaining, calculateTotalDays, formatDateForDb, getDateNDaysFromNow } = require('../utils/dateUtils');
const { validateAssignmentDates } = require('../utils/assignmentValidation');

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
      company_name: company.name,
      start_date: formatDateForDb(startDate),
      end_date: formatDateForDb(endDate),
      days: totalDays,
      status: assignmentStatus,
    });

    // Update auto status based on assignment status
    if (assignmentStatus === 'PREBOOKED') {
      await Auto.updateStatus(auto_id, 'PRE_ASSIGNED');
    } else {
      await Auto.updateStatus(auto_id, 'ASSIGNED');
    }

    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
};

exports.bulkAssignAutos = async (req, res, next) => {
  try {
    const { auto_ids, company_id, days, start_date, is_prebooked } = req.body;

    if (!auto_ids || !Array.isArray(auto_ids) || auto_ids.length === 0 || !company_id || !days) {
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

    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = getDateNDaysFromNow(days, startDate);
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
      company_name: company.name,
      start_date: formatDateForDb(startDate),
      end_date: formatDateForDb(endDate),
      days: totalDays,
      status: assignmentStatus,
    }));

    const assignments = await Assignment.createBulk(assignmentData);

    // Update auto statuses based on assignment status
    if (assignmentStatus === 'PREBOOKED') {
      await Promise.all(validAutoIds.map(id => Auto.updateStatus(id, 'PRE_ASSIGNED')));
    } else {
      await Promise.all(validAutoIds.map(id => Auto.updateStatus(id, 'ASSIGNED')));
    }

    res.status(201).json(assignments);
  } catch (error) {
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

    // Prepare update data
    const updateData = {};
    if (company_id) updateData.company_id = company_id;
    if (start_date) updateData.start_date = start_date;
    if (end_date) updateData.end_date = end_date;
    if (status) updateData.status = status;
    if (days) updateData.days = parseInt(days);

    const updated = await Assignment.update(id, updateData);

    // If completing assignment, mark auto as IDLE
    if (status === 'COMPLETED') {
      await Auto.updateStatus(assignment.auto_id, 'IDLE');
    }

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

    // Get all assignments for this company (both active and prebooked)
    const assignments = await Assignment.findByCompanyId(companyId);
    
    const enriched = assignments.map(a => ({
      ...a,
      days_remaining: computeDaysRemaining(a.end_date),
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

exports.bulkUpdateAssignments = async (req, res, next) => {
  try {
    const { auto_ids, company_id, days, start_date } = req.body;

    if (!auto_ids || !Array.isArray(auto_ids) || auto_ids.length === 0 || !company_id || !days || !start_date) {
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
      company_name: company.name,
      start_date: formatDateForDb(startDate),
      end_date: formatDateForDb(endDate),
      days: totalDays,
      status: assignmentStatus,
    }));

    const assignments = await Assignment.createBulk(assignmentData);

    // Update auto statuses
    if (assignmentStatus === 'PREBOOKED') {
      await Promise.all(validAutoIds.map(id => Auto.updateStatus(id, 'PRE_ASSIGNED')));
    } else {
      await Promise.all(validAutoIds.map(id => Auto.updateStatus(id, 'ASSIGNED')));
    }

    res.status(200).json({
      message: `${assignments.length} assignments updated successfully`,
      assignments,
      deletedCount: Object.values(deletedCount).reduce((a, b) => a + b, 0)
    });
  } catch (error) {
    next(error);
  }
};

