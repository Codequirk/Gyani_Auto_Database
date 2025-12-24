import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { autoService, assignmentService, areaService, companyService } from '../services/api';
import { Card, Button, Input, Modal, LoadingSpinner, Badge, ErrorAlert } from '../components/UI';
import { computeDaysRemaining, formatDate, getStatusBadgeColor } from '../utils/helpers';
import { validateAssignmentDates } from '../utils/assignmentValidation';
import Navbar from '../components/Navbar';

const AutosPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAutos, setSelectedAutos] = useState(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showBulkEditConfirmModal, setShowBulkEditConfirmModal] = useState(false);
  const [bulkEditOverlapWarning, setBulkEditOverlapWarning] = useState(null);
  const [showAssignWizardModal, setShowAssignWizardModal] = useState(false);
  const [showAvailableAreas, setShowAvailableAreas] = useState(false);

  const debounceTimer = useRef(null);
  const [assignData, setAssignData] = useState({ company_id: '', days: '', start_date: '' });
  const [bulkEditData, setBulkEditData] = useState({ company_id: '', days: '', start_date: '' });
  const [wizardData, setWizardData] = useState({ 
    company_id: '', 
    area_id: '', 
    days: '', 
    start_date: '',
    selectedAutoIds: new Set()
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableAutosInDateRange, setAvailableAutosInDateRange] = useState([]);
  const [wizardStep, setWizardStep] = useState(1); // 1: company, 2: area, 3: days/date, 4: select autos
  const [wizardSearchAutos, setWizardSearchAutos] = useState('');
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);
  const [newArea, setNewArea] = useState({ name: '', pin_code: '' });
  const [loadingArea, setLoadingArea] = useState(false);
  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // 300ms delay for faster response

    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  const { data: autos, loading: autosLoading, refetch: refetchAutos } = useFetch(
    () => autoService.list({ search: debouncedSearch, area_id: selectedArea, status: selectedStatus }),
    [debouncedSearch, selectedArea, selectedStatus]
  );

  const { data: areas, refetch: refetchAreas } = useFetch(() => areaService.list());
  const { data: companies } = useFetch(() => companyService.list());

  const handleSelectAuto = (autoId) => {
    const newSelected = new Set(selectedAutos);
    if (newSelected.has(autoId)) {
      newSelected.delete(autoId);
    } else {
      newSelected.add(autoId);
    }
    setSelectedAutos(newSelected);
  };

  const calculateEndDate = (startDate, days) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + parseInt(days));
    return end;
  };

  const isAutoAvailableInDateRange = (auto, newStartDate) => {
    // Convert new start date to proper format for comparison
    const newStart = new Date(newStartDate);
    newStart.setHours(0, 0, 0, 0);

    // IDLE autos are always available
    if (auto.status === 'IDLE') {
      return true;
    }

    // For ASSIGNED/PRE_ASSIGNED autos, check if their end_date is before the new start_date
    if (auto.status === 'ASSIGNED' || auto.status === 'PRE_ASSIGNED') {
      // Find if auto has any current/future assignments
      // The auto object should contain assignment info through the API
      // For now, we check if display_status shows availability
      // We need to fetch full assignment details to check end_date
      return false; // Default: not available unless we confirm via API
    }

    return false;
  };

  const handleDateAndDaysSubmit = () => {
    if (!wizardData.start_date) {
      setError('Please select a start date');
      return;
    }
    if (!wizardData.days || parseInt(wizardData.days) <= 0) {
      setError('Please enter a valid number of days');
      return;
    }

    setError('');
    
    const newStartDate = new Date(wizardData.start_date);
    newStartDate.setHours(0, 0, 0, 0);
    
    // Get available autos for the selected area and date range
    // Separate IDLE autos and ASSIGNED/PRE_ASSIGNED autos that are available
    const idleAutos = autos?.filter(auto => 
      auto.area_id === wizardData.area_id && auto.status === 'IDLE'
    ) || [];
    
    const availableNonIdleAutos = autos?.filter(auto => {
      if (auto.area_id !== wizardData.area_id) return false;
      if (auto.status === 'IDLE') return false;
      
      // For ASSIGNED/PRE_ASSIGNED autos, check if end_date (if available) is before new start_date
      // The list endpoint returns assignments info, we need to check the most recent assignment's end_date
      if (auto.assignments && auto.assignments.length > 0) {
        // Get the most recent assignment
        const sortedAssignments = [...auto.assignments].sort(
          (a, b) => new Date(b.start_date) - new Date(a.start_date)
        );
        const mostRecentAssignment = sortedAssignments[0];
        
        if (mostRecentAssignment) {
          const assignmentEndDate = new Date(mostRecentAssignment.end_date);
          assignmentEndDate.setHours(0, 0, 0, 0);
          
          // Auto is available if assignment ends before new assignment starts
          return assignmentEndDate < newStartDate;
        }
      }
      
      return false;
    }) || [];
    
    // Combine with IDLE autos first, then available non-IDLE autos
    const available = [...idleAutos, ...availableNonIdleAutos];
    
    // Auto-select top 4 autos (prioritizing IDLE)
    const topFourIds = new Set(available.slice(0, 4).map(auto => auto.id));
    
    setAvailableAutosInDateRange(available);
    setWizardData({ ...wizardData, selectedAutoIds: topFourIds });
    setWizardSearchAutos('');
    setWizardStep(4);
  };

  const toggleAutoSelection = (autoId) => {
    const newSelected = new Set(wizardData.selectedAutoIds);
    if (newSelected.has(autoId)) {
      newSelected.delete(autoId);
    } else {
      newSelected.add(autoId);
    }
    setWizardData({ ...wizardData, selectedAutoIds: newSelected });
  };

  const handleWizardNext = () => {
    if (wizardStep === 1 && !wizardData.company_id) {
      setError('Please select a company');
      return;
    }
    if (wizardStep === 2 && !wizardData.area_id) {
      setError('Please select an area');
      return;
    }

    setError('');
    if (wizardStep < 3) {
      setWizardStep(wizardStep + 1);
    } else if (wizardStep === 3) {
      handleDateAndDaysSubmit();
    }
  };

  const handleWizardAssign = async () => {
    if (wizardData.selectedAutoIds.size === 0) {
      setError('Please select at least one auto to assign');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const startDate = wizardData.start_date ? new Date(wizardData.start_date) : new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(wizardData.days));

      // Validate each auto before submitting
      const autosToAssign = availableAutosInDateRange.filter(auto => 
        wizardData.selectedAutoIds.has(auto.id)
      );

      const validationErrors = [];
      for (const auto of autosToAssign) {
        const validation = validateAssignmentDates(auto, startDate, endDate);
        if (!validation.isValid) {
          validationErrors.push(`${auto.auto_no}: ${validation.error}`);
        }
      }

      if (validationErrors.length > 0) {
        setError(validationErrors.join('\n'));
        setLoading(false);
        return;
      }

      await assignmentService.bulk({
        auto_ids: Array.from(wizardData.selectedAutoIds),
        company_id: wizardData.company_id,
        days: parseInt(wizardData.days),
        start_date: wizardData.start_date || undefined,
        is_prebooked: true,
      });

      setSuccess(`${wizardData.selectedAutoIds.size} autos assigned successfully`);
      setShowAssignWizardModal(false);
      setWizardStep(1);
      setWizardData({ 
        company_id: '', 
        area_id: '', 
        days: '', 
        start_date: '',
        selectedAutoIds: new Set()
      });
      setAvailableAutosInDateRange([]);
      
      // Refetch to get updated data
      await refetchAutos();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign autos');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssign = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const startDate = assignData.start_date ? new Date(assignData.start_date) : new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(assignData.days));

      // Validate each selected auto before submitting
      const autosToAssign = autos.filter(auto => selectedAutos.has(auto.id));
      const validationErrors = [];

      for (const auto of autosToAssign) {
        const validation = validateAssignmentDates(auto, startDate, endDate);
        if (!validation.isValid) {
          validationErrors.push(`${auto.auto_no}: ${validation.error}`);
        }
      }

      if (validationErrors.length > 0) {
        setError(validationErrors.join('\n'));
        setLoading(false);
        return;
      }

      await assignmentService.bulk({
        auto_ids: Array.from(selectedAutos),
        company_id: assignData.company_id,
        days: parseInt(assignData.days),
        start_date: assignData.start_date || undefined,
        is_prebooked: false,
      });

      setSuccess('Autos assigned successfully');
      setSelectedAutos(new Set());
      setShowBulkAssignModal(false);
      setAssignData({ company_id: '', days: '', start_date: '' });
      
      // Refetch to get updated data
      await refetchAutos();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign autos');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEditOpen = () => {
    if (selectedAutos.size === 0) {
      setError('Please select at least one auto to edit');
      return;
    }

    setError('');
    setBulkEditData({ company_id: '', days: '', start_date: '' });
    setShowBulkEditModal(true);
  };

  const handleBulkEditCheckOverlap = async (e) => {
    e.preventDefault();
    setError('');

    if (!bulkEditData.company_id || !bulkEditData.days || !bulkEditData.start_date) {
      setError('All fields are required');
      return;
    }

    setLoading(true);

    try {
      // Get selected autos data
      const autosToEdit = autos.filter(auto => selectedAutos.has(auto.id));

      // Get all company IDs from selected autos
      const companiesInSelection = new Set();
      const dateRanges = [];

      for (const auto of autosToEdit) {
        if (auto.current_assignment) {
          companiesInSelection.add(auto.current_assignment.company_id);
          dateRanges.push({
            auto_no: auto.auto_no,
            company_id: auto.current_assignment.company_id,
            start_date: auto.current_assignment.start_date,
            end_date: auto.current_assignment.end_date,
          });
        }
      }

      // Check for company overlaps
      const hasMultipleCompanies = companiesInSelection.size > 1;

      // Check for date overlaps with new dates
      const newStartDate = new Date(bulkEditData.start_date);
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + parseInt(bulkEditData.days));

      const dateOverlaps = [];
      for (const range of dateRanges) {
        const oldStart = new Date(range.start_date);
        const oldEnd = new Date(range.end_date);

        // Check if date ranges overlap
        const hasOverlap = !(newEndDate < oldStart || newStartDate > oldEnd);

        if (hasOverlap) {
          dateOverlaps.push({
            auto_no: range.auto_no,
            old_start: range.start_date,
            old_end: range.end_date,
            new_start: newStartDate.toISOString().split('T')[0],
            new_end: newEndDate.toISOString().split('T')[0],
          });
        }
      }

      // If there are overlaps or multiple companies, show confirmation
      if (hasMultipleCompanies || dateOverlaps.length > 0) {
        const warnings = [];
        
        if (hasMultipleCompanies) {
          warnings.push('⚠️ Autos are from different companies');
        }

        if (dateOverlaps.length > 0) {
          warnings.push(`⚠️ Date overlap detected for ${dateOverlaps.length} auto(s)`);
        }

        setBulkEditOverlapWarning({
          hasMultipleCompanies,
          dateOverlaps,
          warnings,
          newCompanyId: bulkEditData.company_id,
          newStartDate: bulkEditData.start_date,
          newDays: bulkEditData.days,
        });

        setShowBulkEditModal(false);
        setShowBulkEditConfirmModal(true);
      } else {
        // No overlaps, proceed with update
        await handleBulkEditConfirm();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check for overlaps');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEditConfirm = async () => {
    if (!bulkEditOverlapWarning && (!bulkEditData.company_id || !bulkEditData.days || !bulkEditData.start_date)) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setShowBulkEditConfirmModal(false);

    try {
      const startDate = bulkEditOverlapWarning ? bulkEditOverlapWarning.newStartDate : bulkEditData.start_date;
      const days = bulkEditOverlapWarning ? bulkEditOverlapWarning.newDays : bulkEditData.days;
      const companyId = bulkEditOverlapWarning ? bulkEditOverlapWarning.newCompanyId : bulkEditData.company_id;

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(days));

      // Call bulk update endpoint
      await assignmentService.bulkUpdate({
        auto_ids: Array.from(selectedAutos),
        company_id: companyId,
        days: parseInt(days),
        start_date: startDate,
      });

      setSuccess('Autos updated successfully');
      setSelectedAutos(new Set());
      setShowBulkEditModal(false);
      setShowBulkEditConfirmModal(false);
      setBulkEditData({ company_id: '', days: '', start_date: '' });
      setBulkEditOverlapWarning(null);
      
      // Refetch to get updated data
      await refetchAutos();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update autos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddArea = async (e) => {
    e.preventDefault();
    if (!newArea.name.trim()) {
      setError('Area name is required');
      return;
    }

    setLoadingArea(true);
    setError('');

    try {
      // Check if pin code already exists
      if (newArea.pin_code.trim()) {
        const existingArea = areas?.find(a => a.pin_code === newArea.pin_code.trim());
        if (existingArea) {
          setError(`This pin code already exists for area "${existingArea.name}"`);
          setLoadingArea(false);
          return;
        }
      }

      await areaService.create({
        name: newArea.name.trim(),
        pin_code: newArea.pin_code.trim(),
      });

      setSuccess(`Area "${newArea.name}" added successfully`);
      setShowAddAreaModal(false);
      setNewArea({ name: '', pin_code: '' });
      
      // Refetch areas
      await refetchAreas();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add area');
    } finally {
      setLoadingArea(false);
    }
  };

  const handleManageAssignment = (auto) => {
    setSelectedAutoForManagement(auto);
    // Initialize edit data with current values
    if (auto.current_assignment) {
      setManagementEditData({
        days: auto.days_remaining || '',
        start_date: auto.current_assignment.start_date || '',
        company_id: auto.current_assignment.company_id || '',
      });
    }
    setShowManageAssignmentModal(true);
  };

  const handleUndoAssignment = async () => {
    if (!selectedAutoForManagement) return;

    setLoading(true);
    try {
      await assignmentService.deleteByAutoId(selectedAutoForManagement.id);
      setSuccess(`All assignments for ${selectedAutoForManagement.auto_no} have been removed`);
      setShowManageAssignmentModal(false);
      setSelectedAutoForManagement(null);
      setManagementEditData({ days: '', start_date: '', company_id: '' });
      
      // Refetch to get updated data
      await refetchAutos();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAssignment = async () => {
    if (!selectedAutoForManagement || !managementEditData.company_id || !managementEditData.days || !managementEditData.start_date) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const startDate = new Date(managementEditData.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(managementEditData.days));

      // First, delete all current assignments
      await assignmentService.deleteByAutoId(selectedAutoForManagement.id);

      // Then create new assignment
      await assignmentService.create({
        auto_id: selectedAutoForManagement.id,
        company_id: managementEditData.company_id,
        start_date: managementEditData.start_date,
        end_date: endDate.toISOString().split('T')[0],
        status: 'ACTIVE',
      });

      setSuccess('Assignment updated successfully');
      setShowManageAssignmentModal(false);
      setSelectedAutoForManagement(null);
      setManagementEditData({ days: '', start_date: '', company_id: '' });
      
      // Refetch to get updated data
      await refetchAutos();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update assignment');
    } finally {
      setLoading(false);
    }
  };

  if (autosLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Autos Management</h1>
          <div className="space-x-3">
            <Button onClick={() => setShowAssignWizardModal(true)}>⚡ Assign Autos</Button>
            <Button onClick={() => navigate('/autos/create')}>+ Add Auto</Button>
          </div>
        </div>

        {error && <ErrorAlert message={error} />}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              placeholder="Search by company, auto_no, owner name, area, or pin code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="IDLE">Idle</option>
              <option value="PRE_ASSIGNED">Pre-assigned</option>
              <option value="ASSIGNED">Assigned</option>
            </select>

            {/* Available Areas Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAvailableAreas(!showAvailableAreas)}
                className="w-full text-left px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{selectedArea ? areas?.find(a => a.id === selectedArea)?.name : '📍 All Areas'}</span>
                  <span className={`text-xs transition-transform ${showAvailableAreas ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>

              {showAvailableAreas && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedArea('');
                      setShowAvailableAreas(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition ${
                      selectedArea === '' ? 'bg-blue-100' : ''
                    }`}
                  >
                    All Areas
                  </button>
                  {areas?.map((area) => (
                    <button
                      key={area.id}
                      onClick={() => {
                        setSelectedArea(area.id);
                        setShowAvailableAreas(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition border-b last:border-b-0 ${
                        selectedArea === area.id ? 'bg-blue-100' : ''
                      }`}
                    >
                      <div>{area.name}</div>
                      {area.pin_code && (
                        <div className="text-xs text-gray-500">{area.pin_code}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowAddAreaModal(true)}
            className="w-full mt-3 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
          >
            + Add New Area
          </button>

          {selectedAutos.size > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-3">{selectedAutos.size} auto(s) selected</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowBulkAssignModal(true)}
                  variant="success"
                  className="flex-1"
                >
                  Bulk Assign Selected
                </Button>
                <Button
                  onClick={() => setShowBulkEditModal(true)}
                  variant="primary"
                  className="flex-1"
                >
                  Bulk Edit Selected
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Autos Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectedAutos.size === autos?.length && autos?.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAutos(new Set(autos.map(a => a.id)));
                        } else {
                          setSelectedAutos(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Auto No</th>
                  <th className="px-4 py-2 text-left font-medium">Owner</th>
                  <th className="px-4 py-2 text-left font-medium">Area</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Company</th>
                  <th className="px-4 py-2 text-left font-medium">Days Remaining</th>
                  <th className="px-4 py-2 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {autos?.map((auto) => (
                  <tr key={auto.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedAutos.has(auto.id)}
                        onChange={() => handleSelectAuto(auto.id)}
                      />
                    </td>
                    <td className="px-4 py-2 font-medium">{auto.auto_no}</td>
                    <td className="px-4 py-2">{auto.owner_name}</td>
                    <td className="px-4 py-2">{auto.area_name}</td>
                    <td className="px-4 py-2">
                      <Badge className={getStatusBadgeColor(auto.display_status || auto.status)}>{auto.display_status || auto.status}</Badge>
                    </td>
                    <td className="px-4 py-2">{auto.current_company || '-'}</td>
                    <td className="px-4 py-2">
                      {auto.days_remaining !== null ? `${auto.days_remaining} days` : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <a href={`/autos/${auto.id}`} className="text-blue-600 hover:underline text-sm">
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {autos?.length === 0 && (
            <p className="text-center py-8 text-gray-600">No autos found</p>
          )}
        </Card>
      </div>

      {/* Assignment Wizard Modal */}
      <Modal
        isOpen={showAssignWizardModal}
        onClose={() => {
          setShowAssignWizardModal(false);
          setWizardStep(1);
          setWizardData({ company_id: '', area_id: '', days: '', start_date: '', selectedAutoIds: new Set() });
          setAvailableAutosInDateRange([]);
          setWizardSearchAutos('');
          setError('');
        }}
        title={`Assign Autos - Step ${wizardStep}/4`}
      >
        {error && <ErrorAlert message={error} />}

        {wizardStep === 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Company *
            </label>
            <select
              value={wizardData.company_id}
              onChange={(e) => {
                setWizardData({ ...wizardData, company_id: e.target.value });
                setError('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a company --</option>
              {companies?.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
        )}

        {wizardStep === 2 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Area *
            </label>
            <div className="space-y-2 mb-4">
              {areas?.map((area) => (
                <button
                  key={area.id}
                  onClick={() => {
                    setWizardData({ ...wizardData, area_id: area.id });
                    setError('');
                    setWizardStep(3);
                  }}
                  className="w-full text-left p-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <div className="font-medium">{area.name}</div>
                  <div className="text-sm text-gray-600">{area.pin_code}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {wizardStep === 3 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <Input
              type="date"
              value={wizardData.start_date}
              onChange={(e) => {
                setWizardData({ ...wizardData, start_date: e.target.value });
                setError('');
              }}
              className="mb-4"
            />

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Days *
            </label>
            <Input
              type="number"
              value={wizardData.days}
              onChange={(e) => {
                setWizardData({ ...wizardData, days: e.target.value });
                setError('');
              }}
              min="1"
              placeholder="e.g., 7 days"
              className="mb-4"
            />

            {wizardData.start_date && wizardData.days && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>End Date:</strong> {formatDate(calculateEndDate(wizardData.start_date, wizardData.days))}
                </p>
              </div>
            )}
          </div>
        )}

        {wizardStep === 4 && (
          <div>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Select Autos to Assign:</strong> {wizardData.selectedAutoIds.size} selected / {availableAutosInDateRange.length} available
              </p>
            </div>

            <Input
              type="text"
              placeholder="Search by auto number or owner name"
              value={wizardSearchAutos}
              onChange={(e) => setWizardSearchAutos(e.target.value)}
              className="mb-4"
            />

            <div className="max-h-96 overflow-y-auto border border-gray-300 rounded-lg">
              {availableAutosInDateRange.length > 0 ? (
                <div className="divide-y">
                  {(() => {
                    // Separate IDLE and available non-IDLE autos
                    const idleAutos = availableAutosInDateRange.filter(a => a.status === 'IDLE');
                    const availableNonIdleAutos = availableAutosInDateRange.filter(a => a.status !== 'IDLE');
                    
                    const filteredIdleAutos = idleAutos.filter(auto =>
                      auto.auto_no.toLowerCase().includes(wizardSearchAutos.toLowerCase()) ||
                      auto.owner_name.toLowerCase().includes(wizardSearchAutos.toLowerCase())
                    );
                    
                    const filteredNonIdleAutos = availableNonIdleAutos.filter(auto =>
                      auto.auto_no.toLowerCase().includes(wizardSearchAutos.toLowerCase()) ||
                      auto.owner_name.toLowerCase().includes(wizardSearchAutos.toLowerCase())
                    );

                    return (
                      <>
                        {/* IDLE Autos Section */}
                        {filteredIdleAutos.length > 0 && (
                          <div>
                            <div className="sticky top-0 bg-green-100 px-3 py-2 font-semibold text-green-900 text-sm">
                              ✓ Available (IDLE) - {filteredIdleAutos.length}
                            </div>
                            {filteredIdleAutos.map((auto) => (
                              <div
                                key={auto.id}
                                onClick={() => toggleAutoSelection(auto.id)}
                                className={`p-3 cursor-pointer hover:bg-gray-50 transition ${
                                  wizardData.selectedAutoIds.has(auto.id) ? 'bg-blue-100' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={wizardData.selectedAutoIds.has(auto.id)}
                                    onChange={() => {}}
                                    className="cursor-pointer"
                                  />
                                  <div className="flex-1">
                                    <p className="font-medium">{auto.auto_no}</p>
                                    <p className="text-sm text-gray-600">{auto.owner_name} - {auto.area_name}</p>
                                  </div>
                                  <Badge className={getStatusBadgeColor(auto.display_status || auto.status)}>
                                    {auto.display_status || auto.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Available Non-IDLE Autos Section */}
                        {filteredNonIdleAutos.length > 0 && (
                          <div>
                            <div className="sticky top-0 bg-yellow-100 px-3 py-2 font-semibold text-yellow-900 text-sm">
                              ⏱ Available After Current Assignment - {filteredNonIdleAutos.length}
                            </div>
                            {filteredNonIdleAutos.map((auto) => (
                              <div
                                key={auto.id}
                                onClick={() => toggleAutoSelection(auto.id)}
                                className={`p-3 cursor-pointer hover:bg-gray-50 transition ${
                                  wizardData.selectedAutoIds.has(auto.id) ? 'bg-blue-100' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={wizardData.selectedAutoIds.has(auto.id)}
                                    onChange={() => {}}
                                    className="cursor-pointer"
                                  />
                                  <div className="flex-1">
                                    <p className="font-medium">{auto.auto_no}</p>
                                    <p className="text-sm text-gray-600">{auto.owner_name} - {auto.area_name}</p>
                                  </div>
                                  <Badge className={getStatusBadgeColor(auto.display_status || auto.status)}>
                                    {auto.display_status || auto.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* No results message */}
                        {filteredIdleAutos.length === 0 && filteredNonIdleAutos.length === 0 && (
                          <div className="p-6 text-center text-gray-500">
                            No autos match your search
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No autos available for the selected date range in this area
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-6">
          {wizardStep > 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (wizardStep === 4) {
                  setWizardStep(3);
                } else if (wizardStep === 3) {
                  setWizardStep(2);
                } else {
                  setWizardStep(wizardStep - 1);
                }
              }}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {wizardStep < 4 && (
            <Button
              type="button"
              onClick={handleWizardNext}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Next'}
            </Button>
          )}
          {wizardStep === 4 && (
            <Button
              type="button"
              onClick={handleWizardAssign}
              disabled={loading || wizardData.selectedAutoIds.size === 0}
              className="flex-1"
            >
              {loading ? 'Assigning...' : 'Assign Autos'}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowAssignWizardModal(false);
              setWizardStep(1);
              setWizardData({ company_id: '', area_id: '', days: '', start_date: '', selectedAutoIds: new Set() });
              setAvailableAutosInDateRange([]);
              setWizardSearchAutos('');
              setError('');
            }}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Bulk Assign Modal (for selected autos from table) */}
      <Modal
        isOpen={showBulkAssignModal}
        onClose={() => setShowBulkAssignModal(false)}
        title="Bulk Assign Selected Autos"
      >
        <form onSubmit={handleBulkAssign}>
          <select
            required
            value={assignData.company_id}
            onChange={(e) => setAssignData({ ...assignData, company_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Company</option>
            {companies?.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>

          <Input
            type="number"
            label="Number of Days"
            required
            value={assignData.days}
            onChange={(e) => setAssignData({ ...assignData, days: e.target.value })}
            min="1"
          />

          <Input
            type="date"
            label="Start Date (Optional)"
            value={assignData.start_date}
            onChange={(e) => setAssignData({ ...assignData, start_date: e.target.value })}
          />

          <div className="flex gap-2 mt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Assigning...' : 'Assign'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowBulkAssignModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Area Modal */}
      <Modal
        isOpen={showAddAreaModal}
        onClose={() => {
          setShowAddAreaModal(false);
          setNewArea({ name: '', pin_code: '' });
          setError('');
        }}
        title="Add New Area"
      >
        <form onSubmit={handleAddArea}>
          {error && <ErrorAlert message={error} />}
          
          <Input
            type="text"
            label="Area Name *"
            required
            value={newArea.name}
            onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
            placeholder="e.g., Malleswaram"
            className="mb-4"
          />

          <Input
            type="text"
            label="Pin Code (Optional)"
            value={newArea.pin_code}
            onChange={(e) => setNewArea({ ...newArea, pin_code: e.target.value })}
            placeholder="e.g., 560003"
          />

          <div className="flex gap-2 mt-4">
            <Button type="submit" disabled={loadingArea} className="flex-1">
              {loadingArea ? 'Adding...' : 'Add Area'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddAreaModal(false);
                setNewArea({ name: '', pin_code: '' });
                setError('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Edit Modal */}
      <Modal
        isOpen={showBulkEditModal}
        onClose={() => {
          setShowBulkEditModal(false);
          setBulkEditData({ company_id: '', days: '', start_date: '' });
          setError('');
        }}
        title="Bulk Edit Selected Autos"
      >
        <form onSubmit={handleBulkEditCheckOverlap}>
          {error && <ErrorAlert message={error} />}
          
          <select
            required
            value={bulkEditData.company_id}
            onChange={(e) => setBulkEditData({ ...bulkEditData, company_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Company</option>
            {companies?.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>

          <Input
            type="number"
            label="Number of Days *"
            required
            value={bulkEditData.days}
            onChange={(e) => setBulkEditData({ ...bulkEditData, days: e.target.value })}
            min="1"
          />

          <Input
            type="date"
            label="Start Date *"
            required
            value={bulkEditData.start_date}
            onChange={(e) => setBulkEditData({ ...bulkEditData, start_date: e.target.value })}
          />

          <div className="flex gap-2 mt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Checking...' : 'Next'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowBulkEditModal(false);
                setBulkEditData({ company_id: '', days: '', start_date: '' });
                setError('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Edit Confirmation Modal (for overlaps) */}
      <Modal
        isOpen={showBulkEditConfirmModal}
        onClose={() => {
          setShowBulkEditConfirmModal(false);
          setBulkEditOverlapWarning(null);
          setError('');
        }}
        title="Update Assignments - Overlaps Detected"
      >
        {bulkEditOverlapWarning && (
          <div>
            {bulkEditOverlapWarning.warnings.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Overlap Alert</h3>
                {bulkEditOverlapWarning.warnings.map((warning, idx) => (
                  <p key={idx} className="text-sm text-yellow-800 mb-1">{warning}</p>
                ))}
              </div>
            )}

            {bulkEditOverlapWarning.hasMultipleCompanies && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  Selected autos belong to different companies. They will all be updated to company: <strong>{companies?.find(c => c.id === bulkEditOverlapWarning.newCompanyId)?.name}</strong>
                </p>
              </div>
            )}

            {bulkEditOverlapWarning.dateOverlaps.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-sm mb-2">Date Conflicts:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bulkEditOverlapWarning.dateOverlaps.map((overlap, idx) => (
                    <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                      <p className="font-medium text-red-900">{overlap.auto_no}</p>
                      <p className="text-red-800 text-xs">Current: {overlap.old_start} to {overlap.old_end}</p>
                      <p className="text-red-800 text-xs">New: {overlap.new_start} to {overlap.new_end}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <Button 
                onClick={handleBulkEditConfirm} 
                disabled={loading}
                variant="danger"
                className="flex-1"
              >
                {loading ? 'Updating...' : 'Update Anyway'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowBulkEditConfirmModal(false);
                  setBulkEditOverlapWarning(null);
                  setError('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default AutosPage;
