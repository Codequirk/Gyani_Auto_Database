const Auto = require('../models/Auto');
const Assignment = require('../models/Assignment');
const { computeDaysRemaining } = require('../utils/dateUtils');

exports.getDashboardSummary = async (req, res, next) => {
  try {
    // Count autos by status
    const idleCount = await Auto.getIdleCount();
    const preAssignedCount = await Auto.getPreAssignedCount();
    const assignedCount = await Auto.getAssignedCount();

    // Get idle autos
    const idleAutos = await Auto.getIdleAutos();

    // Get priority autos (2 days remaining)
    const priorityAutos = await Auto.getPriorityAutos(2);
    const priorityCount = priorityAutos.length;

    // Enrich priority list with assignment details
    const enrichedPriority = await Promise.all(priorityAutos.map(async (auto) => {
      const assignments = await Assignment.findByAutoId(auto.id);
      const activeAssignment = assignments.find(a => a.status === 'ACTIVE' || a.status === 'PREBOOKED');
      return {
        ...auto,
        company_name: activeAssignment?.company_name || null,
        start_date: activeAssignment?.start_date || null,
        end_date: activeAssignment?.end_date || null,
        days_remaining: activeAssignment ? computeDaysRemaining(activeAssignment.end_date) : null,
      };
    }));

    res.json({
      summary: {
        idle: idleCount,
        pre_assigned: preAssignedCount,
        assigned: assignedCount,
        priority_2days: priorityCount,
      },
      idle_autos: idleAutos,
      priority_autos: enrichedPriority,
    });
  } catch (error) {
    next(error);
  }
};
