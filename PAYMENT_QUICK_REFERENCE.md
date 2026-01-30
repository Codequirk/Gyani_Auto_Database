# Payment Feature - Quick Reference Guide

## What's New

### 1. Cost Input During Assignment
When assigning autos, admins now enter the **cost per auto per day** before confirming the assignment.

### 2. Automatic Payment Calculation
The system automatically calculates:
```
Total Cost = Cost Per Day × Number of Autos × Number of Days
```

### 3. Payment Records Created
Payment records are automatically created with:
- Auto details (number, owner, area)
- Cost per day
- Total days
- Total cost (calculated)
- Payment status (PENDING)

### 4. Companies List View
The Payment Admin page now shows a prominent companies section with:
- Company name, email, phone
- Number of autos assigned
- Total payment value

---

## How to Use

### In Company Portal (Autos Management)

**Step 4: Cost Input**
1. After selecting dates and days in Step 3
2. Enter "Cost Per Auto Per Day"
3. View calculation preview showing total cost
4. Click Next to select autos
5. Review total cost in Step 5 before confirming

### In Admin Panel (Company Requests)

**Cost Input Modal**
1. When approving a request with auto assignments
2. Modal appears: "Set Payment Cost"
3. Enter cost per auto per day
4. See breakdown:
   - Cost per Auto per Day
   - Cost per Auto Total (all days)
   - Number of Autos
   - Grand Total
5. Click "Confirm & Assign"

### In Payment Admin Page

**Companies Section**
- Top section shows all companies in card grid
- Each card displays:
  - Company name
  - Contact details
  - Autos assigned count
  - Total payment value

**Detailed Section**
- Below companies section
- Detailed breakdown by company
- Payments organized by area
- Individual auto payment details

---

## Calculation Examples

### Example 1: Single Auto
- Cost per day: ₹500
- Number of autos: 1
- Number of days: 30
- **Total: 500 × 1 × 30 = ₹15,000**

### Example 2: Multiple Autos
- Cost per day: ₹500
- Number of autos: 3
- Number of days: 30
- **Total: 500 × 3 × 30 = ₹45,000**

### Example 3: Different Cost
- Cost per day: ₹750
- Number of autos: 2
- Number of days: 15
- **Total: 750 × 2 × 15 = ₹22,500**

---

## Data Flow

```
┌─────────────────────────────────────────────────┐
│ User selects autos for assignment               │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│ Cost Input Modal appears                        │
│ - Enter: Cost Per Auto Per Day                  │
│ - View: Total Cost Calculation                  │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│ Backend receives:                               │
│ - auto_ids                                      │
│ - company_id                                    │
│ - days                                          │
│ - cost_per_day (NEW)                            │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│ Create Assignments                              │
│ + Create Payment Records                        │
│   (cost_per_day × days = total_cost)            │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│ Payment Admin Page displays:                    │
│ - Companies List (cards)                        │
│ - Detailed Payments (organized by company)      │
└─────────────────────────────────────────────────┘
```

---

## Key Features

✅ **Real-time Calculation** - See total cost before confirming
✅ **Automatic Creation** - Payment records created automatically
✅ **Company Organization** - All payments grouped by company
✅ **Area Breakdown** - Payments further organized by area
✅ **Status Tracking** - Payment status (PENDING/APPROVED/PAID/CANCELLED)
✅ **Currency Formatting** - Indian rupee format (₹)
✅ **Complete Audit Trail** - All assignment costs tracked

---

## Common Tasks

### Task: Check total payment for a company
1. Go to Payment Admin Page
2. Find company in Companies List section
3. View "Total Payment Value" in the card

### Task: Review detailed payments for a company
1. Go to Payment Admin Page
2. Scroll to "Payment Details by Company" section
3. Click on company section
4. View area-wise and auto-wise breakdown

### Task: Assign autos with cost
1. Go to Company Portal → Autos Management
2. Click "⚡ Assign Autos"
3. Complete Steps 1-3 (company, area, dates)
4. In Step 4, enter "Cost Per Auto Per Day"
5. Review total cost
6. Click "Next" → Select autos → "Assign Autos"

### Task: Assign autos from admin requests
1. Go to Admin Panel → Company Requests
2. Click "Action" on pending request
3. Select autos
4. Click "Confirm Assignment"
5. In cost modal: enter cost per day
6. View calculation
7. Click "Confirm & Assign"

---

## Payment Record Information

Each payment record includes:
```
{
  auto_no: "MH-01-XX-1234",
  owner_name: "John Doe",
  area_name: "Malleswaram",
  cost_per_day: 500,
  total_days: 30,
  total_cost: 15000,           // Calculated: 500 × 30
  payment_status: "PENDING"
}
```

---

## Status Codes

| Status | Meaning | Color |
|--------|---------|-------|
| PENDING | Not yet processed | Yellow |
| APPROVED | Approved by admin | Blue |
| PAID | Payment received | Green |
| CANCELLED | Cancelled/Refunded | Red |

---

## Notes

- Cost per day must be > 0 to create payments
- Payment records are created automatically during assignment
- All calculations use Indian rupee format (₹)
- Total cost = cost_per_day × number_of_autos × number_of_days
- Payment status defaults to "PENDING"

---

## Support

For issues or questions:
1. Check PAYMENT_FEATURE_IMPLEMENTATION.md for detailed documentation
2. Review Payment Admin Page for all payment data
3. Check assignment records for cost verification
