import React, { useState, useEffect } from 'react';
import completedAssignmentService from '../services/completedAssignmentService';
import { Card, Button } from '../components/common';
import LoadingSpinner from '../components/LoadingSpinner';
import Navbar from '../components/Navbar';

export default function CompletedAssignmentsPage() {
  const [completedAssignments, setCompletedAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Completed Assignments</h1>
          <p className="text-gray-600 mt-2">History of all completed assignments. Records are automatically deleted 30 days after completion.</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
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
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ About Completed Assignments</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Days Since Completion:</strong> How long ago the assignment ended</li>
            <li>• <strong>Days Until Deletion:</strong> Time remaining before record is automatically deleted</li>
            <li>• <strong>Auto Cleanup:</strong> Completed assignments are automatically deleted 30 days after their end date</li>
            <li>• <strong>Data Retention:</strong> Keep records for your documentation needs before they're deleted</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
