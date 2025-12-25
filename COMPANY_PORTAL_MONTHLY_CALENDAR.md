# Company Portal - Monthly Calendar View

## Implementation Complete

A new monthly calendar view has been added to the company portal that shows booked dates for each area with visual highlighting.

## Features

### 1. **Area Selection Dropdown**
- Shows all areas with pin codes
- Example: "Koramangala (560034)"
- Defaults to first area when calendar opens

### 2. **Month Navigation**
- Previous/Next buttons to navigate between months
- Displays current month and year
- Format: "January 2025"

### 3. **Booked Days Counter**
- Shows total booked days in the selected area for the current month
- Displayed in blue info box
- Updates when month or area changes

### 4. **Calendar Grid Display**
- 7-column grid (Sun-Sat)
- Each day cell shows:
  - Date number
  - Booked autos (in red boxes with auto number)
  - "Available" indicator for free days

### 5. **Color Coding**
- **Red Background** - Days with bookings
- **White Background** - Available days
- **Green Border** - Today's date (if visible)
- **Gray Background** - Days from other months

### 6. **Booked Auto Details**
- Shows auto numbers for each booked date
- Truncated with tooltip on hover
- Multiple autos can be shown per day if overlapping

### 7. **Legend**
- Booked (Red)
- Available (White)
- Today (Green Border)

## Visual Layout

```
┌─ Select Area: Koramangala (560034) ▼ ├─ ← January 2025 → ├─ Booked Days: 15 ┐
├──────────────────────────────────────────────────────────────────────────────┤
│ Sun   Mon   Tue   Wed   Thu   Fri   Sat                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│  29   30    31    1     2     3     4                                         │
│ [GRAY]              [  ]  [  ]  [  ]  [  ]                                    │
│                                                                                │
│  5     6     7    [8]   9    [10]  11                                        │
│  [  ]  [KA01] [ ] [  ] [ ] [KA02] [ ]     (Today)                           │
│ KA01           KA02                                                          │
│                                                                                │
│ 12    13    14    15    16    17    18                                        │
│ [ ]   [KA01][KA03][ ]  [ ]  [ ]   [ ]                                        │
│      KA01  KA03                                                              │
│ KA05                                                                          │
│                                                                                │
│ 19    20    21    22    23    24    25                                        │
│ [  ]  [  ]  [  ]  [  ]  [  ]  [  ]  [  ]                                    │
│                                                                                │
│ 26    27    28    29    30    31                                              │
│ [  ]  [  ]  [  ]  [  ]  [  ]  [  ]                                          │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Calendar Example

### January 2025 - Koramangala Area
- **Booked Days: 15**
- Day 8: KA01 booked (1 day)
- Day 10: KA02 booked (1 day)
- Days 13-15: KA01, KA03, KA05 booked (overlapping bookings)
- Red highlighting shows which dates are unavailable
- Auto numbers visible in each booked cell

## How It Works

### Data Flow
1. User clicks "📅 View Calendar" button
2. Calendar modal opens with month view
3. Backend provides prebooked assignments with:
   - area_id
   - start_date
   - end_date
   - auto_no
   - owner_name

4. Component calculates:
   - Which dates in month are booked
   - Which autos are booked on each date
   - Total booked days count

5. Displays calendar with:
   - Booked dates highlighted in red
   - Auto numbers shown in each cell
   - Total count in header

### Area Filtering
- Dropdown filters assignments by area_id
- Only shows bookings for selected area
- Booked days counter updates based on selection

## Technical Implementation

### Files Created
- `frontend/src/components/CompanyPortalCalendar.jsx` - New calendar component

### Files Modified
- `frontend/src/pages/CompanyDashboardPage.jsx` - Integrated calendar component

### Dependencies Used
- `date-fns` - Date manipulation and formatting
  - `eachDayOfInterval` - Get all days in a range
  - `format` - Format dates
  - `startOfMonth/endOfMonth` - Month boundaries
  - `startOfWeek/endOfWeek` - Week boundaries
  - `isSameMonth/isSameDay` - Date comparisons
  - `isWithinInterval` - Range checking
  - `addMonths/subMonths` - Month navigation

## Key Functions

### `getBookedDaysInMonth()`
- Calculates total booked days in current month
- Returns Set of booked dates in YYYY-MM-DD format
- Filters assignments to only those within month

### `getDateStatus(date)`
- Returns status for a specific date:
  - `{ type: 'booked', autos: [...] }` - Date is booked
  - `{ type: 'available' }` - Date is free
  - `null` - Date is from different month

## User Experience Flow

1. **View Upcoming Assignments Table**
   - Shows list of all prebooked assignments

2. **Click "📅 View Calendar" Button**
   - Calendar modal opens with month view
   - Shows current month by default

3. **Select Area from Dropdown**
   - Changes calendar to show bookings only for that area
   - Updates booked days counter

4. **Navigate Months**
   - Use Previous/Next buttons
   - View bookings for different months
   - Booked days count updates

5. **View Booked Dates**
   - Red cells show which dates are booked
   - Auto numbers visible in each cell
   - Can see at a glance which autos are busy

6. **Close Calendar**
   - Click X button or Close button
   - Returns to assignments list

## Example Data

```json
{
  "prebooked_assignments": [
    {
      "id": "uuid",
      "auto_id": "auto-uuid",
      "auto_no": "KA01AA1234",
      "owner_name": "Ramesh Kumar",
      "area_id": "area-uuid",
      "area_name": "Koramangala",
      "start_date": "2025-01-10",
      "end_date": "2025-01-16",
      "days": 7,
      "status": "PREBOOKED"
    }
  ]
}
```

## Responsive Design

- **Desktop**: Full calendar with auto numbers clearly visible
- **Tablet**: Calendar adapts to screen size, auto names truncated with hover tooltip
- **Mobile**: Scrollable calendar, touch-friendly dropdown

## Future Enhancements (Optional)

- Color code by company instead of just showing booked/available
- Show company name on hover
- Export calendar as PDF
- Week view option
- Drag-and-drop booking adjustment (if permissions allow)
