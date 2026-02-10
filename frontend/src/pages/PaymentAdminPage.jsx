import React, { useState, useEffect, useRef } from 'react';
import { paymentService, autoMonthlyPaymentService, companyService, autoService, areaService } from '../services/api';
import Navbar from '../components/Navbar';
import { Card, Button, Badge } from '../components/UI';
import { formatDate } from '../utils/helpers';

export default function PaymentAdminPage() {
  const [paymentData, setPaymentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [viewMode, setViewMode] = useState('companies');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showExpandedDetailsModal, setShowExpandedDetailsModal] = useState(false);
  const [selectedPaymentGroup, setSelectedPaymentGroup] = useState(null);
  const [selectedPaymentKeys, setSelectedPaymentKeys] = useState(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [paymentType, setPaymentType] = useState('COMPANY');
  const [autoPayments, setAutoPayments] = useState([]);
  const [activeAutos, setActiveAutos] = useState([]);
  const [selectedAutosForPayment, setSelectedAutosForPayment] = useState(new Set());
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [bulkPaymentData, setBulkPaymentData] = useState({ start_date: '', monthly_cost: '', advance_payment: '' });
  const [bulkPaymentLoading, setBulkPaymentLoading] = useState(false);
  const [snapshotSelectedAutos, setSnapshotSelectedAutos] = useState(new Set());
  const [autoSearch, setAutoSearch] = useState('');
  const [autoAreaFilter, setAutoAreaFilter] = useState('');
  const [areas, setAreas] = useState([]);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaymentData, setEditPaymentData] = useState({});
  const [editPaymentLoading, setEditPaymentLoading] = useState(false);
  const [showAutoPaymentDetailsModal, setShowAutoPaymentDetailsModal] = useState(false);
  const [selectedAutoPaymentDetails, setSelectedAutoPaymentDetails] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const debounceTimer = useRef(null);
  const [debouncedAutoSearch, setDebouncedAutoSearch] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  useEffect(() => {
    const handleSetPaymentType = (event) => {
      if (event.detail === 'AUTO') {
        setPaymentType('AUTO');
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('setPaymentType', handleSetPaymentType);
    return () => window.removeEventListener('setPaymentType', handleSetPaymentType);
  }, []);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedAutoSearch(autoSearch);
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [autoSearch]);

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

      const response = await paymentService.getAllPayments();
      console.log('Raw API Response:', response);
      
      let payments = [];
      if (response && response.data) {
        payments = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        payments = response;
      }
      
      console.log('Extracted payments:', payments);
      console.log('Payments length:', payments.length);

      if (payments && payments.length > 0) {
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

      try {
        const autoResponse = await autoMonthlyPaymentService.getAll();
        console.log('Auto Payments Response:', autoResponse);
        let autoPaymentsList = [];
        if (autoResponse && autoResponse.data) {
          autoPaymentsList = Array.isArray(autoResponse.data) ? autoResponse.data : (autoResponse.data.list || []);
        } else if (Array.isArray(autoResponse)) {
          autoPaymentsList = autoResponse;
        }
        setAutoPayments(autoPaymentsList);
      } catch (err) {
        console.error('Error fetching auto payments:', err);
        setAutoPayments([]);
      }

      try {
        const autosResponse = await autoService.list();
        const autos = autosResponse.data || [];
        setActiveAutos(autos);
      } catch (err) {
        console.error('Error fetching autos:', err);
        setActiveAutos([]);
      }

      try {
        const areasResponse = await areaService.list();
        const areasList = areasResponse.data || [];
        setAreas(areasList);
      } catch (err) {
        console.error('Error fetching areas:', err);
        setAreas([]);
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

  // Helper function to safely parse date strings (YYYY-MM-DD) without timezone conversion
  const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date;
  };

  // Helper function to convert Date object to YYYY-MM-DD string
  const dateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to calculate end date (SINGLE SOURCE OF TRUTH FOR DATE CALCULATIONS)
  // Business Rule: Assignment duration = 30 calendar days INCLUDING the start date
  // Therefore: end_date = start_date + 29 days
  //
  // Example: If start_date = Feb 10, then end_date = Mar 11 (exactly 30 days: Feb 10-29 + Mar 1-11 = 30 days)
  //
  // Why +29 and not +30?
  // - Start date + 29 days = 30-day period (the start date itself is day 1)
  // - start_date=Feb10, +29days → end_date=Mar11
  // - This creates a 30-day billing cycle: Feb10 through Mar11 (inclusive)
  const calculateEndDate = (startDateString) => {
    const [year, month, day] = startDateString.split('-').map(Number);
    // Normalize to start-of-day (00:00:00 local time, no timezone conversion)
    const startDate = new Date(year, month - 1, day);
    startDate.setHours(0, 0, 0, 0);
    
    // ALWAYS add exactly 29 days to get the end date
    // This works the same way regardless of whether start_date is today or future
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 29);
    
    return dateToString(endDate);
  };

  // Helper function to convert YYYY-MM-DD to YYYY-MM-DD (DATE-ONLY, NO TIMEZONE CONVERSION)
  // CRITICAL: Send dates as pure date strings to prevent timezone interpretation
  // Backend MUST store as SQL DATE type, not TIMESTAMP
  // This ensures selected 10 Feb stays as 10 Feb, no +1/-1 day shifts
  const formatDateForBackend = (dateString) => {
    // dateString format: YYYY-MM-DD
    // Return as-is (DATE-ONLY) - NO timezone offset, NO ISO conversion
    return dateString;
  };

  const getFilteredAutos = () => {
    // Get IDs of autos that already have payments
    const autosWithPayments = new Set(autoPayments.map(p => p.auto_id));
    
    return activeAutos.filter(auto => {
      // Exclude autos that already have payments
      if (autosWithPayments.has(auto.id)) {
        return false;
      }
      
      const matchesSearch = !debouncedAutoSearch || 
        auto.auto_no.toLowerCase().includes(debouncedAutoSearch.toLowerCase()) ||
        auto.owner_name.toLowerCase().includes(debouncedAutoSearch.toLowerCase());
      
      const matchesArea = !autoAreaFilter || auto.area_id === autoAreaFilter;
      
      return matchesSearch && matchesArea;
    });
  };

  const handleBulkPayment = async (e) => {
    e.preventDefault();
    console.log('📤 BULK PAYMENT FORM SUBMITTED');
    
    if (!bulkPaymentData.start_date || !bulkPaymentData.monthly_cost) {
      console.log('❌ Missing date or cost');
      setError('Start date and monthly cost are required');
      return;
    }

    if (snapshotSelectedAutos.size === 0) {
      console.log('❌ No autos selected');
      setError('Please select at least one auto');
      return;
    }

    setBulkPaymentLoading(true);
    setError('');

    try {
      // BUSINESS RULE: Assignment duration = 30 calendar days INCLUDING the start date
      // Do NOT mutate the start date during this process
      const startDate = bulkPaymentData.start_date;
      const advancePayment = bulkPaymentData.advance_payment || 0;
      
      // Calculate end date: start_date + 29 days = 30-day billing cycle
      // This is derived ONLY from the start date, never recalculated during save
      const endDateString = calculateEndDate(startDate);

      const selectedAutoIds = Array.from(snapshotSelectedAutos);
      const selectedAutosData = activeAutos.filter(a => selectedAutoIds.includes(a.id));

      console.log('📝 Creating payments for autos:', selectedAutosData.map(a => a.auto_no));
      console.log('✅ Start Date (selected):', startDate, '| End Date (calculated):', endDateString);
      console.log('💰 Advance Payment:', advancePayment);

      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      // Send dates as pure YYYY-MM-DD strings (DATE-ONLY, no timezone conversion)
      // Backend MUST receive and store as SQL DATE, not TIMESTAMP
      const startDateForBackend = formatDateForBackend(startDate);
      const endDateForBackend = formatDateForBackend(endDateString);

      console.log('📤 Sending dates (DATE-ONLY) - Start:', startDateForBackend, 'End:', endDateForBackend);

      for (const auto of selectedAutosData) {
        try {
          const paymentData = {
            auto_id: auto.id,
            company_id: auto.company_id || null,
            monthly_cost: parseFloat(bulkPaymentData.monthly_cost),
            advance_payment: advancePayment ? parseFloat(advancePayment) : 0, // NEW: Apply same advance payment to each auto
            start_date: startDateForBackend,
            end_date: endDateForBackend,
            notes: `Bulk payment created for ${selectedAutoIds.length} auto(s)`,
          };

          if (auto.assignment_id) {
            paymentData.assignment_id = auto.assignment_id;
          }

          console.log(`📤 Sending payment for auto ${auto.auto_no}:`, paymentData);
          await autoMonthlyPaymentService.create(paymentData);
          console.log(`✅ Payment created for auto ${auto.auto_no}`);
          successCount++;
        } catch (err) {
          console.error(`❌ Failed to create payment for auto ${auto.auto_no}:`, err);
          errors.push(`${auto.auto_no}: ${err.response?.data?.error || err.message}`);
          failureCount++;
        }
      }

      if (failureCount === 0) {
        setError('');
        console.log(`✅ All ${successCount} payments created successfully!`);
        alert(`✓ Successfully created ${successCount} payment(s)`);
      } else {
        setError(`Created ${successCount} payment(s), failed ${failureCount}. Errors: ${errors.join('; ')}`);
      }
      
      setSelectedAutosForPayment(new Set());
      setSnapshotSelectedAutos(new Set());
      setShowBulkPaymentModal(false);
      setBulkPaymentData({ start_date: '', monthly_cost: '', advance_payment: '' });
      
      await fetchPaymentData();
    } catch (err) {
      console.error('❌ Bulk payment error:', err);
      setError(err.response?.data?.error || 'Failed to create bulk payment');
    } finally {
      setBulkPaymentLoading(false);
    }
  };

  const handleEditAutoPayment = (payment) => {
    setEditingPayment(payment);
    // Extract just the date part (YYYY-MM-DD) without time
    const startDateOnly = payment.start_date.split('T')[0];
    const endDateOnly = payment.end_date.split('T')[0];
    
    setEditPaymentData({
      monthly_cost: payment.monthly_cost,
      advance_payment: payment.advance_payment || 0, // NEW: Include advance payment
      start_date: startDateOnly,
      end_date: endDateOnly,
      notes: payment.notes || '',
    });
    setShowEditPaymentModal(true);
  };

  const handleSaveAutoPaymentEdit = async (e) => {
    e.preventDefault();
    
    if (!editPaymentData.monthly_cost || !editPaymentData.start_date) {
      setError('Monthly cost and start date are required');
      return;
    }

    try {
      setEditPaymentLoading(true);
      
      // BUSINESS RULE: End date is derived ONLY from the start date
      // Recalculate end_date based on the new start_date (if changed)
      const recalculatedEndDate = calculateEndDate(editPaymentData.start_date);
      
      // Send dates as pure YYYY-MM-DD strings (DATE-ONLY, no timezone conversion)
      const startDateForBackend = formatDateForBackend(editPaymentData.start_date);
      const endDateForBackend = formatDateForBackend(recalculatedEndDate);
      
      await autoMonthlyPaymentService.update(editingPayment.id, {
        monthly_cost: parseFloat(editPaymentData.monthly_cost),
        advance_payment: editPaymentData.advance_payment ? parseFloat(editPaymentData.advance_payment) : 0, // NEW: Update advance payment
        start_date: startDateForBackend,
        end_date: endDateForBackend,
        notes: editPaymentData.notes,
      });

      setAutoPayments(autoPayments.map(p => 
        p.id === editingPayment.id 
          ? { 
              ...p, 
              monthly_cost: editPaymentData.monthly_cost,
              advance_payment: editPaymentData.advance_payment,
              start_date: startDateForBackend,
              end_date: endDateForBackend,
              notes: editPaymentData.notes
            }
          : p
      ));

      setShowEditPaymentModal(false);
      setEditingPayment(null);
      setEditPaymentData({});
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update payment');
    } finally {
      setEditPaymentLoading(false);
    }
  };

  const handleViewAutoPaymentDetails = (payment) => {
    setSelectedAutoPaymentDetails(payment);
    setShowAutoPaymentDetailsModal(true);
  };

  const handleEditAuto = (auto) => {
    console.log('Edit auto:', auto);
  };

  const calculateCompanyTotal = (payments) => {
    return payments.reduce((total, payment) => total + (parseFloat(payment.total_cost) || 0), 0);
  };

  const handleDeletePayment = async (paymentKey) => {
    const confirmed = window.confirm('Delete this payment?');
    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      
      const paymentIdsToDelete = new Set();
      
      paymentData.forEach(companyGroup => {
        companyGroup.payments.forEach(payment => {
          const payDate = new Date(payment.created_at).toLocaleDateString('en-IN');
          const payArea = payment.area_name || 'Unassigned';
          const payKey = `${payDate}|${payArea}`;
          
          if (payKey === paymentKey) {
            paymentIdsToDelete.add(payment.id);
          }
        });
      });

      for (const id of paymentIdsToDelete) {
        await paymentService.delete(id);
      }

      setPaymentData(prevData => 
        prevData.map(companyGroup => ({
          ...companyGroup,
          payments: companyGroup.payments.filter(p => !paymentIdsToDelete.has(p.id))
        })).filter(companyGroup => companyGroup.payments.length > 0)
      );

      setOpenMenuKey(null);
    } catch (err) {
      setError('Failed to delete: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeletePayments = async () => {
    if (selectedPaymentKeys.size === 0) {
      setError('Please select payments to delete');
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedPaymentKeys.size} payment(s)?`);
    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      
      const paymentIdsToDelete = new Set();
      
      paymentData.forEach(companyGroup => {
        companyGroup.payments.forEach(payment => {
          const payDate = new Date(payment.created_at).toLocaleDateString('en-IN');
          const payArea = payment.area_name || 'Unassigned';
          const payKey = `${payDate}|${payArea}`;
          
          if (selectedPaymentKeys.has(payKey)) {
            paymentIdsToDelete.add(payment.id);
          }
        });
      });

      for (const id of paymentIdsToDelete) {
        await paymentService.delete(id);
      }

      setPaymentData(prevData => 
        prevData.map(companyGroup => ({
          ...companyGroup,
          payments: companyGroup.payments.filter(p => !paymentIdsToDelete.has(p.id))
        })).filter(companyGroup => companyGroup.payments.length > 0)
      );

      setSelectedPaymentKeys(new Set());
      setIsSelectMode(false);
    } catch (err) {
      setError('Failed to delete: ' + err.message);
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

  const renderCompanyDetails = (companyData) => {
    const company = companyData.company;
    const payments = companyData.payments;

    const companyTotal = payments.reduce((sum, payment) => {
      const totalCost = parseFloat(payment.total_cost) || (parseFloat(payment.cost_per_day) * parseFloat(payment.total_days)) || 0;
      return sum + totalCost;
    }, 0);

    const uniqueAreas = [...new Set(payments.map(p => p.area_name || 'Unassigned'))];

    const filteredByArea = selectedArea === 'all' 
      ? payments 
      : payments.filter(p => (p.area_name || 'Unassigned') === selectedArea);

    const filteredByMonth = selectedMonth === 'all'
      ? filteredByArea
      : filteredByArea.filter(p => {
          const dateToCheck = p.assigned_time || p.created_at;
          const paymentMonth = new Date(dateToCheck).toISOString().slice(0, 7);
          return paymentMonth === selectedMonth;
        });

    const filteredTotal = filteredByMonth.reduce((sum, payment) => {
      const totalCost = parseFloat(payment.total_cost) || (parseFloat(payment.cost_per_day) * parseFloat(payment.total_days)) || 0;
      return sum + totalCost;
    }, 0);
    const filteredCount = filteredByMonth.length;

    return (
      <div className="space-y-6">
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

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
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
                          <td className="px-4 py-3 font-semibold text-gray-900">{date}</td>
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
                                        alert('Edit functionality to be implemented');
                                        setOpenMenuKey(null);
                                      }}
                                      className="block w-full text-left px-4 py-2 text-green-600 hover:bg-green-50 text-sm border-b"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleDeletePayment(key);
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

        {showExpandedDetailsModal && selectedPaymentGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Assignment Information</h2>
              
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

              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-gray-700 font-semibold mb-2">Calculation:</p>
                <p className="text-gray-600">
                  {selectedPaymentGroup.length} autos {'\u00D7'} {selectedPaymentGroup[0]?.total_days || 0} days {'\u00D7'} ₹{parseFloat(selectedPaymentGroup[0]?.cost_per_day || 0).toLocaleString('en-IN')}
                  <span> per day = </span>
                  ₹{selectedPaymentGroup.reduce((sum, p) => sum + (parseFloat(p.total_cost) || 0), 0).toLocaleString('en-IN')}
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
              <p className="text-gray-600 mt-2">
                Manage and track auto payment assignments by company
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="mb-6 flex gap-3">
            <button
              onClick={() => setPaymentType('COMPANY')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                paymentType === 'COMPANY'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Company Payments
            </button>
            <button
              onClick={() => setPaymentType('AUTO')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                paymentType === 'AUTO'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Auto Monthly Payments
            </button>
          </div>

          {paymentType === 'COMPANY' && (
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

          {paymentType === 'AUTO' && (
            <>
              {autoPayments.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center mb-6">
                  <p className="text-gray-600 mb-4">No auto monthly payments available</p>
                  <p className="text-sm text-gray-500">
                    💡 Monthly payments will appear here after you add payments for auto assignments
                  </p>
                </div>
              ) : (
                <>
                  {(() => {
                    // Calculate days remaining for all payments (SINGLE SOURCE OF TRUTH)
                    // Business Rule: Remaining days = days from today until end_date (inclusive)
                    const paymentsWithDays = autoPayments.map((payment) => {
                      const startDate = parseLocalDate(payment.start_date.split('T')[0]);
                      const endDate = parseLocalDate(payment.end_date.split('T')[0]);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      endDate.setHours(0, 0, 0, 0);
                      
                      // Calculate days remaining: ceil((endDate - today) / ms_per_day)
                      // Examples (today = Feb 10):
                      // - endDate = Feb 10 → daysRemaining = 0 (payment expired)
                      // - endDate = Feb 11 → daysRemaining = 1
                      // - endDate = Mar 11 → daysRemaining = 29 (if start was today) or 30 (if start was tomorrow)
                      // 
                      // For a 30-day cycle starting TODAY (Feb 10):
                      //   - end_date = Mar 11 (Feb 10 + 29 days)
                      //   - daysRemaining on Feb 10 = 29 (counting Feb 10-11 through Mar 11)
                      //
                      // For a 30-day cycle starting TOMORROW (Feb 11):
                      //   - end_date = Mar 12 (Feb 11 + 29 days)
                      //   - daysRemaining on Feb 10 = 30 (not yet started, full period remains)
                      const daysRemaining = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
                      return { ...payment, daysRemaining };
                    });

                    // Separate into 3 sections
                    const overduePayments = paymentsWithDays.filter(p => p.daysRemaining === 0);
                    const dueSoonPayments = paymentsWithDays.filter(p => p.daysRemaining > 0 && p.daysRemaining <= 7).sort((a, b) => a.daysRemaining - b.daysRemaining);
                    const allAssignedPayments = paymentsWithDays.sort((a, b) => {
                      if (a.daysRemaining === 0 && b.daysRemaining !== 0) return -1;
                      if (a.daysRemaining !== 0 && b.daysRemaining === 0) return 1;
                      if (a.daysRemaining <= 7 && b.daysRemaining > 7) return -1;
                      if (a.daysRemaining > 7 && b.daysRemaining <= 7) return 1;
                      return a.daysRemaining - b.daysRemaining;
                    });

                    const renderPaymentTable = (payments, title, bgColor, headerBg) => (
                      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                        <div className={`${bgColor} text-white px-6 py-4`}>
                          <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">{title}</h2>
                            <span className="bg-white text-gray-900 px-3 py-1 rounded-full font-semibold text-sm">
                              {payments.length} auto{payments.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        {payments.length === 0 ? (
                          <div className="p-6 text-center text-gray-500">
                            No payments in this category
                          </div>
                        ) : (
                          <table className="w-full">
                            <thead className={`${headerBg} border-b`}>
                              <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Auto No.</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Area</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Monthly Cost</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Advance Paid</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Remaining</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Start Date</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">End Date</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Days Remaining</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {payments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-gray-50 cursor-pointer" onDoubleClick={() => handleViewAutoPaymentDetails(payment)}>
                                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                    {payment.auto_no || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-700">
                                    {payment.area_name || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                                    ₹{(payment.monthly_cost || 0).toLocaleString('en-IN')}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">
                                    ₹{(payment.advance_payment || 0).toLocaleString('en-IN')}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-right font-semibold text-orange-600">
                                    ₹{((payment.monthly_cost || 0) - (payment.advance_payment || 0)).toLocaleString('en-IN')}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-700">
                                    {parseLocalDate(payment.start_date.split('T')[0]).toLocaleDateString('en-IN')}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-700">
                                    {parseLocalDate(payment.end_date.split('T')[0]).toLocaleDateString('en-IN')}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-center">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                      payment.daysRemaining === 0 ? 'bg-red-100 text-red-800' :
                                      payment.daysRemaining <= 7 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {payment.daysRemaining} day{payment.daysRemaining !== 1 ? 's' : ''}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-center">
                                    <div className="relative">
                                      <button
                                        onClick={() => setOpenMenuId(openMenuId === payment.id ? null : payment.id)}
                                        className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
                                        title="Actions"
                                      >
                                        ⋮
                                      </button>
                                      {openMenuId === payment.id && (
                                        <div className="absolute -right-32 top-0 w-40 bg-white border border-gray-200 rounded shadow-lg z-50">
                                          <button
                                            onClick={() => {
                                              handleEditAutoPayment(payment);
                                              setOpenMenuId(null);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                          >
                                            Edit
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );

                    return (
                      <>
                        {renderPaymentTable(overduePayments, '🚨 Payment Overdue', 'bg-red-600', 'bg-red-100')}
                        {renderPaymentTable(dueSoonPayments, '⚠️ Payment Due Soon (1-7 Days)', 'bg-yellow-600', 'bg-yellow-100')}
                        {renderPaymentTable(allAssignedPayments, '📋 All Assigned Payments', 'bg-blue-600', 'bg-blue-100')}
                      </>
                    );
                  })()}
                </>
              )}

              <div className="mb-6 bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">All Autos</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Auto
                    </label>
                    <input
                      type="text"
                      value={autoSearch}
                      onChange={(e) => setAutoSearch(e.target.value)}
                      placeholder="Search by auto no or owner..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Area
                    </label>
                    <select
                      value={autoAreaFilter}
                      onChange={(e) => setAutoAreaFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Areas</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Refresh
                    </label>
                    <button
                      onClick={fetchPaymentData}
                      className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>

                {getFilteredAutos().length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No autos found</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm font-medium text-gray-700">
                          {selectedAutosForPayment.size} auto(s) selected
                        </p>
                        <button
                          onClick={() => {
                            if (selectedAutosForPayment.size === getFilteredAutos().length) {
                              setSelectedAutosForPayment(new Set());
                            } else {
                              setSelectedAutosForPayment(new Set(getFilteredAutos().map(a => a.id)));
                            }
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {selectedAutosForPayment.size === getFilteredAutos().length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left">
                                <input
                                  type="checkbox"
                                  checked={selectedAutosForPayment.size === getFilteredAutos().length && getFilteredAutos().length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAutosForPayment(new Set(getFilteredAutos().map(a => a.id)));
                                    } else {
                                      setSelectedAutosForPayment(new Set());
                                    }
                                  }}
                                />
                              </th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Auto No</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Owner</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Area</th>
                              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {getFilteredAutos().map((auto) => (
                              <tr key={auto.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedAutosForPayment.has(auto.id)}
                                    onChange={(e) => {
                                      const newSelected = new Set(selectedAutosForPayment);
                                      if (e.target.checked) {
                                        newSelected.add(auto.id);
                                      } else {
                                        newSelected.delete(auto.id);
                                      }
                                      setSelectedAutosForPayment(newSelected);
                                    }}
                                  />
                                </td>
                                <td className="px-6 py-3 text-sm font-semibold text-gray-900 cursor-pointer hover:text-blue-600" onDoubleClick={() => handleEditAuto(auto)}>
                                  {auto.auto_no}
                                </td>
                                <td className="px-6 py-3 text-sm text-gray-700">
                                  {auto.owner_name || 'N/A'}
                                </td>
                                <td className="px-6 py-3 text-sm text-gray-700">
                                  {auto.area_name || 'N/A'}
                                </td>
                                <td className="px-6 py-3 text-sm text-center">
                                  <div className="relative">
                                    <button
                                      onClick={() => setOpenMenuId(openMenuId === auto.id ? null : auto.id)}
                                      className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
                                      title="Actions"
                                    >
                                      ⋮
                                    </button>
                                    {openMenuId === auto.id && (
                                      <div className="absolute -right-32 top-0 w-40 bg-white border border-gray-200 rounded shadow-lg z-50">
                                        <button
                                          onClick={() => {
                                            handleEditAuto(auto);
                                            setOpenMenuId(null);
                                          }}
                                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                                        >
                                          Edit
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {selectedAutosForPayment.size > 0 && (
                      <button
                        onClick={() => {
                          console.log('🔵 BULK PAYMENT BUTTON CLICKED');
                          console.log('Selected autos count:', selectedAutosForPayment.size);
                          console.log('Selected autos:', Array.from(selectedAutosForPayment));
                          setSnapshotSelectedAutos(new Set(selectedAutosForPayment));
                          setBulkPaymentData({ start_date: '', monthly_cost: '' });
                          setShowBulkPaymentModal(true);
                        }}
                        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition mt-4"
                      >
                        ➕ Create Bulk Payment for {selectedAutosForPayment.size} Auto(s)
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* ===== BULK PAYMENT MODAL ===== */}
          {showBulkPaymentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full my-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Bulk Payment</h2>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleBulkPayment} className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={bulkPaymentData.start_date}
                      onChange={(e) => setBulkPaymentData({ ...bulkPaymentData, start_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Monthly Cost (₹) *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={bulkPaymentData.monthly_cost}
                      onChange={(e) => setBulkPaymentData({ ...bulkPaymentData, monthly_cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Cost"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Advance Payment (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bulkPaymentData.advance_payment}
                      onChange={(e) => setBulkPaymentData({ ...bulkPaymentData, advance_payment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
                    <p className="font-semibold">End Date:</p>
                    <p>
                      {bulkPaymentData.start_date
                        ? parseLocalDate(calculateEndDate(bulkPaymentData.start_date)).toLocaleDateString('en-IN')
                        : 'Select start date'}
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
                    <p className="font-semibold mb-1">💰 Per Auto Summary:</p>
                    <div className="space-y-0.5">
                      <p>Cost: <span className="font-bold">₹{bulkPaymentData.monthly_cost ? parseFloat(bulkPaymentData.monthly_cost).toLocaleString('en-IN') : '0'}</span></p>
                      <p>Advance: <span className="font-bold">₹{bulkPaymentData.advance_payment ? parseFloat(bulkPaymentData.advance_payment).toLocaleString('en-IN') : '0'}</span></p>
                      <p>Remaining: <span className="font-bold text-orange-600">₹{bulkPaymentData.monthly_cost && bulkPaymentData.advance_payment ? (parseFloat(bulkPaymentData.monthly_cost) - parseFloat(bulkPaymentData.advance_payment)).toLocaleString('en-IN') : (bulkPaymentData.monthly_cost ? parseFloat(bulkPaymentData.monthly_cost).toLocaleString('en-IN') : '0')}</span></p>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-700">
                    <p className="font-semibold">Selected: {snapshotSelectedAutos.size} auto(s)</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkPaymentModal(false);
                        setBulkPaymentData({ start_date: '', monthly_cost: '', advance_payment: '' });
                        setSnapshotSelectedAutos(new Set());
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bulkPaymentLoading}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold text-sm"
                    >
                      {bulkPaymentLoading ? 'Creating...' : `Create (${snapshotSelectedAutos.size})`}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ===== EDIT AUTO PAYMENT MODAL ===== */}
          {showEditPaymentModal && editingPayment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full my-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Payment</h2>
                
                <form onSubmit={handleSaveAutoPaymentEdit} className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Auto</label>
                    <p className="px-3 py-2 bg-gray-100 rounded-lg text-gray-900 font-semibold text-sm">
                      {editingPayment.auto_no}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Monthly Cost (₹) *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={editPaymentData.monthly_cost || ''}
                      onChange={(e) => setEditPaymentData({ ...editPaymentData, monthly_cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Advance Payment (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPaymentData.advance_payment || ''}
                      onChange={(e) => setEditPaymentData({ ...editPaymentData, advance_payment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={editPaymentData.start_date || ''}
                      onChange={(e) => {
                        const newStartDate = e.target.value;
                        const endDateString = calculateEndDate(newStartDate);
                        
                        setEditPaymentData({ 
                          ...editPaymentData, 
                          start_date: newStartDate,
                          end_date: endDateString
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">End Date (Auto-calc)</label>
                    <input
                      type="date"
                      disabled
                      value={editPaymentData.end_date || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed text-sm"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditPaymentModal(false);
                        setEditingPayment(null);
                        setEditPaymentData({});
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editPaymentLoading}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold text-sm"
                    >
                      {editPaymentLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ===== AUTO PAYMENT DETAILS MODAL ===== */}
          {showAutoPaymentDetailsModal && selectedAutoPaymentDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Details</h2>
                
                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-600 font-semibold">Auto No.</p>
                    <p className="text-gray-900 font-bold">{selectedAutoPaymentDetails.auto_no}</p>
                  </div>

                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-600 font-semibold">Area</p>
                    <p className="text-gray-900">{selectedAutoPaymentDetails.area_name || 'N/A'}</p>
                  </div>

                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-600 font-semibold">Monthly Cost</p>
                    <p className="text-green-600 font-bold text-lg">₹{(selectedAutoPaymentDetails.monthly_cost || 0).toLocaleString('en-IN')}</p>
                  </div>

                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-600 font-semibold">Advance Paid</p>
                    <p className="text-blue-600 font-bold text-lg">₹{(selectedAutoPaymentDetails.advance_payment || 0).toLocaleString('en-IN')}</p>
                  </div>

                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-600 font-semibold">Remaining to be Paid</p>
                    <p className="text-orange-600 font-bold text-lg">₹{((selectedAutoPaymentDetails.monthly_cost || 0) - (selectedAutoPaymentDetails.advance_payment || 0)).toLocaleString('en-IN')}</p>
                  </div>

                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-600 font-semibold">Start Date</p>
                    <p className="text-gray-900">{parseLocalDate(selectedAutoPaymentDetails.start_date.split('T')[0]).toLocaleDateString('en-IN')}</p>
                  </div>

                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-600 font-semibold">End Date</p>
                    <p className="text-gray-900">{parseLocalDate(selectedAutoPaymentDetails.end_date.split('T')[0]).toLocaleDateString('en-IN')}</p>
                  </div>

                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-600 font-semibold">Notes</p>
                    <p className="text-gray-900">{selectedAutoPaymentDetails.notes || '-'}</p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => {
                        setShowAutoPaymentDetailsModal(false);
                        setSelectedAutoPaymentDetails(null);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        handleEditAutoPayment(selectedAutoPaymentDetails);
                        setShowAutoPaymentDetailsModal(false);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
