const db = require('../models/db');
const Auto = require('../models/Auto');
const Assignment = require('../models/Assignment');
const Area = require('../models/Area');
const { computeDaysRemaining } = require('../utils/dateUtils');

exports.getDashboardSummary = async (req, res, next) => {
  try {
    // Get all autos with their assignments
    const allAutos = await db('autos').where('deleted_at', null);
    
    let idleCount = 0;
    let preBookedCount = 0;
    let activeCount = 0;
    const idleAutosList = [];

    // Count autos based on their actual active/prebooked assignments
    for (const auto of allAutos) {
      const assignments = await db('assignments').where({ auto_id: auto.id });
      const activeAssignments = assignments.filter(a => a.status === 'ACTIVE' || a.status === 'PREBOOKED');

      if (activeAssignments.length === 0) {
        idleCount++;
        // Add to idle list with area name
        const area = await db('areas').where({ id: auto.area_id }).first();
        if (area) auto.area_name = area.name;
        idleAutosList.push(auto);
      } else {
        // Check if any ACTIVE assignments exist
        const hasActive = activeAssignments.some(a => a.status === 'ACTIVE');
        if (hasActive) {
          activeCount++;
        } else {
          preBookedCount++;
        }
      }
    }

    // Get priority autos (2 days remaining)
    const priorityAutos = await Auto.getPriorityAutos(2);
    const priorityCount = priorityAutos.length;

    // Enrich priority list with assignment details
    const Company = require('../models/Company');
    const enrichedPriority = await Promise.all(priorityAutos.map(async (auto) => {
      const assignments = await db('assignments').where({ auto_id: auto.id });
      const activeAssignment = assignments.find(a => a.status === 'ACTIVE' || a.status === 'PREBOOKED');
      let companyName = null;
      if (activeAssignment?.company_id) {
        const company = await Company.findById(activeAssignment.company_id);
        companyName = company?.name || 'Unknown';
      }
      return {
        ...auto,
        company_name: companyName,
        start_date: activeAssignment?.start_date || null,
        end_date: activeAssignment?.end_date || null,
        days_remaining: activeAssignment ? computeDaysRemaining(activeAssignment.end_date) : null,
      };
    }));

    res.json({
      summary: {
        total: allAutos.length,
        idle: idleCount,
        prebooked: preBookedCount,
        active: activeCount,
        priority_2days: priorityCount,
      },
      idle_autos: idleAutosList,
      priority_autos: enrichedPriority,
    });
  } catch (error) {
    next(error);
  }
};
