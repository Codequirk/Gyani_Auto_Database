import React, { useState, useEffect, useRef } from 'react';
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
  const [showExpandedDetailsModal, setShowExpandedDetailsModal] = useState(false);
  const [selectedPaymentGroup, setSelectedPaymentGroup] = useState(null);
  const [selectedPaymentKeys, setSelectedPaymentKeys] = useState(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuKey(null);
      }
    };

    if (openMenuKey) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuKey]);

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
    return areaPayments.reduce((total, payment) => total + (parseFloat(payment.total_cost) || 0), 0);
  };

  const calculateCompanyTotal = (payments) => {
    return payments.reduce((total, payment) => total + (parseFloat(payment.total_cost) || 0), 0);
  };

  const handleDeletePayments = async () => {
    if (selectedPaymentKeys.size === 0) {
      setError('Please select payments to delete');
      return;
    }

    // Show confirmation modal
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedPaymentKeys.size} payment entry/entries? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      setDeleteLoading(true);
      
      // Get all payments from paymentData
      const allPayments = [];
      paymentData.forEach(companyGroup => {
        companyGroup.payments.forEach(payment => {
          allPayments.push(payment);
        });
      });
      
      // Map selected keys to payment IDs
      const paymentIds = Array.from(selectedPaymentKeys).map(key => {
        const [date, area] = key.split('|');
        const groupedByDateAndArea = {};
        allPayments.forEach(payment => {
          const payDate = new Date(payment.created_at).toLocaleDateString('en-IN');
          const payArea = payment.area_name || 'Unassigned';
          const payKey = `${payDate}|${payArea}`;
          if (!groupedByDateAndArea[payKey]) {
            groupedByDateAndArea[payKey] = [];
          }
          groupedByDateAndArea[payKey].push(payment);
        });
        return groupedByDateAndArea[key]?.map(p => p.id) || [];
      }).flat();

      // Delete each payment
      for (const id of paymentIds) {
        await paymentService.delete(id);
      }

      // Remove deleted items from UI immediately
      setPaymentData(prevData => {
        const updatedData = prevData.map(companyGroup => ({
          ...companyGroup,
          payments: companyGroup.payments.filter(p => !paymentIds.includes(p.id))
        })).filter(companyGroup => companyGroup.payments.length > 0);
        return updatedData;
      });

      setSelectedPaymentKeys(new Set());
      setIsSelectMode(false);
      setError('');
    } catch (err) {
      setError('Failed to delete payments: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSelectPayment = (key) => {
    const newSelected = new Set(selectedPaymentKeys);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedPaymentKeys(newSelected);
  };

  const handleSelectAll = (paymentKeys) => {
    if (selectedPaymentKeys.size === paymentKeys.length) {
      setSelectedPaymentKeys(new Set());
    } else {
      setSelectedPaymentKeys(new Set(paymentKeys));
    }
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
                      <div className="space-y-3">
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
                              className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500 hover:shadow-lg hover:cursor-pointer transition flex items-center justify-between"
                            >
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{company.name}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                  <p><span className="font-semibold">Email:</span> {company.email || 'N/A'}</p>
                                  <p><span className="font-semibold">Phone:</span> {company.phone_number || 'N/A'}</p>
                                  <p><span className="font-semibold">Autos Assigned:</span> {payments.length}</p>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-gray-600 text-xs">Total Payment Value</p>
                                <p className="text-green-600 font-bold text-2xl">₹{companyTotal.toLocaleString('en-IN')}</p>
                              </div>
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

                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )

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
          // Use assigned_time if available, otherwise fall back to created_at
          const dateToCheck = p.assigned_time || p.created_at;
          const paymentMonth = new Date(dateToCheck).toISOString().slice(0, 7);
          return paymentMonth === selectedMonth;
        });

    // Get unique months from payments (using assigned_time if available)
    const uniqueMonths = [...new Set(payments.map(p => {
      const dateToCheck = p.assigned_time || p.created_at;
      return new Date(dateToCheck).toISOString().slice(0, 7);
    }))].sort().reverse();

    // Calculate FILTERED REVENUE - sum of filtered payments
    const filteredTotal = filteredByMonth.reduce((sum, payment) => {
      const totalCost = parseFloat(payment.total_cost) || (parseFloat(payment.cost_per_day) * parseFloat(payment.total_days)) || 0;
      return sum + totalCost;
    }, 0);
    const filteredCount = filteredByMonth.length;

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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Area Filter Dropdown */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">📍 Filter by Area</label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Areas</option>
                {uniqueAreas.map(area => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            {/* Month-Year Calendar Picker */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">📅 Filter by Month</label>
              <div className="bg-white border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <button
                    onClick={() => {
                      const [year, month] = selectedMonth.split('-');
                      const prevMonth = month === '01' ? '12' : String(parseInt(month) - 1).padStart(2, '0');
                      const prevYear = month === '01' ? String(parseInt(year) - 1) : year;
                      setSelectedMonth(`${prevYear}-${prevMonth}`);
                    }}
                    className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded font-semibold"
                  >
                    ◀
                  </button>
                  
                  <div className="flex gap-2 flex-1">
                    {/* Month Input */}
                    <select
                      value={selectedMonth.split('-')[1]}
                      onChange={(e) => {
                        const [year] = selectedMonth.split('-');
                        setSelectedMonth(`${year}-${String(e.target.value).padStart(2, '0')}`);
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                          {new Date(2000, i).toLocaleString('en-IN', { month: 'short' })}
                        </option>
                      ))}
                    </select>
                    
                    {/* Year Input */}
                    <input
                      type="number"
                      value={selectedMonth.split('-')[0]}
                      onChange={(e) => {
                        const month = selectedMonth.split('-')[1];
                        const year = e.target.value;
                        if (year.length <= 4 && parseInt(year) > 0) {
                          setSelectedMonth(`${year}-${month}`);
                        }
                      }}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="2000"
                      max="2099"
                    />
                  </div>
                  
                  <button
                    onClick={() => {
                      const [year, month] = selectedMonth.split('-');
                      const nextMonth = month === '12' ? '01' : String(parseInt(month) + 1).padStart(2, '0');
                      const nextYear = month === '12' ? String(parseInt(year) + 1) : year;
                      setSelectedMonth(`${nextYear}-${nextMonth}`);
                    }}
                    className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded font-semibold"
                  >
                    ▶
                  </button>
                </div>
                <button
                  onClick={() => setSelectedMonth('all')}
                  className="w-full px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded font-medium"
                >
                  View All Months
                </button>
              </div>
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

        {/* Payments Table - Grouped by Date and Area */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Payment Details
            </h3>
            <div className="flex gap-3">
              {!isSelectMode && (
                <button
                  onClick={() => setIsSelectMode(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Select
                </button>
              )}
              {isSelectMode && (
                <>
                  <button
                    onClick={() => {
                      setIsSelectMode(false);
                      setSelectedPaymentKeys(new Set());
                    }}
                    className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeletePayments}
                    disabled={deleteLoading || selectedPaymentKeys.size === 0}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
                  >
                    Delete {selectedPaymentKeys.size > 0 ? `(${selectedPaymentKeys.size})` : ''}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {filteredByMonth.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    {isSelectMode && (
                      <th className="px-4 py-3 text-center w-12">
                        <input
                          type="checkbox"
                          checked={selectedPaymentKeys.size > 0 && (() => {
                            const groupedByDateAndArea = {};
                            filteredByMonth.forEach(payment => {
                              const date = new Date(payment.created_at).toLocaleDateString('en-IN');
                              const area = payment.area_name || 'Unassigned';
                              const key = `${date}|${area}`;
                              if (!groupedByDateAndArea[key]) {
                                groupedByDateAndArea[key] = [];
                              }
                              groupedByDateAndArea[key].push(payment);
                            });
                            return selectedPaymentKeys.size === Object.keys(groupedByDateAndArea).length;
                          })()}
                          onChange={() => {
                            const groupedByDateAndArea = {};
                            filteredByMonth.forEach(payment => {
                              const date = new Date(payment.created_at).toLocaleDateString('en-IN');
                              const area = payment.area_name || 'Unassigned';
                              const key = `${date}|${area}`;
                              if (!groupedByDateAndArea[key]) {
                                groupedByDateAndArea[key] = [];
                              }
                              groupedByDateAndArea[key].push(payment);
                            });
                            handleSelectAll(Object.keys(groupedByDateAndArea));
                          }}
                          className="w-5 h-5 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Timing</th>
                    <th className="px-4 py-3 text-right">No. of Autos</th>
                    <th className="px-4 py-3 text-right">No. of Days</th>
                    <th className="px-4 py-3 text-right">Cost per Auto</th>
                    <th className="px-4 py-3 text-right">Total Cost</th>
                    <th className="px-4 py-3 text-left">Area</th>
                    {!isSelectMode && <th className="px-4 py-3 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Group payments by date AND area
                    const groupedByDateAndArea = {};
                    filteredByMonth.forEach(payment => {
                      const date = new Date(payment.created_at).toLocaleDateString('en-IN');
                      const area = payment.area_name || 'Unassigned';
                      const key = `${date}|${area}`;
                      if (!groupedByDateAndArea[key]) {
                        groupedByDateAndArea[key] = [];
                      }
                      groupedByDateAndArea[key].push(payment);
                    });

                    return Object.entries(groupedByDateAndArea).map(([key, paymentsForGroup]) => {
                      const [date, area] = key.split('|');
                      return (
                        <tr
                          key={key}
                          className="border-b border-gray-200 hover:bg-blue-50 transition cursor-pointer"
                          onDoubleClick={() => {
                            setSelectedPaymentGroup(paymentsForGroup);
                            setShowExpandedDetailsModal(true);
                          }}
                        >
                          {isSelectMode && (
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedPaymentKeys.has(key)}
                                onChange={() => handleSelectPayment(key)}
                                className="w-5 h-5 cursor-pointer"
                              />
                            </td>
                          )}
                          <td
                            className="px-4 py-3 font-semibold text-gray-900"
                          >
                            {date}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {paymentsForGroup[0]?.assigned_time
                              ? new Date(paymentsForGroup[0].assigned_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                              : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{paymentsForGroup.length}</td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {paymentsForGroup[0]?.total_days || 0}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            ₹{parseFloat(paymentsForGroup[0]?.cost_per_day || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            ₹{paymentsForGroup.reduce((sum, p) => sum + (parseFloat(p.total_cost) || 0), 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{area}</td>
                          {!isSelectMode && (
                            <td className="px-4 py-3 text-center">
                              <div className="relative" ref={menuRef}>
                                <button
                                  onClick={() => setOpenMenuKey(openMenuKey === key ? null : key)}
                                  className="text-gray-600 hover:text-gray-800 font-bold text-lg"
                                >
                                  ⋮
                                </button>
                                {openMenuKey === key && (
                                  <div className="absolute -right-32 top-0 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                    <button
                                      onClick={() => {
                                        // Edit functionality can be added here
                                        alert('Edit functionality to be implemented');
                                        setOpenMenuKey(null);
                                      }}
                                      className="block w-full text-left px-4 py-2 text-green-600 hover:bg-green-50 text-sm border-b"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleSelectPayment(key);
                                        setOpenMenuKey(null);
                                      }}
                                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 text-sm"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No payments match the selected filters</p>
            </div>
          )}
        </div>

        {/* Expanded Details Modal - Double Click */}
        {showExpandedDetailsModal && selectedPaymentGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Assignment Information</h2>
              
              {/* Summary Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-sm">Total Autos</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedPaymentGroup.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-sm">Total Days</p>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedPaymentGroup[0]?.total_days || 0}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-sm">Cost per Auto</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    ₹{parseFloat(selectedPaymentGroup[0]?.cost_per_day || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-sm">Total Cost</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ₹{selectedPaymentGroup.reduce((sum, p) => sum + (parseFloat(p.total_cost) || 0), 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown Table */}
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Auto Details</h3>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="px-4 py-3 text-left">Auto No.</th>
                      <th className="px-4 py-3 text-left">Owner Name</th>
                      <th className="px-4 py-3 text-left">Area</th>
                      <th className="px-4 py-3 text-right">Days</th>
                      <th className="px-4 py-3 text-right">Cost/Day</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPaymentGroup.map((payment, idx) => (
                      <tr key={`${payment.id}-${idx}`} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{payment.auto_no || 'N/A'}</td>
                        <td className="px-4 py-3 text-gray-700">{payment.owner_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-gray-700">{payment.area_name || 'Unassigned'}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{payment.total_days}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          ₹{parseFloat(payment.cost_per_day).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          ₹{(payment.total_cost || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculation */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-gray-700 font-semibold mb-2">Calculation:</p>
                <p className="text-gray-600">
                  {selectedPaymentGroup.length} autos × {selectedPaymentGroup[0]?.total_days || 0} days × ₹{parseFloat(selectedPaymentGroup[0]?.cost_per_day || 0).toLocaleString('en-IN')}/day = ₹{selectedPaymentGroup.reduce((sum, p) => sum + (parseFloat(p.total_cost) || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>

              <button
                onClick={() => setShowExpandedDetailsModal(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}
