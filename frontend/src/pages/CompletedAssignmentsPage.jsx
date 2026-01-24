import React, { useState, useEffect } from 'react';
import completedAssignmentService from '../services/completedAssignmentService';
import { Card, Button } from '../components/common';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CompletedAssignmentsPage() {
  const [completedAssignments, setCompletedAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCompletedAssignments();
  }, []);

  const fetchCompletedAssignments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await completedAssignmentService.getCompleted();
      setCompletedAssignments(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch completed assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupOld = async () => {
    if (!window.confirm('This will delete all completed assignments older than 30 days. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await completedAssignmentService.cleanupOldCompleted();
      setSuccess(`${result.deletedCount} old assignments deleted`);
      await fetchCompletedAssignments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cleanup old assignments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Completed Assignments History</h1>
          <Button onClick={handleCleanupOld} variant="destructive">
            🗑️ Cleanup Old (30+ days)
          </Button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {completedAssignments.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No completed assignments yet</p>
            </div>
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-4 py-3 text-left font-semibold">Auto No</th>
                  <th className="px-4 py-3 text-left font-semibold">Company</th>
                  <th className="px-4 py-3 text-left font-semibold">Start Date</th>
                  <th className="px-4 py-3 text-left font-semibold">End Date</th>
                  <th className="px-4 py-3 text-center font-semibold">Days Since Completion</th>
                  <th className="px-4 py-3 text-center font-semibold">Days Until Deletion</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {completedAssignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{assignment.auto_no}</td>
                    <td className="px-4 py-3">{assignment.company_name}</td>
                    <td className="px-4 py-3">
                      {new Date(assignment.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(assignment.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {assignment.days_since_completion} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          assignment.days_until_deletion <= 0
                            ? 'bg-red-100 text-red-800'
                            : assignment.days_until_deletion <= 7
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {assignment.days_until_deletion} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm font-medium">
                        COMPLETED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How It Works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Days Since Completion:</strong> Number of days since the assignment ended</li>
            <li>• <strong>Days Until Deletion:</strong> Days remaining before automatic deletion (30 days after end date)</li>
            <li>• <strong>Auto Cleanup:</strong> Old completed assignments (30+ days) are automatically deleted at 2:00 AM daily</li>
            <li>• <strong>Manual Cleanup:</strong> Use the "Cleanup Old (30+ days)" button to delete old assignments immediately</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
