import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const completedAssignmentService = {
  // Get completed assignments for display in history
  getCompleted: async (autoId = null) => {
    try {
      const params = autoId ? { autoId } : {};
      const response = await axios.get(`${API_BASE_URL}/assignments/completed`, { 
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('companyToken')}`,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default completedAssignmentService;
