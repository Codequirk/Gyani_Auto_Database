import React, { useState, useEffect } from 'react';
import {
  eachDayOfInterval,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  addMonths,
  subMonths,
  isSameDay,
  isWithinInterval,
} from 'date-fns';
import { Card, Button } from './UI';

/**
 * Company Portal Calendar Component
 * Shows monthly calendar with highlighted booked dates for a specific area
 */
const CompanyPortalCalendar = ({ assignments = [], areas = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [loadedAreas, setLoadedAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(true);

  // Fetch areas if not provided
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        // Use provided areas first, otherwise fetch from API
        if (areas && areas.length > 0) {
          setLoadedAreas(areas);
        } else {
          const api = require('../services/api').default;
          const response = await api.get('/areas');
          setLoadedAreas(response.data || []);
        }
      } catch (err) {
        console.error('Failed to load areas:', err);
        setLoadedAreas([]);
      } finally {
        setAreasLoading(false);
      }
    };
    fetchAreas();
  }, [areas]);

  // Filter assignments by selected area (or show all if no area selected)
  const areaAssignments = selectedAreaId
    ? assignments.filter(a => a.area_id === selectedAreaId)
    : assignments; // Show all assignments if no area is selected

  // Get selected area details
  const selectedArea = loadedAreas.find(a => a.id === selectedAreaId);
  const areaName = selectedArea?.name || (selectedAreaId ? 'Unknown Area' : 'All Areas');
  const pinCode = selectedArea?.pin_code || '';

  // Calculate total booked days in current month
  const getBookedDaysInMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const bookedDates = new Set();

    areaAssignments.forEach(assignment => {
      const assignStart = new Date(assignment.start_date);
      const assignEnd = new Date(assignment.end_date);

      const daysInRange = eachDayOfInterval({
        start: assignStart,
        end: assignEnd,
      });

      daysInRange.forEach(day => {
        if (isWithinInterval(day, { start: monthStart, end: monthEnd })) {
          bookedDates.add(format(day, 'yyyy-MM-dd'));
        }
      });
    });

    return { totalDays: bookedDates.size, bookedDates };
  };

  // Get status of a specific date
  const getDateStatus = (date) => {
    if (!isSameMonth(date, currentMonth)) {
      return null;
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    const { bookedDates } = getBookedDaysInMonth();

    if (bookedDates.has(dateStr)) {
      // Find which autos are booked on this date
      const autosOnDate = areaAssignments
        .filter(a => {
          // Parse dates and set to midnight for consistent comparison
          const assignStart = new Date(a.start_date);
          assignStart.setHours(0, 0, 0, 0);
          
          const assignEnd = new Date(a.end_date);
          assignEnd.setHours(23, 59, 59, 999);
          
          // Create a date at midnight for comparison
          const checkDate = new Date(date);
          checkDate.setHours(0, 0, 0, 0);
          
          return isWithinInterval(checkDate, { start: assignStart, end: assignEnd });
        })
        .map(a => ({ auto_no: a.auto_no, owner_name: a.owner_name }));

      return { type: 'booked', autos: autosOnDate };
    }

    return { type: 'available' };
  };

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const { totalDays: bookedDaysCount } = getBookedDaysInMonth();

  return (
    <Card>
      {/* Header with Area Selection */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Area
            </label>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={areasLoading}
            >
              <option value="">-- All Areas --</option>
              {areasLoading ? (
                <option disabled>Loading areas...</option>
              ) : loadedAreas && loadedAreas.length > 0 ? (
                loadedAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name} {area.pin_code ? `(${area.pin_code})` : ''}
                  </option>
                ))
              ) : (
                <option disabled>No areas available</option>
              )}
            </select>
          </div>

          {/* Month Navigation */}
          <div className="flex items-end justify-center gap-2">
            <Button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              variant="secondary"
              className="px-3 py-2 text-sm"
            >
              ← Prev
            </Button>
            <div className="text-center min-w-[150px]">
              <p className="font-semibold text-gray-900">
                {format(currentMonth, 'MMMM yyyy')}
              </p>
            </div>
            <Button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              variant="secondary"
              className="px-3 py-2 text-sm"
            >
              Next →
            </Button>
          </div>

          {/* Booked Days Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-gray-600">Booked Days</p>
            <p className="text-2xl font-bold text-blue-600">{bookedDaysCount}</p>
            <p className="text-xs text-gray-500">in {areaName}</p>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-gray-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-gray-700 py-3 text-sm">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {calendarDays.map((date, idx) => {
            const status = getDateStatus(date);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isToday = isSameDay(date, new Date());
            const isBooked = status?.type === 'booked';

            return (
              <div
                key={idx}
                className={`min-h-24 p-2 flex flex-col transition-colors duration-200 ${
                  isBooked
                    ? 'bg-red-200 border-2 border-red-500'
                    : isCurrentMonth
                    ? 'bg-white border border-gray-200'
                    : 'bg-gray-50 border border-gray-200'
                } ${isToday ? 'border-2 border-green-500' : ''}`}
              >
                <div
                  className={`font-semibold text-sm mb-1 px-2 py-1 rounded text-center ${
                    isToday
                      ? 'text-white bg-green-500'
                      : isBooked
                      ? 'text-red-900 bg-red-100'
                      : isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {format(date, 'd')}
                </div>

                {/* Show booked autos count */}
                {isBooked && status.autos && status.autos.length > 0 && (
                  <div className="flex flex-col items-center justify-center flex-1">
                    <div className="bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-md">
                      {status.autos.length}
                    </div>
                    <p className="text-xs text-red-900 mt-2 font-semibold">
                      {status.autos.length === 1 ? 'auto booked' : 'autos booked'}
                    </p>
                  </div>
                )}

                {/* Grayed out indicator for non-current month */}
                {!isCurrentMonth && (
                  <div className="text-xs text-gray-400 font-medium text-center">Other month</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm font-semibold text-gray-700 mb-3">Legend:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-200 border-2 border-red-500 rounded"></div>
            <span className="text-sm text-gray-700">Booked Days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white border border-gray-300 rounded"></div>
            <span className="text-sm text-gray-700">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white border-2 border-green-500 rounded"></div>
            <span className="text-sm text-gray-700">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
            <span className="text-sm text-gray-700">Count Badge</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CompanyPortalCalendar;
