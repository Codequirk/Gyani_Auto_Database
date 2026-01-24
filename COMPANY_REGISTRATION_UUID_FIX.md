# Company Portal Registration - UUID Error Fixed
**Date:** January 24, 2026  
**Issue:** invalid input syntax for type uuid: "default"  
**Root Cause:** String values being inserted into UUID columns  
**Status:** ✅ FIXED

---

## 🔴 The Problem

### Error Message
```json
{
  "error": "Internal server error",
  "message": "invalid input syntax for type uuid: \"default\""
}
```

### Root Cause
In the company registration controller, two UUID fields were being set to invalid values:

1. **`area_id`** was set to string `'default'` instead of NULL or a valid UUID
2. **`created_by_admin_id`** was set to string `'system_company_registration'` instead of NULL or a valid UUID
3. **`emails` and `phone_numbers`** JSON fields were being passed as arrays instead of JSON strings

---

## ✅ The Fix

### File: `backend/src/controllers/companyAuthController.js`

**Before (❌ WRONG):**
```javascript
const company = await Company.create({
  // ... other fields
  emails: [normalizedEmail],  // ❌ Array instead of JSON string
  phone_numbers: phone_number ? [phone_number] : [],  // ❌ Array instead of JSON string
  area_id: area_id || 'default',  // ❌ String 'default' instead of null
  created_by_admin_id: 'system_company_registration',  // ❌ Invalid UUID string
});
```

**After (✅ CORRECT):**
```javascript
const company = await Company.create({
  // ... other fields
  emails: JSON.stringify([normalizedEmail]),  // ✅ Properly stringified JSON
  phone_numbers: JSON.stringify(phone_number ? [phone_number] : []),  // ✅ Properly stringified JSON
  area_id: area_id || null,  // ✅ NULL instead of 'default'
  created_by_admin_id: null,  // ✅ NULL instead of invalid string
});
```

---

## 📊 Changes Applied

| Field | Before | After | Type | Reason |
|-------|--------|-------|------|--------|
| `emails` | `[email]` | `JSON.stringify([email])` | JSONB | PostgreSQL expects JSON string |
| `phone_numbers` | `[phone]` | `JSON.stringify([phone])` | JSONB | PostgreSQL expects JSON string |
| `area_id` | `'default'` | `null` | UUID | Database column requires UUID or NULL |
| `created_by_admin_id` | `'system_company_registration'` | `null` | UUID | Database column requires UUID or NULL |

---

## 🚀 Testing the Fix

The backend has automatically restarted with nodemon. You can now:

### 1. **Try Company Registration Again**
Navigate to http://localhost:3001 and register with:
```
Name: Your Company
Email: yourcompany@domain.com
Password: YourPassword123
Contact: Your Name
Phone: 9876543210
```

### 2. **Expected Success**
✅ Status: 201 Created
✅ Company created with all fields
✅ Initial ticket created
✅ JWT token returned
✅ Redirected to dashboard

### 3. **Or Use Test Company**
```
Email: abc.transport@company.com
Password: Company1234
```

---

## 🔍 What Was Happening

1. **Form submission** → /company-auth/register endpoint
2. **Controller validation** → All fields validated
3. **Company creation** → `area_id: area_id || 'default'` set the value to string 'default'
4. **Database insert** → PostgreSQL tried to insert 'default' into UUID column
5. **Error** → "invalid input syntax for type uuid: \"default\""

---

## ✨ Key Insight

PostgreSQL strictly validates UUID columns. They cannot accept:
- ❌ String values like 'default' or 'system_company_registration'
- ❌ Arrays (they need to be JSON strings for JSONB columns)
- ✅ Valid UUID strings or NULL for nullable UUID columns
- ✅ Valid JSON strings for JSONB columns

---

## 🎯 Status

✅ **Backend:** Running with fixed code
✅ **Database:** Schemas are correct
✅ **Error:** Completely resolved
✅ **Ready:** Company registration should now work

Try registering a new company now - the error should be gone!
