import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch, usePolling } from '../hooks/useFetch';
import { autoService, assignmentService, areaService, companyService } from '../services/api';
import { Card, Button, Input, Modal, LoadingSpinner, Badge, ErrorAlert } from '../components/UI';
import { computeDaysRemaining, formatDate, getStatusBadgeColor, formatDaysRemaining } from '../utils/helpers';
import { validateAssignmentDates } from '../utils/assignmentValidation';
import Navbar from '../components/Navbar';

const AutoActionMenu = ({ auto, onEdit, onDelete, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleMenuOpen = () => {
    if (!isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.top + rect.height / 2, left: rect.right + 8 });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={handleMenuOpen}
        className="text-gray-600 hover:text-gray-800 font-bold text-lg p-1"
        title="Actions"
      >
        ⋮
      </button>
      {isOpen && (
        <div 
          className="fixed w-40 bg-white rounded shadow-lg z-[9999] border border-gray-200"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, transform: 'translateY(-50%)' }}
        >
          <button
            onClick={() => {
              onEdit(auto);
              setIsOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
          >
            Edit
          </button>
          <button
            onClick={() => {
              onDelete(auto);
              setIsOpen(false);
            }}
            disabled={isLoading}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

const AutosPage = () => {
  const [search, setSearch] = useState(() => sessionStorage.getItem('autosPage_search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => sessionStorage.getItem('autosPage_debouncedSearch') || '');
  const [selectedArea, setSelectedArea] = useState(() => sessionStorage.getItem('autosPage_selectedArea') || '');
  const [selectedStatus, setSelectedStatus] = useState(() => sessionStorage.getItem('autosPage_selectedStatus') || '');
  const [selectedAutos, setSelectedAutos] = useState(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showBulkEditConfirmModal, setShowBulkEditConfirmModal] = useState(false);
  const [bulkEditOverlapWarning, setBulkEditOverlapWarning] = useState(null);
  const [showAssignWizardModal, setShowAssignWizardModal] = useState(false);
  const [showAvailableAreas, setShowAvailableAreas] = useState(false);

  const debounceTimer = useRef(null);
  const areasDropdownRef = useRef(null);
  const [assignData, setAssignData] = useState({ company_id: '', days: '', start_date: '', cost_per_day: '' });
  const [bulkEditData, setBulkEditData] = useState({ company_id: '', days: '', start_date: '' });
  const [wizardData, setWizardData] = useState({ 
    company_id: '', 
    autos_required: '',
    area_id: '', 
    days: '', 
    start_date: '',
    cost_per_day: '',
    selectedAutoIds: new Set()
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableAutosInDateRange, setAvailableAutosInDateRange] = useState([]);
  const [wizardStep, setWizardStep] = useState(1); // 1: company, 2: autos_required, 3: days/date/cost, 4: area, 5: select autos
  const [wizardSearchAutos, setWizardSearchAutos] = useState('');
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);
  const [newArea, setNewArea] = useState({ name: '', pin_code: '' });
  const [loadingArea, setLoadingArea] = useState(false);
  const [selectedAutoForEdit, setSelectedAutoForEdit] = useState(null);
  const [showAutoEditModal, setShowAutoEditModal] = useState(false);
  const [autoEditData, setAutoEditData] = useState({ auto_no: '', owner_name: '', driver_phone: '', notes: '' });
  const [autoEditLoading, setAutoEditLoading] = useState(false);
  const [autoEditError, setAutoEditError] = useState('');
  const [selectedAreaForMenu, setSelectedAreaForMenu] = useState(null);
  const [showAreaMenu, setShowAreaMenu] = useState(null);
  const [showEditAreaModal, setShowEditAreaModal] = useState(false);
  const [editAreaData, setEditAreaData] = useState({ id: '', name: '', pin_code: '' });
  const [editAreaLoading, setEditAreaLoading] = useState(false);
  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      sessionStorage.setItem('autosPage_debouncedSearch', search);
    }, 300); // 300ms delay for faster response

    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  // Persist search filter to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('autosPage_search', search);
  }, [search]);

  // Persist area filter to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('autosPage_selectedArea', selectedArea);
  }, [selectedArea]);

  // Persist status filter to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('autosPage_selectedStatus', selectedStatus);
  }, [selectedStatus]);

  const { data: autos, loading: autosLoading, refetch: refetchAutos } = usePolling(
    () => autoService.list({ search: debouncedSearch, area_id: selectedArea, status: selectedStatus }),
    30000 // Refresh every 30 seconds
  );

  useEffect(() => {
    // Re-fetch when filters change
    refetchAutos();
  }, [debouncedSearch, selectedArea, selectedStatus]);

  // Handle click outside areas dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (areasDropdownRef.current && !areasDropdownRef.current.contains(event.target)) {
        setShowAvailableAreas(false);
      }
    }

    if (showAvailableAreas) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAvailableAreas]);

  const { data: allAutos } = useFetch(() => autoService.list());

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
    // If 1 day is selected, end date should be the same day (start date)
    // So we add (days - 1) to the start date
    end.setDate(end.getDate() + (parseInt(days) - 1));
    return end;
  };

  const getAutoCountByArea = (areaId) => {
    if (!allAutos) return 0;
    return allAutos.filter(auto => auto.area_id === areaId).length;
  };

  const getIdleAutoCountByArea = (areaId) => {
    if (!allAutos) return 0;
    // Use display_status which is calculated based on date ranges
    return allAutos.filter(auto => auto.area_id === areaId && (auto.display_status === 'IDLE' || auto.status === 'IDLE')).length;
  };

  const getAvailableIdleAutoCountByArea = (areaId, startDate, endDateStr) => {
    if (!autos || !startDate || !endDateStr) return 0;
    
    const newStartDate = new Date(startDate);
    newStartDate.setHours(0, 0, 0, 0);
    
    return autos.filter(auto => {
      if (auto.area_id !== areaId) return false;
      
      // Use display_status (calculated based on dates) 
      const status = auto.display_status || auto.status;
      
      // Count IDLE autos
      if (status === 'IDLE') return true;
      
      // Also count autos with expired assignments that will become IDLE before our start date
      if (auto.assignments && auto.assignments.length > 0) {
        const sortedAssignments = [...auto.assignments].sort(
          (a, b) => new Date(b.end_date) - new Date(a.end_date)
        );
        const mostRecentAssignment = sortedAssignments[0];
        
        if (mostRecentAssignment) {
          const assignmentEndDate = new Date(mostRecentAssignment.end_date);
          assignmentEndDate.setHours(0, 0, 0, 0);
          // Auto is available if most recent assignment ends before our start date
          return assignmentEndDate < newStartDate;
        }
      }
      
      return false;
    }).length;
  };

  const getTotalAutoCount = () => {
    if (!allAutos) return 0;
    return allAutos.length;
  };

  const isAutoAvailableForDateRange = (auto, startDate, endDate) => {
    // Convert dates to proper format for comparison
    const newStart = new Date(startDate);
    newStart.setHours(0, 0, 0, 0);
    const newEnd = new Date(endDate);
    newEnd.setHours(0, 0, 0, 0);

    // IDLE autos are always available
    if (auto.display_status === 'IDLE' || auto.status === 'IDLE') {
      return true;
    }

    // If auto has assignments, check if ANY assignment overlaps with our date range
    if (auto.assignments && auto.assignments.length > 0) {
      // An assignment overlaps if: assignmentStart <= ourEnd AND assignmentEnd >= ourStart
      const hasOverlap = auto.assignments.some(assignment => {
        const assignStart = new Date(assignment.start_date);
        assignStart.setHours(0, 0, 0, 0);
        const assignEnd = new Date(assignment.end_date);
        assignEnd.setHours(0, 0, 0, 0);

        // Check if assignment is NOT completed
        if (assignment.status === 'COMPLETED') {
          return false; // Completed assignments don't block availability
        }

        // Check for overlap: assignStart <= newEnd AND assignEnd >= newStart
        return assignStart <= newEnd && assignEnd >= newStart;
      });

      // Auto is available if NO overlapping assignments exist
      return !hasOverlap;
    }

    return true; // No assignments, so available
  };

  const isAutoAvailableInDateRange = (auto, newStartDate) => {
    // Convert new start date to proper format for comparison
    const newStart = new Date(newStartDate);
    newStart.setHours(0, 0, 0, 0);

    // IDLE autos are always available
    if (auto.display_status === 'IDLE' || auto.status === 'IDLE') {
      return true;
    }

    // For ACTIVE/PREBOOKED autos, check if their end_date is before the new start_date
    if (auto.assignments && auto.assignments.length > 0) {
      // Check if ANY assignment overlaps with or extends past our start date
      const hasConflict = auto.assignments.some(assignment => {
        const assignEnd = new Date(assignment.end_date);
        assignEnd.setHours(0, 0, 0, 0);

        // Conflict if assignment doesn't end before our start
        return assignEnd >= newStart && assignment.status !== 'COMPLETED';
      });

      return !hasConflict; // Available if no conflicts
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
    
    const newEndDate = calculateEndDate(wizardData.start_date, wizardData.days);
    newEndDate.setHours(0, 0, 0, 0);
    
    // Get available autos for the selected area and date range
    // Filter autos that are truly available for the selected date range AND not blocked
    const available = autos?.filter(auto => 
      auto.area_id === wizardData.area_id && 
      !auto.is_blocked &&
      isAutoAvailableForDateRange(auto, newStartDate, newEndDate)
    ) || [];
    
    // Auto-select up to the requested number of autos (prioritizing IDLE)
    const autoCountNeeded = parseInt(wizardData.autos_required) || 4;
    const topSelectedIds = new Set(available.slice(0, autoCountNeeded).map(auto => auto.id));
    
    setAvailableAutosInDateRange(available);
    setWizardData({ ...wizardData, selectedAutoIds: topSelectedIds });
    setWizardSearchAutos('');
    setWizardStep(5);
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
    if (wizardStep === 2 && !wizardData.autos_required) {
      setError('Please enter the number of autos you need');
      return;
    }
    if (wizardStep === 3 && (!wizardData.start_date || !wizardData.days)) {
      setError('Please enter start date and number of days');
      return;
    }
    if (wizardStep === 3 && (!wizardData.cost_per_day || parseFloat(wizardData.cost_per_day) <= 0)) {
      setError('Please enter a valid cost per day (must be greater than 0)');
      return;
    }
    if (wizardStep === 4 && !wizardData.area_id) {
      setError('Please select an area');
      return;
    }

    setError('');
    if (wizardStep < 4) {
      setWizardStep(wizardStep + 1);
    } else if (wizardStep === 4) {
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
        cost_per_day: wizardData.cost_per_day ? parseFloat(wizardData.cost_per_day) : undefined
      });

      setSuccess(`${wizardData.selectedAutoIds.size} autos assigned successfully`);
      setShowAssignWizardModal(false);
      setWizardStep(1);
      setWizardData({ 
        company_id: '', 
        area_id: '', 
        days: '', 
        start_date: '',
        cost_per_day: '',
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
      if (!assignData.company_id || !assignData.days || !assignData.start_date || !assignData.cost_per_day) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const startDate = new Date(assignData.start_date);
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
        cost_per_day: assignData.cost_per_day ? parseFloat(assignData.cost_per_day) : undefined
      });

      setSuccess('Autos assigned successfully');
      setSelectedAutos(new Set());
      setShowBulkAssignModal(false);
      setAssignData({ company_id: '', days: '', start_date: '', cost_per_day: '' });
      
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

  const handleEditArea = async (e) => {
    e.preventDefault();
    if (!editAreaData.name.trim()) {
      setError('Area name is required');
      return;
    }

    setEditAreaLoading(true);
    setError('');

    try {
      // Check if pin code is being changed and already exists elsewhere
      if (editAreaData.pin_code.trim()) {
        const existingArea = areas?.find(a => a.pin_code === editAreaData.pin_code.trim() && a.id !== editAreaData.id);
        if (existingArea) {
          setError(`This pin code already exists for area "${existingArea.name}"`);
          setEditAreaLoading(false);
          return;
        }
      }

      await areaService.update(editAreaData.id, {
        name: editAreaData.name.trim(),
        pin_code: editAreaData.pin_code.trim(),
      });

      setSuccess(`Area "${editAreaData.name}" updated successfully`);
      setShowEditAreaModal(false);
      setEditAreaData({ id: '', name: '', pin_code: '' });
      
      // Refetch areas
      await refetchAreas();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update area');
    } finally {
      setEditAreaLoading(false);
    }
  };

  const handleDeleteArea = async (areaId, confirmed = false) => {
    setError('');
    try {
      const response = await areaService.delete(areaId, { confirmed });
      
      // Check if confirmation is required
      if (response.data && response.data.requiresConfirmation) {
        // Show confirmation dialog
        const confirmDelete = window.confirm(response.data.message);
        
        if (confirmDelete) {
          // User confirmed, retry with confirmed flag
          const deleteResponse = await areaService.delete(areaId, { confirmed: true });
          setSuccess(deleteResponse.data.message || 'Area deleted successfully');
          
          // If the deleted area was selected, clear the selection
          if (selectedArea === areaId) {
            setSelectedArea('');
          }
          
          // Refetch areas
          await refetchAreas();
          
          setTimeout(() => setSuccess(''), 3000);
        }
        return;
      }

      setSuccess(response.data.message || 'Area deleted successfully');
      
      // If the deleted area was selected, clear the selection
      if (selectedArea === areaId) {
        setSelectedArea('');
      }
      
      // Refetch areas
      await refetchAreas();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete area');
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

  const handleEditAuto = (auto) => {
    setSelectedAutoForEdit(auto);
    setAutoEditData({
      auto_no: auto.auto_no,
      owner_name: auto.owner_name,
      driver_phone: auto.driver_phone || '',
      notes: auto.notes || ''
    });
    setShowAutoEditModal(true);
    setAutoEditError('');
  };

  const handleUpdateAuto = async (e) => {
    e.preventDefault();
    if (!autoEditData.auto_no || !autoEditData.owner_name || !autoEditData.driver_phone) {
      setAutoEditError('Auto No, Owner Name, and Driver Phone are required');
      return;
    }

    if (!/^\d{10}$/.test(autoEditData.driver_phone)) {
      setAutoEditError('Driver phone must be 10 digits');
      return;
    }

    setAutoEditLoading(true);
    setAutoEditError('');
    try {
      await autoService.update(selectedAutoForEdit.id, {
        auto_no: autoEditData.auto_no,
        owner_name: autoEditData.owner_name,
        driver_phone: autoEditData.driver_phone,
        notes: autoEditData.notes
      });
      setSuccess('Auto updated successfully');
      setShowAutoEditModal(false);
      setSelectedAutoForEdit(null);
      await refetchAutos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setAutoEditError(err.response?.data?.error || 'Failed to update auto');
    } finally {
      setAutoEditLoading(false);
    }
  };

  const handleDeleteAuto = async (auto) => {
    if (!window.confirm(`Are you sure you want to delete auto ${auto.auto_no}? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      await autoService.delete(auto.id);
      setSuccess('Auto deleted successfully');
      await refetchAutos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete auto');
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
            <Button onClick={() => navigate('/autos/create')}>+ Add Auto</Button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => {}}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            📋 Auto Management
          </button>
          <button
            onClick={() => navigate('/auto-images')}
            className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
          >
            📸 Image Management
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3">
          <Button onClick={() => setShowAssignWizardModal(true)}>⚡ Assign Autos</Button>
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
              placeholder="Search by auto number, owner name, company, area name, or area pin code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            
            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none cursor-pointer"
              style={{ height: '40px' }}
            >
              <option value="">All Status</option>
              <option value="IDLE">Idle</option>
              <option value="PREBOOKED">Pre-booked</option>
              <option value="ACTIVE">Active</option>
            </select>

            {/* Available Areas Dropdown */}
            <div className="relative" ref={areasDropdownRef}>
              <button
                onClick={() => setShowAvailableAreas(!showAvailableAreas)}
                className="w-full text-left px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                style={{ height: '40px', display: 'flex', alignItems: 'center' }}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm">{selectedArea ? areas?.find(a => a.id === selectedArea)?.name : '📍 All Areas'}</span>
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
                    <div>All Areas</div>
                    <div className="text-xs text-gray-500">
                      {getTotalAutoCount()} auto{getTotalAutoCount() !== 1 ? 's' : ''}
                    </div>
                  </button>
                  {areas?.map((area) => (
                    <div
                      key={area.id}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition border-b last:border-b-0 flex items-center justify-between group ${
                        selectedArea === area.id ? 'bg-blue-100' : ''
                      }`}
                    >
                      <button
                        onClick={() => {
                          setSelectedArea(area.id);
                          setShowAvailableAreas(false);
                        }}
                        className="flex-1 text-left"
                      >
                        <div>{area.name}</div>
                        <div className="text-xs text-gray-500">
                          {area.pin_code && `${area.pin_code} • `}
                          {getAutoCountByArea(area.id)} auto{getAutoCountByArea(area.id) !== 1 ? 's' : ''}
                        </div>
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAreaMenu(showAreaMenu === area.id ? null : area.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition"
                          title="Edit or delete area"
                        >
                          ⋯
                        </button>
                        {showAreaMenu === area.id && (
                          <div className="absolute right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 min-w-32">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditAreaData({ id: area.id, name: area.name, pin_code: area.pin_code });
                                setShowEditAreaModal(true);
                                setShowAreaMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition border-b"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete area "${area.name}"? This action cannot be undone.`)) {
                                  handleDeleteArea(area.id);
                                }
                                setShowAreaMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-3">
            <button
              onClick={() => setShowAddAreaModal(true)}
              className="py-1 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-xs"
            >
              + Add Area
            </button>
          </div>

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

          {/* Clear Filters Button */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setSearch('');
                setSelectedArea('');
                setSelectedStatus('');
                sessionStorage.removeItem('autosPage_search');
                sessionStorage.removeItem('autosPage_selectedArea');
                sessionStorage.removeItem('autosPage_selectedStatus');
                sessionStorage.removeItem('autosPage_debouncedSearch');
              }}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition"
            >
              ✕ Clear All Filters
            </button>
          </div>
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
                  <tr key={auto.id} className="border-t hover:bg-gray-50 cursor-pointer" onDoubleClick={() => navigate(`/autos/${auto.id}`)}>
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        disabled={auto.is_blocked}
                        checked={selectedAutos.has(auto.id)}
                        onChange={() => handleSelectAuto(auto.id)}
                        title={auto.is_blocked ? 'This auto is blocked for assignments' : ''}
                      />
                    </td>
                    <td className="px-4 py-2 font-medium">{auto.auto_no}</td>
                    <td className="px-4 py-2">{auto.owner_name}</td>
                    <td className="px-4 py-2">{auto.area_name}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusBadgeColor(auto.display_status || auto.status)}>{auto.display_status || auto.status}</Badge>
                        {auto.is_blocked && (
                          <Badge className="bg-red-100 text-red-800">Blocked</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">{auto.current_company || '-'}</td>
                    <td className="px-4 py-2">
                      {auto.days_remaining !== null ? formatDaysRemaining(auto.days_remaining) : '-'}
                    </td>
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <AutoActionMenu
                        auto={auto}
                        onEdit={handleEditAuto}
                        onDelete={handleDeleteAuto}
                        isLoading={autoEditLoading}
                      />
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
          setWizardData({ company_id: '', autos_required: '', area_id: '', days: '', start_date: '', cost_per_day: '', selectedAutoIds: new Set() });
          setAvailableAutosInDateRange([]);
          setWizardSearchAutos('');
          setError('');
        }}
        title={`Assign Autos - Step ${wizardStep}/5`}
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
              How many autos do you need? *
            </label>
            <Input
              type="number"
              value={wizardData.autos_required}
              onChange={(e) => {
                setWizardData({ ...wizardData, autos_required: e.target.value });
                setError('');
              }}
              min="1"
              placeholder="e.g., 5 autos"
              className="mb-4"
            />
            {wizardData.autos_required && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>You want to assign:</strong> {wizardData.autos_required} auto{parseInt(wizardData.autos_required) !== 1 ? 's' : ''}
                </p>
              </div>
            )}
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
              min={new Date().toISOString().split('T')[0]}
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

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost Per Day (₹) *
            </label>
            <Input
              type="number"
              value={wizardData.cost_per_day}
              onChange={(e) => {
                setWizardData({ ...wizardData, cost_per_day: e.target.value });
                setError('');
              }}
              min="0"
              step="0.01"
              placeholder="e.g., 100.00"
              className="mb-4"
              required
            />

            {wizardData.start_date && wizardData.days && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>End Date:</strong> {formatDate(calculateEndDate(wizardData.start_date, wizardData.days))}
                </p>
              </div>
            )}

            {wizardData.cost_per_day && !isNaN(parseFloat(wizardData.cost_per_day)) && parseFloat(wizardData.cost_per_day) > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Cost per Day:</strong> <span className="font-semibold">₹{parseFloat(wizardData.cost_per_day).toLocaleString('en-IN')}</span>
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Cost for {wizardData.days} days per auto:</strong> <span className="font-semibold">₹{(parseFloat(wizardData.cost_per_day) * parseInt(wizardData.days || 0)).toLocaleString('en-IN')}</span>
                </p>
                {wizardData.autos_required && (
                  <p className="text-sm text-blue-800 mt-2 font-bold">
                    <strong>Total Cost ({wizardData.autos_required} autos × {wizardData.days} days):</strong> <span className="text-lg text-blue-900">₹{(parseFloat(wizardData.cost_per_day) * parseInt(wizardData.days || 0) * parseInt(wizardData.autos_required || 0)).toLocaleString('en-IN')}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {wizardStep === 4 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Area *
            </label>
            <div className="space-y-2 mb-4">
              {areas?.map((area) => {
                let availableCount = 0;
                // Only calculate dynamic counts if we have dates
                if (wizardData.start_date && wizardData.days) {
                  const endDate = calculateEndDate(wizardData.start_date, wizardData.days);
                  availableCount = getAvailableIdleAutoCountByArea(area.id, wizardData.start_date, endDate);
                } else {
                  availableCount = getIdleAutoCountByArea(area.id);
                }
                  
                return (
                  <button
                    key={area.id}
                    onClick={() => {
                      // When area is selected, populate available autos for step 5
                      const newStartDate = new Date(wizardData.start_date);
                      newStartDate.setHours(0, 0, 0, 0);
                      
                      const newEndDate = calculateEndDate(wizardData.start_date, wizardData.days);
                      newEndDate.setHours(0, 0, 0, 0);
                      
                      // Get available autos for the selected area and date range (IDLE during assignment period)
                      const available = autos?.filter(auto => 
                        auto.area_id === area.id && 
                        !auto.is_blocked &&
                        isAutoAvailableForDateRange(auto, newStartDate, newEndDate)
                      ) || [];
                      
                      // Sort by current date status priority:
                      // 1. IDLE (not active, not prebooked today)
                      // 2. ACTIVE (not idle, not prebooked today)
                      // 3. PREBOOKED (not idle, not active today)
                      const sortedByPriority = [...available].sort((a, b) => {
                        const aStatus = a.display_status || a.status;
                        const bStatus = b.display_status || b.status;
                        
                        const statusPriority = { 'IDLE': 0, 'ACTIVE': 1, 'PREBOOKED': 2 };
                        const aPriority = statusPriority[aStatus] !== undefined ? statusPriority[aStatus] : 999;
                        const bPriority = statusPriority[bStatus] !== undefined ? statusPriority[bStatus] : 999;
                        
                        return aPriority - bPriority;
                      });
                      
                      // Do NOT pre-select in Step 4, let Step 5 handle selection
                      setAvailableAutosInDateRange(sortedByPriority);
                      setWizardData({ ...wizardData, area_id: area.id, selectedAutoIds: new Set() });
                      setWizardSearchAutos('');
                      setError('');
                      setWizardStep(5);
                    }}
                    className="w-full text-left p-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                  >
                    <div className="font-medium">{area.name}</div>
                    <div className="text-sm text-gray-600">
                      {area.pin_code && `${area.pin_code} • `}
                      {availableCount} available{availableCount !== 1 ? '' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {wizardStep === 5 && (
          <div>
            {!autos || autos.length === 0 ? (
              <div className="p-6 text-center text-red-500">
                <p>Error: No autos data available. Please go back and try again.</p>
              </div>
            ) : (
              <>
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">
                <strong>📋 Assignment Summary:</strong>
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs text-yellow-900">
                <div>
                  <span className="font-semibold">Company:</span> {companies?.find(c => c.id === wizardData.company_id)?.name || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold">Area:</span> {areas?.find(a => a.id === wizardData.area_id)?.name || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold">Duration:</span> {wizardData.days} days
                </div>
                {wizardData.start_date && (
                  <div>
                    <span className="font-semibold">Date Range:</span> {wizardData.start_date} to {formatDate(calculateEndDate(wizardData.start_date, wizardData.days))}
                  </div>
                )}
                {wizardData.cost_per_day && parseFloat(wizardData.cost_per_day) > 0 && (
                  <>
                    <div>
                      <span className="font-semibold">Cost/Day:</span> ₹{parseFloat(wizardData.cost_per_day).toLocaleString('en-IN')}
                    </div>
                    <div>
                      <span className="font-semibold">Total Cost:</span> ₹{(parseFloat(wizardData.cost_per_day) * parseInt(wizardData.days || 0) * wizardData.selectedAutoIds.size).toLocaleString('en-IN')}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Select Autos to Assign:</strong> {wizardData.selectedAutoIds.size} selected / {availableAutosInDateRange.length} available (IDLE during assignment period)
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
                    // Get autos that are IDLE during the assignment period
                    const startDate = new Date(wizardData.start_date);
                    startDate.setHours(0, 0, 0, 0);
                    const endDate = calculateEndDate(wizardData.start_date, wizardData.days);
                    endDate.setHours(0, 0, 0, 0);

                    // Filter autos that are idle during the entire assignment period
                    const idleDuringAssignment = availableAutosInDateRange.filter(auto =>
                      isAutoAvailableForDateRange(auto, startDate, endDate)
                    );

                    // Sort by current status priority: IDLE > ACTIVE > PREBOOKED
                    // Create a new array to avoid mutating original
                    const sortedByPriority = [...idleDuringAssignment].sort((a, b) => {
                      const aStatus = a.display_status || a.status;
                      const bStatus = b.display_status || b.status;
                      
                      // Define priority: lower number = higher priority
                      const statusPriority = { 'IDLE': 0, 'ACTIVE': 1, 'PREBOOKED': 2 };
                      const aPriority = statusPriority[aStatus] !== undefined ? statusPriority[aStatus] : 999;
                      const bPriority = statusPriority[bStatus] !== undefined ? statusPriority[bStatus] : 999;
                      
                      return aPriority - bPriority;
                    });

                    // Filter by search
                    const filteredAutos = sortedByPriority.filter(auto =>
                      auto.auto_no.toLowerCase().includes(wizardSearchAutos.toLowerCase()) ||
                      auto.owner_name.toLowerCase().includes(wizardSearchAutos.toLowerCase())
                    );

                    // Auto-select based on quantity needed (only on first load)
                    if (wizardData.selectedAutoIds.size === 0 && filteredAutos.length > 0) {
                      const autoCountNeeded = parseInt(wizardData.autos_required) || 0;
                      const toSelect = new Set();
                      for (let i = 0; i < Math.min(autoCountNeeded, filteredAutos.length); i++) {
                        toSelect.add(filteredAutos[i].id);
                      }
                      if (toSelect.size > 0) {
                        setWizardData(prev => ({
                          ...prev,
                          selectedAutoIds: toSelect
                        }));
                      }
                    }

                    return filteredAutos.length > 0 ? (
                      filteredAutos.map((auto) => (
                        <div
                          key={auto.id}
                          onClick={() => toggleAutoSelection(auto.id)}
                          className={`p-3 cursor-pointer hover:bg-gray-50 transition border-b ${
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
                              <p className="text-xs text-gray-500 mt-1">
                                Current Status: {auto.display_status || auto.status}
                              </p>
                            </div>
                            <Badge className={getStatusBadgeColor(auto.display_status || auto.status)}>
                              {auto.display_status || auto.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        No autos match your search
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No autos available for the selected date range in this area
                </div>
              )}
            </div>
              </>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-6">
          {wizardStep > 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (wizardStep === 5) {
                  setWizardStep(4);
                } else if (wizardStep === 4) {
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
          {wizardStep < 5 && (
            <Button
              type="button"
              onClick={handleWizardNext}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Next'}
            </Button>
          )}
          {wizardStep === 5 && (
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
              setWizardData({ company_id: '', autos_required: '', area_id: '', days: '', start_date: '', cost_per_day: '', selectedAutoIds: new Set() });
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
            label="Start Date *"
            required
            value={assignData.start_date}
            onChange={(e) => setAssignData({ ...assignData, start_date: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="mb-4"
          />

          <Input
            type="number"
            label="Cost Per Day (₹) *"
            required
            value={assignData.cost_per_day}
            onChange={(e) => setAssignData({ ...assignData, cost_per_day: e.target.value })}
            min="0.01"
            step="0.01"
            placeholder="e.g., 100.00"
          />

          {assignData.cost_per_day && !isNaN(parseFloat(assignData.cost_per_day)) && parseFloat(assignData.cost_per_day) > 0 && assignData.days && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
              <p className="text-sm text-blue-800">
                <strong>Cost per Day:</strong> <span className="font-semibold">₹{parseFloat(assignData.cost_per_day).toLocaleString('en-IN')}</span>
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>Cost for {assignData.days} days:</strong> <span className="font-semibold">₹{(parseFloat(assignData.cost_per_day) * parseInt(assignData.days || 0)).toLocaleString('en-IN')}</span>
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>Total (for {selectedAutos.size} autos):</strong> <span className="font-semibold text-green-900">₹{(parseFloat(assignData.cost_per_day) * parseInt(assignData.days || 0) * selectedAutos.size).toLocaleString('en-IN')}</span>
              </p>
            </div>
          )}

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
            label="Pin Code *"
            required
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

      {/* Edit Area Modal */}
      <Modal
        isOpen={showEditAreaModal}
        onClose={() => {
          setShowEditAreaModal(false);
          setEditAreaData({ id: '', name: '', pin_code: '' });
          setError('');
        }}
        title="Edit Area"
      >
        <form onSubmit={handleEditArea}>
          {error && <ErrorAlert message={error} />}
          
          <Input
            type="text"
            label="Area Name *"
            required
            value={editAreaData.name}
            onChange={(e) => setEditAreaData({ ...editAreaData, name: e.target.value })}
            placeholder="e.g., Malleswaram"
            className="mb-4"
          />

          <Input
            type="text"
            label="Pin Code *"
            required
            value={editAreaData.pin_code}
            onChange={(e) => setEditAreaData({ ...editAreaData, pin_code: e.target.value })}
            placeholder="e.g., 560003"
          />

          <div className="flex gap-2 mt-4">
            <Button type="submit" disabled={editAreaLoading} className="flex-1">
              {editAreaLoading ? 'Updating...' : 'Update Area'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowEditAreaModal(false);
                setEditAreaData({ id: '', name: '', pin_code: '' });
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

      {/* Edit Auto Modal */}
      <Modal
        isOpen={showAutoEditModal}
        onClose={() => {
          setShowAutoEditModal(false);
          setSelectedAutoForEdit(null);
          setAutoEditError('');
        }}
        title={`Edit Auto - ${selectedAutoForEdit?.auto_no || ''}`}
      >
        {selectedAutoForEdit && (
          <form onSubmit={handleUpdateAuto} className="space-y-4">
            {autoEditError && <ErrorAlert message={autoEditError} />}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auto No *
              </label>
              <input
                type="text"
                value={autoEditData.auto_no}
                onChange={(e) => setAutoEditData({ ...autoEditData, auto_no: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter auto number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name *
              </label>
              <input
                type="text"
                value={autoEditData.owner_name}
                onChange={(e) => setAutoEditData({ ...autoEditData, owner_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter owner name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Driver Phone Number *
              </label>
              <input
                type="tel"
                value={autoEditData.driver_phone}
                onChange={(e) => setAutoEditData({ ...autoEditData, driver_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter 10-digit phone number"
                maxLength="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={autoEditData.notes}
                onChange={(e) => setAutoEditData({ ...autoEditData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter notes (optional)"
                rows="3"
              />
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                type="submit"
                disabled={autoEditLoading}
                className="flex-1"
              >
                {autoEditLoading ? 'Updating...' : 'Update Auto'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowAutoEditModal(false);
                  setSelectedAutoForEdit(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};

export default AutosPage;
