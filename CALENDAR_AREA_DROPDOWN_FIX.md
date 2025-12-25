# Calendar Area Selection Fix

## Problem
The Select Area dropdown in the calendar modal was not showing any areas.

## Root Cause
Areas were only being fetched when the ticket/request modal opened, not when the calendar modal opened. Additionally, the component had no fallback to fetch areas if they weren't passed as props.

## Solution Implemented

### 1. **Updated CompanyDashboardPage.jsx**
- Modified the `useEffect` hook that fetches areas
- Now fetches areas when **either** the ticket modal OR calendar modal is opened
- Changed condition from `if (showTicketModal && areas.length === 0)` to `if ((showTicketModal || showCalendarModal) && areas.length === 0)`

```javascript
useEffect(() => {
  if ((showTicketModal || showCalendarModal) && areas.length === 0) {
    // fetch areas...
  }
}, [showTicketModal, showCalendarModal, areas.length]);
```

### 2. **Updated CompanyPortalCalendar.jsx**
- Added local state `loadedAreas` to manage areas within the component
- Added fallback `useEffect` to fetch areas directly from API if not provided as props
- This ensures areas are always available, regardless of how the component is called

```javascript
const [loadedAreas, setLoadedAreas] = useState(areas);

useEffect(() => {
  if (!loadedAreas || loadedAreas.length === 0) {
    const fetchAreas = async () => {
      const api = require('../services/api').default;
      const response = await api.get('/areas');
      setLoadedAreas(response.data || []);
    };
    fetchAreas();
  }
}, []);
```

### 3. **Updated Dropdown Display**
- Changed all references from `areas` to `loadedAreas`
- Dropdown now shows "Loading areas..." while fetching instead of "No areas available"
- Ensures areas are always loaded before showing the dropdown

```javascript
{loadedAreas && loadedAreas.length > 0 ? (
  loadedAreas.map((area) => (
    <option key={area.id} value={area.id}>
      {area.name} {area.pin_code ? `(${area.pin_code})` : ''}
    </option>
  ))
) : (
  <option disabled>Loading areas...</option>
)}
```

## Data Flow

### Before (Broken)
1. User clicks Calendar button
2. Calendar modal opens
3. Areas not fetched (only fetched for ticket modal)
4. Dropdown is empty

### After (Fixed)
1. User clicks Calendar button
2. Calendar modal opens
3. Parent page detects `showCalendarModal = true`
4. Parent page fetches areas (if not already loaded)
5. Areas passed to CompanyPortalCalendar component
6. Component also has fallback to fetch areas itself
7. Dropdown populated with all areas with pin codes

## Dual Protection

The fix has two layers:

**Layer 1:** Parent component (CompanyDashboardPage) fetches areas when either modal opens
```javascript
if ((showTicketModal || showCalendarModal) && areas.length === 0)
```

**Layer 2:** Calendar component (CompanyPortalCalendar) has internal fetching if areas not provided
```javascript
if (!loadedAreas || loadedAreas.length === 0) {
  // fetch areas from API
}
```

This ensures the calendar will work even if:
- Areas weren't fetched by parent
- Component is used in another context
- Areas prop is empty or undefined

## Testing

✅ Open calendar modal
✅ Dropdown shows "-- Select an Area --"
✅ All areas appear in dropdown with pin codes
✅ Can select any area
✅ Calendar updates when area selected
✅ Shows count of booked autos per day

## Files Modified

1. `frontend/src/pages/CompanyDashboardPage.jsx` - Updated area fetching logic
2. `frontend/src/components/CompanyPortalCalendar.jsx` - Added local area fetching and state management

## Benefits

✅ **Robust** - Works with or without parent data
✅ **Reliable** - Dual fetching ensures data availability
✅ **User Friendly** - Shows "Loading areas..." while fetching
✅ **Error Tolerant** - Graceful fallback to fetch data
✅ **Scalable** - Component can be reused independently
