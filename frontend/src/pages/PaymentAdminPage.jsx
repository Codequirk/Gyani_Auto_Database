import React, { useState, useEffect } from 'react';
import { paymentService, companyService } from '../services/api';
import Navbar from '../components/Navbar';

export default function PaymentAdminPage() {
  const [paymentData, setPaymentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all payments and group by company
      const response = await paymentService.getAllPayments();
      console.log('All Payments:', response);

      if (response && Array.isArray(response)) {
        // Group payments by company
        const groupedByCompany = {};

        response.forEach(payment => {
          if (!groupedByCompany[payment.company_id]) {
            groupedByCompany[payment.company_id] = {
              company_id: payment.company_id,
              payments: [],
            };
          }
          groupedByCompany[payment.company_id].payments.push(payment);
        });

        // Convert to array and fetch company details
        const companiesData = await Promise.all(
          Object.values(groupedByCompany).map(async (companyGroup) => {
            try {
              const company = await companyService.get(companyGroup.company_id);
              return {
                ...companyGroup,
                company: company,
              };
            } catch (err) {
              console.error(`Error fetching company ${companyGroup.company_id}:`, err);
              return {
                ...companyGroup,
                company: { id: companyGroup.company_id, name: 'Unknown Company' },
              };
            }
          })
        );

        setPaymentData(companiesData);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const groupPaymentsByArea = (payments) => {
    const grouped = {};
    payments.forEach(payment => {
      const areaKey = payment.area_name || 'Unassigned Area';
      if (!grouped[areaKey]) {
        grouped[areaKey] = [];
      }
      grouped[areaKey].push(payment);
    });
    return grouped;
  };

  const calculateAreaTotal = (areaPayments) => {
    return areaPayments.reduce((total, payment) => total + (payment.total_cost || 0), 0);
  };

  const calculateCompanyTotal = (payments) => {
    return payments.reduce((total, payment) => total + (payment.total_cost || 0), 0);
  };

  const calculateCostPerDaySum = (payments) => {
    return payments.reduce((total, payment) => total + (payment.cost_per_day || 0), 0);
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading payment data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
            <p className="text-gray-600 mt-2">
              Company-wise payment overview with area-wise breakdown
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {paymentData.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">No payment data available</p>
            </div>
          ) : (
            <div className="space-y-8">
              {paymentData.map((companyData) => {
                const company = companyData.company;
                const payments = companyData.payments;
                const areaGroups = groupPaymentsByArea(payments);
                const companyTotal = calculateCompanyTotal(payments);
                const costPerDaySum = calculateCostPerDaySum(payments);

                return (
                  <div
                    key={company.id}
                    className="bg-white rounded-lg shadow-lg overflow-hidden border-l-4 border-blue-600"
                  >
                    {/* Company Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 border-b border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-gray-600 text-sm font-semibold">Company Name</p>
                          <p className="text-gray-900 font-bold text-lg">{company.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-sm font-semibold">Email</p>
                          <p className="text-gray-900">{company.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-sm font-semibold">Phone</p>
                          <p className="text-gray-900">{company.phone || 'N/A'}</p>
                        </div>
                        <div className="bg-white bg-opacity-70 rounded p-3">
                          <p className="text-gray-600 text-sm font-semibold">Total Autos</p>
                          <p className="text-blue-600 font-bold text-lg">{payments.length}</p>
                        </div>
                      </div>
                    </div>

                    {/* Area-wise Breakdown */}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Area-wise Breakdown
                      </h3>

                      <div className="space-y-6">
                        {Object.entries(areaGroups).map(([areaName, areaPayments]) => {
                          const areaTotal = calculateAreaTotal(areaPayments);

                          return (
                            <div
                              key={areaName}
                              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                            >
                              {/* Area Header */}
                              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-300">
                                <h4 className="text-md font-semibold text-gray-800">
                                  📍 {areaName}
                                </h4>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">Area Total</p>
                                  <p className="text-lg font-bold text-green-600">
                                    ₹{areaTotal.toLocaleString('en-IN')}
                                  </p>
                                </div>
                              </div>

                              {/* Autos in Area */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-200 text-gray-700">
                                      <th className="px-4 py-2 text-left">Auto No.</th>
                                      <th className="px-4 py-2 text-left">Owner Name</th>
                                      <th className="px-4 py-2 text-right">Cost/Day</th>
                                      <th className="px-4 py-2 text-right">Days</th>
                                      <th className="px-4 py-2 text-right">Total Cost</th>
                                      <th className="px-4 py-2 text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {areaPayments.map((payment) => (
                                      <tr
                                        key={payment.id}
                                        className="border-b border-gray-300 hover:bg-gray-100 transition"
                                      >
                                        <td className="px-4 py-3 font-semibold text-gray-900">
                                          {payment.auto_no}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                          {payment.owner_name}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-700">
                                          ₹{payment.cost_per_day.toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-700">
                                          {payment.total_days} days
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                          ₹{(payment.total_cost || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                              payment.payment_status === 'PAID'
                                                ? 'bg-green-100 text-green-800'
                                                : payment.payment_status === 'APPROVED'
                                                ? 'bg-blue-100 text-blue-800'
                                                : payment.payment_status === 'PENDING'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}
                                          >
                                            {payment.payment_status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Company Totals Footer */}
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 border-t border-green-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white bg-opacity-70 rounded p-4">
                          <p className="text-gray-600 text-sm font-semibold">Sum of Daily Rates</p>
                          <p className="text-green-600 font-bold text-2xl">
                            ₹{costPerDaySum.toLocaleString('en-IN')}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            Sum of all cost_per_day values
                          </p>
                        </div>

                        <div className="bg-white bg-opacity-70 rounded p-4">
                          <p className="text-gray-600 text-sm font-semibold">Total Vehicles</p>
                          <p className="text-green-600 font-bold text-2xl">{payments.length}</p>
                          <p className="text-gray-500 text-xs mt-1">
                            Autos assigned to this company
                          </p>
                        </div>

                        <div className="bg-white bg-opacity-70 rounded p-4 border-2 border-green-500">
                          <p className="text-gray-600 text-sm font-semibold">Grand Total</p>
                          <p className="text-green-700 font-bold text-2xl">
                            ₹{companyTotal.toLocaleString('en-IN')}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            Sum of (cost_per_day × days) for all autos
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
