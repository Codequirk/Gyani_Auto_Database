import axios from 'axios';
import { API_BASE_URL } from '../config/url';

const assignmentService = {
  // Get completed assignments for display in history
  getCompleted: async (autoId = null) => {
    try {
      const params = autoId ? { autoId } : {};
      const response = await axios.get(`${API_BASE_URL}/assignments/completed`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Trigger manual cleanup of old completed assignments
  cleanupOldCompleted: async () => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/assignments/cleanup/old-completed`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default assignmentService;
