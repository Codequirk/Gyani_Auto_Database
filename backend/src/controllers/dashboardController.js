const Auto = require('../models/Auto');
const Assignment = require('../models/Assignment');
const { computeDaysRemaining } = require('../utils/dateUtils');

exports.getDashboardSummary = async (req, res, next) => {
  try {
    // Get all autos with their assignments
    const AutoSchema = require('../models/schemas/AutoSchema');
    const AssignmentSchema = require('../models/schemas/AssignmentSchema');
    const AreaSchema = require('../models/schemas/AreaSchema');

    const allAutos = await AutoSchema.find({ deleted_at: null });
    
    let idleCount = 0;
    let preAssignedCount = 0;
    let assignedCount = 0;
    const idleAutosList = [];

    // Count autos based on their actual active/prebooked assignments
    for (const auto of allAutos) {
      const assignments = await AssignmentSchema.find({ auto_id: auto.id });
      const activeAssignments = assignments.filter(a => a.status === 'ACTIVE' || a.status === 'PREBOOKED');

      if (activeAssignments.length === 0) {
        idleCount++;
        // Add to idle list with area name
        const autoObj = auto.toObject();
        const area = await AreaSchema.findOne({ id: autoObj.area_id });
        if (area) autoObj.area_name = area.name;
        idleAutosList.push(autoObj);
      } else {
        // Check if any ACTIVE assignments exist
        const hasActive = activeAssignments.some(a => a.status === 'ACTIVE');
        if (hasActive) {
          assignedCount++;
        } else {
          preAssignedCount++;
        }
      }
    }

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
      idle_autos: idleAutosList,
      priority_autos: enrichedPriority,
    });
  } catch (error) {
    next(error);
  }
};
