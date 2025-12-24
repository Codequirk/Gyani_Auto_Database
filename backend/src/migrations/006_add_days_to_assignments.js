const mongoose = require('mongoose');

const migration = {
  version: '006',
  name: 'add_days_field_to_assignments',
  
  up: async function() {
    const AssignmentSchema = require('../models/schemas/AssignmentSchema');
    
    // Calculate days for each existing assignment
    const assignments = await AssignmentSchema.find({});
    
    for (let assignment of assignments) {
      if (!assignment.days || assignment.days === 0) {
        const start = new Date(assignment.start_date);
        const end = new Date(assignment.end_date);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        const timeDiff = end - start;
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 to make it inclusive
        
        await AssignmentSchema.updateOne(
          { id: assignment.id },
          { days: days }
        );
      }
    }
    
    console.log('Migration 006: Added days field to assignments');
  },
  
  down: async function() {
    const AssignmentSchema = require('../models/schemas/AssignmentSchema');
    
    // Remove days field (optional)
    console.log('Migration 006 down: Would remove days field');
  }
};

module.exports = migration;
