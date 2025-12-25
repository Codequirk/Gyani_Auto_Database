const Auto = require('../models/Auto');
const Assignment = require('../models/Assignment');
const { computeDaysRemaining, formatDateForDb } = require('../utils/dateUtils');
const { mergeConsecutiveAssignments, isConsecutive } = require('../utils/assignmentMerge');

/**
 * Helper function to check if two dates are consecutive (no gap)
 * @param {Date} endDate - End date of first assignment
 * @param {Date} startDate - Start date of next assignment
 * @returns {boolean} True if consecutive
 */
const areConsecutive = (endDate, startDate) => {
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const nextDay = new Date(end);
  nextDay.setDate(nextDay.getDate() + 1);
  
  return nextDay.getTime() === start.getTime();
};

exports.listAutos = async (req, res, next) => {
  try {
    const { search, area_id, status } = req.query;
    const filters = {};

    // Don't pass search to Auto.findAll since we need to filter AFTER enriching with company name
    if (area_id) filters.area_id = area_id;
    if (status) filters.status = status;

    let autos = await Auto.findAll(filters);
    
    // Enrich with assignment info
    let expandedAutos = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const auto of autos) {
      const allAssignments = await Assignment.findByAutoId(auto.id);
      
      // Filter only active and prebooked assignments, sorted by start_date
      const activePreBookedAssignments = allAssignments
        .filter(a => a.status === 'ACTIVE' || a.status === 'PREBOOKED')
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

      if (activePreBookedAssignments.length === 0) {
        // No active/prebooked assignments
        expandedAutos.push({
          ...auto,
          days_remaining: null,
          current_company: null,
          display_status: auto.status, // Keep original status (IDLE)
          assignments: [], // Include empty assignments array
        });
      } else {
        // PHASE 12: Show only the most recent assignment (earliest start_date among active/prebooked)
        const mostRecentAssignment = activePreBookedAssignments[0];
        
        // Check if same company has consecutive assignments after this one
        // and merge them with combined days
        let mergedEndDate = new Date(mostRecentAssignment.end_date);
        let mergedDays = mostRecentAssignment.days || 0;
        let hasMoreAssignmentsForSameCompany = false;

        // Look ahead for same company assignments
        for (let i = 1; i < activePreBookedAssignments.length; i++) {
          const nextAssignment = activePreBookedAssignments[i];
          
          // Only consider if same company
          if (nextAssignment.company_id !== mostRecentAssignment.company_id) {
            break; // Different company, stop merging
          }
          
          // Check if consecutive (no gap)
          if (areConsecutive(mergedEndDate, nextAssignment.start_date)) {
            // Merge: extend the merged end date and add days
            mergedEndDate = new Date(nextAssignment.end_date);
            mergedDays += nextAssignment.days || 0;
            hasMoreAssignmentsForSameCompany = true;
          } else {
            // Gap found, stop merging
            break;
          }
        }

        const assignmentStart = new Date(mostRecentAssignment.start_date);
        assignmentStart.setHours(0, 0, 0, 0);
        
        // Determine display status based on start_date
        const displayStatus = assignmentStart > today ? 'PRE_ASSIGNED' : 'ASSIGNED';

        expandedAutos.push({
          ...auto,
          days_remaining: computeDaysRemaining(mergedEndDate),
          current_company: mostRecentAssignment.company_name,
          display_status: displayStatus,
          assignments: allAssignments, // Include all assignments for frontend to check availability
        });
      }
    }

    // Apply search filter AFTER enriching with company name
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      expandedAutos = expandedAutos.filter(auto =>
        searchRegex.test(auto.auto_no || '') ||
        searchRegex.test(auto.owner_name || '') ||
        searchRegex.test(auto.area_name || '') ||
        searchRegex.test(auto.pin_code || '') ||
        searchRegex.test(auto.current_company || '')
      );
    }

    res.json(expandedAutos);
  } catch (error) {
    next(error);
  }
};

exports.getAuto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const auto = await Auto.getWithAssignments(id);
    
    if (!auto) {
      return res.status(404).json({ error: 'Auto not found' });
    }

    // Enrich assignments with days remaining
    const enrichedAssignments = auto.assignments.map(a => ({
      ...a,
      days_remaining: computeDaysRemaining(a.end_date),
    }));

    res.json({ ...auto, assignments: enrichedAssignments });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate auto number format (Indian vehicle registration)
 * Valid format: 2 letters + 2 digits + 2 letters + 4 digits (e.g., KA01AA5555)
 * @param {string} autoNo - Auto number to validate
 * @returns {boolean} True if valid format
 */
const validateAutoNumber = (autoNo) => {
  if (!autoNo || typeof autoNo !== 'string') return false;
  
  // Remove spaces and convert to uppercase
  const cleaned = autoNo.toUpperCase().replace(/\s+/g, '');
  
  // Indian format: 2 letters + 2 digits + 2 letters + 4 digits
  const regex = /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/;
  return regex.test(cleaned);
};

exports.createAuto = async (req, res, next) => {
  try {
    const { auto_no, owner_name, area_id, notes } = req.body;

    if (!auto_no || !owner_name || !area_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate auto number format
    if (!validateAutoNumber(auto_no)) {
      return res.status(400).json({ 
        error: 'Invalid auto number format. Expected format: 2 letters + 2 digits + 2 letters + 4 digits (e.g., KA01AA5555)' 
      });
    }

    const existing = await Auto.findByAutoNo(auto_no);
    if (existing) {
      return res.status(409).json({ error: 'Auto number already exists' });
    }

    const auto = await Auto.create({
      auto_no: auto_no.toUpperCase().replace(/\s+/g, ''),
      owner_name,
      area_id,
      notes,
      status: 'IDLE',
    });

    res.status(201).json(auto);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Auto number already exists' });
    }
    next(error);
  }
};

exports.updateAuto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { owner_name, status, notes } = req.body;

    const auto = await Auto.findById(id);
    if (!auto) {
      return res.status(404).json({ error: 'Auto not found' });
    }

    const updateData = {};
    if (owner_name) updateData.owner_name = owner_name;
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;

    const updated = await Auto.update(id, updateData);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteAuto = async (req, res, next) => {
  try {
    const { id } = req.params;

    const auto = await Auto.findById(id);
    if (!auto) {
      return res.status(404).json({ error: 'Auto not found' });
    }

    await Auto.softDelete(id);
    res.json({ message: 'Auto deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getAutoAssignments = async (req, res, next) => {
  try {
    const { id } = req.params;

    const auto = await Auto.findById(id);
    if (!auto) {
      return res.status(404).json({ error: 'Auto not found' });
    }

    const assignments = await Assignment.findByAutoId(id);
    const enriched = assignments.map(a => ({
      ...a,
      days_remaining: a.status === 'ACTIVE' ? computeDaysRemaining(a.end_date) : null,
    }));

    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

/**
 * Get count of available autos in an area for a given date range
 * Query params: area_id, start_date, end_date (all required)
 */
exports.getAvailableAutosCount = async (req, res, next) => {
  try {
    const { area_id, start_date, end_date } = req.query;

    if (!area_id || !start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Missing required parameters: area_id, start_date, end_date' 
      });
    }

    // Parse dates
    const checkStartDate = new Date(start_date);
    const checkEndDate = new Date(end_date);
    
    checkStartDate.setHours(0, 0, 0, 0);
    checkEndDate.setHours(0, 0, 0, 0);

    // Get all autos in the area
    const autos = await Auto.findAll({ area_id });

    // Filter autos that don't have assignments during the requested date range
    let availableCount = 0;

    for (const auto of autos) {
      const assignments = await Assignment.findByAutoId(auto.id);
      
      // Check if auto has any active/prebooked assignments overlapping with requested dates
      const hasConflict = assignments.some(assignment => {
        if (assignment.status !== 'ACTIVE' && assignment.status !== 'PREBOOKED') {
          return false; // Ignore completed assignments
        }

        const assignmentStart = new Date(assignment.start_date);
        const assignmentEnd = new Date(assignment.end_date);
        assignmentStart.setHours(0, 0, 0, 0);
        assignmentEnd.setHours(0, 0, 0, 0);

        // Check if date ranges overlap
        return !(checkEndDate < assignmentStart || checkStartDate > assignmentEnd);
      });

      if (!hasConflict) {
        availableCount++;
      }
    }

    res.json({ 
      available_count: availableCount,
      total_count: autos.length,
      area_id 
    });
  } catch (error) {
    next(error);
  }
};
