const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const authMiddleware = require('../middleware/auth');

router.get('/active', assignmentController.getActiveAssignments);
router.get('/priority', assignmentController.getPriorityAssignments);
router.get('/company/:companyId', assignmentController.getAssignmentsByCompany);

router.post('/', authMiddleware, assignmentController.createAssignment);
router.post('/bulk', authMiddleware, assignmentController.bulkAssignAutos);
router.patch('/bulk', authMiddleware, assignmentController.bulkUpdateAssignments);
router.patch('/:id', authMiddleware, assignmentController.updateAssignment);
router.delete('/:id', authMiddleware, assignmentController.deleteAssignment);
router.delete('/auto/:autoId', authMiddleware, assignmentController.deleteByAutoId);

module.exports = router;
