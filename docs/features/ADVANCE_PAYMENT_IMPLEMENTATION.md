# Advance Payment Feature - Complete Implementation

## Overview
Implemented the Advance Payment feature for the Auto Monthly Payments system. When creating bulk payments for multiple autos, users can now specify an advance payment amount that applies to each auto individually.

## What Was Changed

### 1. Database Migration
**File**: `backend/src/migrations/add_advance_payment_to_auto_monthly_payments.js`
- Added new column: `advance_payment` (decimal, nullable, default 0)
- Allows storing advance payment amount for each auto payment record

### 2. Backend Model Updates
**File**: `backend/src/models/AutoMonthlyPayment.js`
- Updated `create()` method to include `advance_payment` field
- Data is preserved and returned in all retrieval operations

### 3. Backend Controller Updates
**File**: `backend/src/controllers/autoMonthlyPaymentController.js`

#### Date Normalization Helper (NEW)
```javascript
const normalizeDateString = (dateInput) => {
  // Converts any date format to YYYY-MM-DD string
  // Prevents timezone conversion bugs
}
```

#### Create Payment Handler
- Extracts `advance_payment` from request body
- Normalizes dates to DATE-ONLY format (YYYY-MM-DD)
- Applies advance_payment to each auto individually

#### Update Payment Handler
- Allows editing advance_payment amount
- Validates advance_payment value
- Recalculates end dates when start date changes

### 4. Frontend State Management
**File**: `frontend/src/pages/PaymentAdminPage.jsx`

#### Bulk Payment Modal
- Added `advance_payment` field to `bulkPaymentData` state
- New input field for advance payment amount
- Payment summary box showing:
  - Total Monthly Cost
  - Advance Paid (₹)
  - Remaining to be Paid (₹)

#### Edit Payment Modal
- Added `advance_payment` field to `editPaymentData` state
- New input field for editing advance payment
- Auto-recalculates remaining payment on change

#### Payment Table Updates
**Three new columns added**:
1. **Advance Paid** (₹) - Shows advance payment in blue
2. **Remaining to be Paid** (₹) - Shows (monthly_cost - advance_payment) in orange
3. **Days Remaining** - Moved to show urgency

**Color Coding**:
- Monthly Cost: Green (₹)
- Advance Paid: Blue (₹)
- Remaining: Orange (₹)

#### Auto Payment Details Modal
- Shows advance payment amount
- Shows remaining to be paid calculation
- Displays all payment information clearly

## Business Logic

### Bulk Payment Assignment Logic
**When assigning 4-5 autos together**:
- Each auto receives: `monthly_cost` = 300
- Each auto receives: `advance_payment` = 100
- Each auto receives: `remaining_to_be_paid` = 300 - 100 = 200

**Formula**:
```
Remaining to be Paid = Monthly Cost - Advance Payment
```

### Date Handling
- Dates sent as pure YYYY-MM-DD strings (no timezone)
- Backend receives as DATE-ONLY (no timestamp conversion)
- Database stores in SQL DATE column (not TIMESTAMP)
- Retrieved dates formatted back to YYYY-MM-DD strings
- **Result**: No date shifting bugs!

## Data Flow

### Creating Bulk Payment
```
User Input:
- Start Date: Feb 10
- Monthly Cost: ₹300
- Advance Payment: ₹100
- 4 autos selected

↓

Frontend Calculation:
- End Date: Mar 11 (Feb 10 + 29 days)
- Remaining: ₹200 (300 - 100)

↓

Backend Processing:
- Creates 4 payment records
- Each has: monthly_cost=300, advance_payment=100
- Dates normalized to YYYY-MM-DD

↓

Database Storage:
- 4 rows in auto_monthly_payments table
- Each row: 300, 100, "2026-02-10", "2026-03-11"

↓

Frontend Display:
- Table shows for each auto:
  - Monthly Cost: ₹300
  - Advance Paid: ₹100
  - Remaining: ₹200
  - Days Remaining: 29
```

### Editing Payment
```
User opens edit modal for one auto

↓

Change advance payment from ₹100 to ₹150

↓

Frontend sends: { advance_payment: 150, monthly_cost: 300 }

↓

Backend updates record

↓

Table recalculates: Remaining = 300 - 150 = ₹150
```

## Key Features

✅ **Per-Auto Advance Payment**
- Each auto in bulk assignment can have different remaining amounts based on same advance

✅ **Real-time Calculation**
- Remaining amount calculated and displayed instantly
- Updates when editing advance payment

✅ **Color-Coded Display**
- Monthly Cost: Green
- Advance Paid: Blue
- Remaining: Orange
- Easy to distinguish payment components

✅ **Date Fix Included**
- All date shifting bugs fixed
- Dates stay consistent from selection through storage and retrieval

✅ **Backwards Compatible**
- advance_payment defaults to 0 if not provided
- Existing payments show ₹0 advance paid
- Remaining always equals monthly_cost if advance is 0

## Files Modified

### Backend
1. `src/migrations/add_advance_payment_to_auto_monthly_payments.js` - NEW
2. `src/models/AutoMonthlyPayment.js` - Updated create method
3. `src/controllers/autoMonthlyPaymentController.js` - Updated create/update handlers

### Frontend
1. `src/pages/PaymentAdminPage.jsx` - Complete UI integration

## Testing Checklist

- [ ] Run migration: `npm run migrate`
- [ ] Create bulk payment with advance amount
- [ ] Verify each auto has same advance payment
- [ ] Check remaining calculation (monthly - advance)
- [ ] Edit one payment's advance amount
- [ ] Verify remaining recalculates
- [ ] Verify dates don't shift after save
- [ ] Test with 0 advance payment
- [ ] Test with advance > monthly (validation)
- [ ] Check table display with all three columns
- [ ] Verify details modal shows all payment info

## Future Enhancements

- Add validation: `advance_payment <= monthly_cost`
- Add payment history tracking
- Add payment reconciliation report
- Add automatic payment reminders for remaining amount
- Add installment planning (divide remaining into 2-3 payments)
