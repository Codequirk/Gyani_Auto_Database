const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const authMiddleware = require('../middleware/auth');

// GET routes with specific paths FIRST (before parameterized routes)
router.get('/active', assignmentController.getActiveAssignments);
router.get('/priority', assignmentController.getPriorityAssignments);
router.get('/completed', assignmentController.getCompletedAssignments);
router.get('/bulk', (req, res) => {
  res.status(405).json({ error: 'Method Not Allowed. Use POST or PATCH instead.' });
});
router.get('/company/:companyId', assignmentController.getAssignmentsByCompany);

// POST routes
router.post('/', authMiddleware, assignmentController.createAssignment);
router.post('/bulk', authMiddleware, assignmentController.bulkAssignAutos);

// PATCH routes
router.patch('/bulk', authMiddleware, assignmentController.bulkUpdateAssignments);
router.patch('/:id', authMiddleware, assignmentController.updateAssignment);

// DELETE routes
router.delete('/auto/:autoId', authMiddleware, assignmentController.deleteByAutoId);
router.delete('/cleanup/old-completed', authMiddleware, assignmentController.deleteOldCompletedAssignments);
router.delete('/:id', authMiddleware, assignmentController.deleteAssignment);

module.exports = router;
