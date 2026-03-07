import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyAuth } from '../context/CompanyAuthContext';
import { paymentService } from '../services/api';
import { Card, LoadingSpinner, ErrorAlert, Badge } from '../components/UI';
import CompanyNavbar from '../components/CompanyNavbar';

const CompanyPaymentDetailsPage = () => {
  const { company, isAuthenticated } = useCompanyAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !company) {
      navigate('/login');
      return;
    }

    const fetchPayments = async () => {
      setLoading(true);
      try {
        const response = await paymentService.getCompanyPayments(company.id);
        setPayments(response.data || []);
        setError('');
      } catch (err) {
        console.error('[PAYMENT-DETAILS] Error fetching payments:', err);
        setError('Failed to load payment details');
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [company, isAuthenticated, navigate]);

  const getGroupedPayments = () => {
    const groupedPayments = {};

    payments.forEach(payment => {
      const date = new Date(payment.created_at).toLocaleDateString('en-IN');
      const area = payment.area_name || 'Unassigned';
      const key = `${date}|${area}`;

      if (!groupedPayments[key]) {
        groupedPayments[key] = [];
      }

      groupedPayments[key].push(payment);
    });

    return groupedPayments;
  };

  if (!isAuthenticated || !company) {
    return <div>Redirecting...</div>;
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Details</h1>
          <p className="text-gray-600 mt-2">Complete payment history for your company</p>
        </div>

        {error && <ErrorAlert message={error} />}

        {payments.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No payment records found</p>
            </div>
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Timing</th>
                  <th className="px-4 py-3 text-left font-semibold">No. of Autos</th>
                  <th className="px-4 py-3 text-left font-semibold">No. of Days</th>
                  <th className="px-4 py-3 text-left font-semibold">Cost per Auto</th>
                  <th className="px-4 py-3 text-left font-semibold">Total Cost</th>
                  <th className="px-4 py-3 text-left font-semibold">Area</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(getGroupedPayments()).map(([key, paymentsForGroup]) => {
                  const [date, area] = key.split('|');
                  // Calculate total cost: sum of (cost_per_day * total_days) for each payment
                  const totalCost = paymentsForGroup.reduce((sum, p) => {
                    const paymentCost = (p.cost_per_day || 0) * (p.total_days || 0);
                    return sum + paymentCost;
                  }, 0);
                  const costPerDay = paymentsForGroup[0]?.cost_per_day || 0;
                  const timing = paymentsForGroup[0]?.created_at 
                    ? new Date(paymentsForGroup[0].created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : 'N/A';

                  return (
                    <tr key={key} className="border-t hover:bg-blue-50">
                      <td className="px-4 py-3 font-medium">{date}</td>
                      <td className="px-4 py-3">{timing}</td>
                      <td className="px-4 py-3">{paymentsForGroup.length}</td>
                      <td className="px-4 py-3">{paymentsForGroup[0]?.total_days || 'N/A'}</td>
                      <td className="px-4 py-3">₹{costPerDay.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">₹{totalCost.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">{area}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Summary Footer */}
            {Object.entries(getGroupedPayments()).length > 0 && (
              <div className="border-t bg-gray-50 px-4 py-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Total Records</p>
                    <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      ₹{Object.entries(getGroupedPayments()).reduce((sum, [key, group]) => {
                        return sum + group.reduce((s, p) => s + ((p.cost_per_day || 0) * (p.total_days || 0)), 0);
                      }, 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date Range</p>
                    <p className="text-lg font-bold text-gray-900">
                      {payments.length > 0 ? (
                        `${new Date(Math.min(...payments.map(p => new Date(p.created_at)))).toLocaleDateString('en-IN')} to ${new Date(Math.max(...payments.map(p => new Date(p.created_at)))).toLocaleDateString('en-IN')}`
                      ) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default CompanyPaymentDetailsPage;
