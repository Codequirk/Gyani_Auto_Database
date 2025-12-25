# Company Portal - Dynamic Auto Availability Feature

## Overview
This feature adds dynamic display of available autos and area pin codes in the company portal when company owners submit auto requests. The system now shows:
1. **Pin Code** of the selected area
2. **Number of Available Autos** for the selected date range dynamically

## Changes Made

### 1. Backend Changes

#### A. New API Endpoint: `GET /autos/available/count`
**File:** [backend/src/controllers/autoController.js](backend/src/controllers/autoController.js)

Added new controller function `getAvailableAutosCount()` that:
- Accepts query parameters: `area_id`, `start_date`, `end_date` (all required)
- Counts autos in a specific area that have NO conflicting assignments during the requested date range
- Ignores completed assignments (only checks ACTIVE and PREBOOKED assignments)
- Returns: `{ available_count, total_count, area_id }`

**Logic:**
```javascript
- Fetch all autos in the specified area
- For each auto, check if it has any overlapping ACTIVE/PREBOOKED assignments
- Assignment overlaps if: NOT (checkEndDate < assignmentStart OR checkStartDate > assignmentEnd)
- Count autos without overlapping assignments
- Return the count
```

#### B. Route Registration
**File:** [backend/src/routes/autoRoutes.js](backend/src/routes/autoRoutes.js)

Added route (placed before `/:id` route to prevent matching):
```javascript
router.get('/available/count', autoController.getAvailableAutosCount);
```

### 2. Frontend Changes

#### A. API Service Update
**File:** [frontend/src/services/api.js](frontend/src/services/api.js)

Added new service method to `autoService`:
```javascript
getAvailableCount: (areaId, startDate, endDate) => api.get('/autos/available/count', { 
  params: { area_id: areaId, start_date: startDate, end_date: endDate } 
})
```

#### B. Company Portal Dashboard Page
**File:** [frontend/src/pages/CompanyDashboardPage.jsx](frontend/src/pages/CompanyDashboardPage.jsx)

**New State Variables:**
- `availableAutosCount`: Stores the count of available autos
- `fetchingAvailableCount`: Loading state for the API call
- `selectedAreaPinCode`: Stores the pin code of the selected area

**New Functions:**
- `fetchAvailableAutosCount()`: Calls the backend endpoint to get available autos count
  - Calculates end date based on start date + days required
  - Only fetches if all required fields are present

**New Effects:**
1. **Auto-fetch on changes**: Watches `ticketData.area_id`, `ticketData.start_date`, and `ticketData.days_required`
   - Automatically fetches available count when any of these change
   - Debounced within the effect hook

2. **Pin code update**: Watches `ticketData.area_id` and `areas` array
   - Updates `selectedAreaPinCode` when area selection changes
   - Displays 'N/A' if pin code not available

**UI Display:**
Added a blue info box below the area selector showing:
- **Pin Code**: Area's pin code (or 'N/A' if not set)
- **Available Autos**: Count of autos available for the selected dates (shows "Loading..." while fetching)
- **Summary Text**: Shows the date range and number of days (only when all data is available)

Example display:
```
Pin Code: 560034
Available Autos: 5
5 autos available from 15-01-2025 for 7 days
```

## Database Schema References

### Area Schema (Already Exists)
The `pin_code` field already exists in the areas collection:
```javascript
{
  _id: String,
  id: String (unique),
  name: String (unique),
  pin_code: String,
  created_at: Date,
  updated_at: Date
}
```

### Assignment Overlapping Logic
The endpoint checks for overlapping assignments by comparing date ranges:
- **No overlap if**: endDate < assignmentStart OR startDate > assignmentEnd
- **Overlap if**: NOT (above condition)

## How It Works

### User Flow:
1. Company owner clicks "Raise New Request"
2. Fills in "Autos Required", "Days Required", and "Start Date"
3. Selects a "Preferred Area" from dropdown
4. **System automatically displays:**
   - The selected area's pin code
   - Number of available autos for the specified date range
5. User can see availability before submitting the request

### Date Range Calculation:
- Start Date: User selected date
- End Date: Start Date + Days Required - 1 (inclusive)
- Example: Start 15-01-2025, Days 7 → End 21-01-2025 (7 days total)

## API Response Format

### Request:
```
GET /autos/available/count?area_id=abc123&start_date=2025-01-15&end_date=2025-01-21
```

### Response:
```json
{
  "available_count": 5,
  "total_count": 12,
  "area_id": "abc123"
}
```

## Testing Checklist

- [ ] Backend endpoint accepts correct parameters
- [ ] Backend correctly counts available autos (excluding overlapping assignments)
- [ ] Frontend fetches pin code from selected area
- [ ] Frontend fetches available autos count on form field changes
- [ ] Display updates dynamically as user changes dates/area
- [ ] Loading state shows while fetching data
- [ ] Pin code displays as "N/A" if not set for an area
- [ ] Available count is 0 if all autos are booked
- [ ] Summary text is only shown when all required fields are filled

## Files Modified

1. `backend/src/controllers/autoController.js` - Added `getAvailableAutosCount()` function
2. `backend/src/routes/autoRoutes.js` - Added route for new endpoint
3. `frontend/src/services/api.js` - Added `getAvailableCount()` method
4. `frontend/src/pages/CompanyDashboardPage.jsx` - Added state, effects, and UI display

## Notes

- The feature is optional (area selection is optional), so display only shows when area is selected
- The endpoint is efficient and queries database for each auto's assignments
- Pin codes should be properly maintained in the areas collection for this feature to work fully
- The feature uses existing area and auto models without any schema modifications
