import React, { useState } from 'react';
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
 * Calendar component showing blocked dates (assignments) and idle gaps
 * 
 * Features:
 * - Blocked dates: Show dates when auto is assigned (with strikethrough)
 * - Idle dates: Show gaps between assignments (with different styling)
 * - Navigation: Move between months
 * - Legend: Shows meaning of different colors
 */
const AssignmentCalendar = ({ assignments = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Build date ranges from assignments
  const dateRanges = assignments.map(a => ({
    start: new Date(a.start_date),
    end: new Date(a.end_date),
    company: a.company_name,
    status: a.status,
    type: 'assigned',
  }));

  // Find idle gaps between assignments
  const idleGaps = [];
  if (assignments.length > 1) {
    const sortedAssignments = [...assignments].sort(
      (a, b) => new Date(a.start_date) - new Date(b.start_date)
    );

    for (let i = 0; i < sortedAssignments.length - 1; i++) {
      const currentEnd = new Date(sortedAssignments[i].end_date);
      const nextStart = new Date(sortedAssignments[i + 1].start_date);

      // Check if there's a gap (more than 1 day between)
      currentEnd.setDate(currentEnd.getDate() + 1);
      if (currentEnd < nextStart) {
        idleGaps.push({
          start: new Date(currentEnd),
          end: new Date(nextStart),
          end_date: new Date(nextStart),
          type: 'idle',
        });
        idleGaps[idleGaps.length - 1].end.setDate(idleGaps[idleGaps.length - 1].end.getDate() - 1);
      }
    }
  }

  // Combine all date ranges
  const allRanges = [...dateRanges, ...idleGaps];

  /**
   * Check if a date falls within any assignment or idle period
   */
  const getDateStatus = (date) => {
    // Normalize the date to start of day for proper comparison
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    for (const range of allRanges) {
      const rangeStart = new Date(range.start);
      rangeStart.setHours(0, 0, 0, 0);
      
      const rangeEnd = new Date(range.end);
      rangeEnd.setHours(0, 0, 0, 0);

      if (checkDate >= rangeStart && checkDate <= rangeEnd) {
        return range;
      }
    }
    return null;
  };

  /**
   * Get CSS classes for a date cell
   */
  const getDateClasses = (date, status) => {
    let baseClasses =
      'p-2 h-auto flex flex-col items-center justify-start rounded text-sm font-medium transition-colors';

    if (!status) {
      return `${baseClasses} text-gray-700 hover:bg-gray-100`;
    }

    if (status.type === 'assigned') {
      return `${baseClasses} bg-red-100 text-red-800 font-semibold hover:bg-red-200`;
    }

    if (status.type === 'idle') {
      return `${baseClasses} bg-yellow-50 text-yellow-700 border-2 border-yellow-300 hover:bg-yellow-100`;
    }

    return baseClasses;
  };

  /**
   * Get tooltip text for a date
   */
  const getTooltip = (date, status) => {
    if (!status) return null;

    if (status.type === 'assigned') {
      return `${status.company} (${status.status})`;
    }

    if (status.type === 'idle') {
      return 'Idle - Available for assignment';
    }

    return null;
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Assignment Calendar</h2>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="secondary"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="px-3 py-1 text-sm"
        >
          ← Prev
        </Button>
        <h3 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
        <Button
          variant="secondary"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="px-3 py-1 text-sm"
        >
          Next →
        </Button>
      </div>

      {/* Legend */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="font-semibold mb-3 text-sm">Legend:</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-100 text-red-800 line-through flex items-center justify-center text-xs font-bold">
              20
            </div>
            <span>Blocked (Assigned) - Hover to see company name</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-50 border-2 border-yellow-300 flex items-center justify-center text-xs">
              20
            </div>
            <span>Idle (Available)</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-2 h-10 flex items-center justify-center font-semibold text-gray-700 text-sm"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const status = getDateStatus(date);
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const tooltip = getTooltip(date, status);

              return (
                <div
                  key={date.toString()}
                  title={tooltip || ''}
                  className={`${
                    isCurrentMonth ? getDateClasses(date, status) : 'p-2 h-auto flex flex-col items-center justify-start text-gray-400'
                  }`}
                >
                  {/* Date number with strikethrough only for assigned dates */}
                  <div className={status?.type === 'assigned' ? 'line-through font-semibold text-sm' : 'font-semibold text-sm'}>
                    {format(date, 'd')}
                  </div>

                  {/* Company name on blocked dates - no strikethrough */}
                  {status?.type === 'assigned' && status?.company && (
                    <div className="text-xs font-semibold text-red-900 mt-1">
                      {status.company}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {assignments.length === 0 && (
        <div className="mt-6 p-4 text-center text-gray-600 text-sm">
          No assignments to display in calendar
        </div>
      )}
    </Card>
  );
};

export default AssignmentCalendar;
