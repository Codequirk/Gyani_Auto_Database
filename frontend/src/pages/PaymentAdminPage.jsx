import React, { useState, useEffect } from 'react';
import { paymentService, companyService } from '../services/api';
import Navbar from '../components/Navbar';
import { Card, Button, Badge } from '../components/UI';

export default function PaymentAdminPage() {
  const [paymentData, setPaymentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [viewMode, setViewMode] = useState('companies'); // 'companies' or 'details'
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all payments and group by company
      const response = await paymentService.getAllPayments();
      console.log('Raw API Response:', response);
      
      // Extract data from axios response
      let payments = [];
      if (response && response.data) {
        payments = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        payments = response;
      }
      
      console.log('Extracted payments:', payments);
      console.log('Payments length:', payments.length);

      if (payments && payments.length > 0) {
        // Group payments by company
        const groupedByCompany = {};

        payments.forEach(payment => {
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
              const companyResponse = await companyService.get(companyGroup.company_id);
              const company = companyResponse.data || companyResponse;
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
      } else {
        console.log('No payments found or invalid response structure');
        setPaymentData([]);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      console.error('Error message:', err.message);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to load payment data');
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
              Manage and track auto payment assignments by company
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-screen bg-gray-50">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading payment data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="mb-6 flex gap-4">
                <button
                  onClick={() => {
                    setViewMode('companies');
                    setSelectedCompany(null);
                  }}
                  className={`px-6 py-2 rounded-lg font-semibold transition ${
                    viewMode === 'companies'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  📋 Companies
                </button>
                <button
                  onClick={() => setViewMode('autos')}
                  className={`px-6 py-2 rounded-lg font-semibold transition ${
                    viewMode === 'autos'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🚗 Autos
                </button>
              </div>

              {paymentData.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600 mb-4">No payment data available</p>
                  <p className="text-sm text-gray-500">
                    💡 Payments will appear here after you approve a request with autos and assign a cost per day
                  </p>
                </div>
              ) : (
                <>
                  {/* COMPANIES VIEW */}
                  {viewMode === 'companies' && !selectedCompany && (
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Companies List</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paymentData.map((companyData) => {
                          const company = companyData.company;
                          const payments = companyData.payments;
                          const companyTotal = calculateCompanyTotal(payments);
                          
                          return (
                            <div
                              key={company.id}
                              onClick={() => {
                                setSelectedCompany(companyData);
                                setViewMode('details');
                              }}
                              className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500 hover:shadow-lg hover:cursor-pointer transition transform hover:scale-105"
                            >
                              <h3 className="text-lg font-bold text-gray-900 mb-2">{company.name}</h3>
                              <div className="space-y-2 text-sm text-gray-600">
                                <p><span className="font-semibold">Email:</span> {company.email || 'N/A'}</p>
                                <p><span className="font-semibold">Phone:</span> {company.phone || 'N/A'}</p>
                                <p><span className="font-semibold">Autos Assigned:</span> {payments.length}</p>
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-gray-600 text-xs">Total Payment Value</p>
                                <p className="text-green-600 font-bold text-xl">₹{companyTotal.toLocaleString('en-IN')}</p>
                              </div>
                              <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
                                View Details →
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* COMPANY DETAILS VIEW */}
                  {viewMode === 'details' && selectedCompany && (
                    <div>
                      <button
                        onClick={() => {
                          setSelectedCompany(null);
                          setViewMode('companies');
                        }}
                        className="mb-4 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
                      >
                        ← Back to Companies
                      </button>
                      {renderCompanyDetails(selectedCompany)}
                    </div>
                  )}

                  {/* AUTOS VIEW */}
                  {viewMode === 'autos' && (
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">All Autos by Company</h2>
                      <div className="space-y-8">
                        {paymentData.map((companyData) => {
                          const company = companyData.company;
                          const payments = companyData.payments;
                          const companyTotal = calculateCompanyTotal(payments);

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

                              {/* Autos Table */}
                              <div className="p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                  Assigned Autos
                                </h3>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-gray-200 text-gray-700">
                                        <th className="px-4 py-2 text-left">Auto No.</th>
                                        <th className="px-4 py-2 text-left">Owner Name</th>
                                        <th className="px-4 py-2 text-left">Area</th>
                                        <th className="px-4 py-2 text-right">Cost/Day</th>
                                        <th className="px-4 py-2 text-right">Days</th>
                                        <th className="px-4 py-2 text-right">Total Cost</th>
                                        <th className="px-4 py-2 text-center">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {payments.map((payment) => (
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
                                          <td className="px-4 py-3 text-gray-700">
                                            {payment.area_name || 'N/A'}
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

                              {/* Company Totals Footer */}
                              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 border-t border-green-200">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-white bg-opacity-70 rounded p-4">
                                    <p className="text-gray-600 text-sm font-semibold">Total Vehicles</p>
                                    <p className="text-green-600 font-bold text-2xl">{payments.length}</p>
                                  </div>

                                  <div className="bg-white bg-opacity-70 rounded p-4">
                                    <p className="text-gray-600 text-sm font-semibold">Sum of Daily Rates</p>
                                    <p className="text-green-600 font-bold text-2xl">
                                      ₹{calculateCostPerDaySum(payments).toLocaleString('en-IN')}
                                    </p>
                                  </div>

                                  <div className="bg-white bg-opacity-70 rounded p-4 border-2 border-green-500">
                                    <p className="text-gray-600 text-sm font-semibold">Grand Total</p>
                                    <p className="text-green-700 font-bold text-2xl">
                                      ₹{companyTotal.toLocaleString('en-IN')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  function renderCompanyDetails(companyData) {
    
    const company = companyData.company;
    const payments = companyData.payments;

    // Calculate TOTAL REVENUE - sum of ALL payments for this company
    const companyTotal = payments.reduce((sum, payment) => {
      const totalCost = parseFloat(payment.total_cost) || (parseFloat(payment.cost_per_day) * parseFloat(payment.total_days)) || 0;
      return sum + totalCost;
    }, 0);

    // Get unique areas
    const uniqueAreas = [...new Set(payments.map(p => p.area_name || 'Unassigned'))];

    // Filter payments by area
    const filteredByArea = selectedArea === 'all' 
      ? payments 
      : payments.filter(p => (p.area_name || 'Unassigned') === selectedArea);

    // Filter payments by month
    const filteredByMonth = selectedMonth === 'all'
      ? filteredByArea
      : filteredByArea.filter(p => {
          const paymentMonth = new Date(p.created_at).toISOString().slice(0, 7);
          return paymentMonth === selectedMonth;
        });

    // Get unique months from payments
    const uniqueMonths = [...new Set(payments.map(p => new Date(p.created_at).toISOString().slice(0, 7)))].sort().reverse();

    // Calculate FILTERED REVENUE - sum of filtered payments
    const filteredTotal = filteredByMonth.reduce((sum, payment) => {
      const totalCost = parseFloat(payment.total_cost) || (parseFloat(payment.cost_per_day) * parseFloat(payment.total_days)) || 0;
      return sum + totalCost;
    }, 0);
    const filteredCount = filteredByMonth.length;

    // Calculate month-wise revenue
    const monthlyRevenue = {};
    payments.forEach(p => {
      const month = new Date(p.created_at).toISOString().slice(0, 7);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (p.total_cost || 0);
    });

    return (
      <div className="space-y-6">
        {/* Company Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border-l-4 border-blue-600 p-6">
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
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded p-3 border border-green-300">
              <p className="text-gray-600 text-sm font-semibold">Total Revenue</p>
              <p className="text-green-700 font-bold text-lg">₹{companyTotal.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          
          {/* Area Filter */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">📍 Filter by Area</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedArea('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedArea === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Areas
              </button>
              {uniqueAreas.map(area => (
                <button
                  key={area}
                  onClick={() => setSelectedArea(area)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedArea === area
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Month Filter */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">📅 Filter by Month</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedMonth('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedMonth === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Months
              </button>
              {uniqueMonths.map(month => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedMonth === month
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {new Date(month + '-01').toLocaleString('en-IN', { month: 'short', year: 'numeric' })}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm font-semibold">Total Autos (Filtered)</p>
            <p className="text-blue-600 font-bold text-2xl mt-1">{filteredCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <p className="text-gray-600 text-sm font-semibold">Filtered Revenue</p>
            <p className="text-yellow-600 font-bold text-2xl mt-1">₹{filteredTotal.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-gray-600 text-sm font-semibold">Total Revenue (All)</p>
            <p className="text-green-600 font-bold text-2xl mt-1">₹{companyTotal.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Month-wise Revenue Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Month-wise Revenue Breakdown</h3>
          {uniqueMonths.length > 0 ? (
            <div className="space-y-3">
              {uniqueMonths.map(month => {
                const monthPayments = payments.filter(p => new Date(p.created_at).toISOString().slice(0, 7) === month);
                const monthTotal = monthPayments.reduce((sum, p) => sum + (p.total_cost || 0), 0);
                return (
                  <div key={month} className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div>
                      <span className="font-medium text-gray-700 block">
                        {new Date(month + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                      </span>
                      <span className="text-xs text-gray-500">({monthPayments.length} auto{monthPayments.length !== 1 ? 's' : ''})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-green-700 font-bold text-2xl block">
                        ₹{monthTotal.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-gray-500">Total for month</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No revenue data available</p>
          )}
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Details ({filteredCount} entries)
          </h3>
          
          {filteredByMonth.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="px-4 py-3 text-left">Auto No.</th>
                    <th className="px-4 py-3 text-left">Owner Name</th>
                    <th className="px-4 py-3 text-left">Area</th>
                    <th className="px-4 py-3 text-right">Cost/Day</th>
                    <th className="px-4 py-3 text-right">Days</th>
                    <th className="px-4 py-3 text-right">Total Cost</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredByMonth.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-semibold text-gray-900">{payment.auto_no || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-700">{payment.owner_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-700">{payment.area_name || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        ₹{parseFloat(payment.cost_per_day).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{payment.total_days}</td>
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
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {new Date(payment.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No payments match the selected filters</p>
            </div>
          )}
        </div>
      </div>
    );
  }
}
