/**
 * Script to update all existing assignments to have correct statuses based on current dates
 * 
 * PREBOOKED: start_date > today
 * ACTIVE: start_date <= today <= end_date
 * COMPLETED: end_date < today
 * 
 * Run with: node src/scripts/updateAssignmentStatuses.js
 */

const mongoose = require('mongoose');
const AssignmentSchema = require('../models/schemas/AssignmentSchema');
const Auto = require('../models/Auto');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/admin_panel_db';

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

async function updateAllAssignmentStatuses() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('📊 Starting assignment status update...\n');

    // Get all assignments
    const assignments = await AssignmentSchema.find({});
    console.log(`Found ${assignments.length} assignments to check\n`);

    let updated = 0;
    const affectedAutos = new Set();

    // Update each assignment
    for (const assignment of assignments) {
      const correctStatus = getCorrectAssignmentStatus(assignment.start_date, assignment.end_date);
      
      if (assignment.status !== correctStatus) {
        console.log(`📝 Updating assignment ${assignment.id}`);
        console.log(`   From: ${assignment.status} → To: ${correctStatus}`);
        console.log(`   Dates: ${assignment.start_date} to ${assignment.end_date}\n`);
        
        await AssignmentSchema.findOneAndUpdate(
          { id: assignment.id },
          { status: correctStatus, updated_at: new Date() }
        );
        
        updated++;
        affectedAutos.add(assignment.auto_id);
      }
    }

    console.log(`✓ Updated ${updated} assignments\n`);

    // Update auto statuses
    console.log('🚗 Updating auto statuses...\n');
    for (const autoId of affectedAutos) {
      const autoAssignments = await AssignmentSchema.find({ auto_id: autoId });
      
      const hasActiveAssignment = autoAssignments.some(a => a.status === 'ACTIVE');
      const hasPreAssignedAssignment = autoAssignments.some(a => a.status === 'PREBOOKED');
      
      let newAutoStatus = 'IDLE';
      if (hasActiveAssignment) {
        newAutoStatus = 'ACTIVE';
      } else if (hasPreAssignedAssignment) {
        newAutoStatus = 'PREBOOKED';
      }
      
      const auto = await Auto.findById(autoId);
      if (auto && auto.status !== newAutoStatus) {
        console.log(`📍 Auto ${autoId}: ${auto.status} → ${newAutoStatus}`);
        await Auto.updateStatus(autoId, newAutoStatus);
      }
    }

    console.log(`\n✅ Successfully updated ${affectedAutos.size} autos\n`);
    console.log('✓ All assignment statuses are now correct!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating assignment statuses:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

updateAllAssignmentStatuses();
