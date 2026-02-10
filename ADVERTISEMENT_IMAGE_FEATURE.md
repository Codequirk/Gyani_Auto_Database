# Advertisement Image Feature - Implementation Guide

## Overview

A complete feature implementation for uploading, storing, and displaying advertisement images for ACTIVE autos.

**Key characteristics:**
- PNG format only
- 7-day automatic expiration with scheduled cleanup
- Separate upload capability for admin panel
- Read-only display in company portal
- No frontend image processing (backend handles all logic)

---

## Architecture

### Database Schema

**Table: `advertisement_images`**
```sql
CREATE TABLE advertisement_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auto_id UUID NOT NULL UNIQUE (one image per auto),
  filename VARCHAR NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL (uploaded_at + 7 days),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (auto_id) REFERENCES autos(id) ON DELETE CASCADE
);
```

**Key fields:**
- `auto_id`: Links image to a specific auto
- `filename`: Stored in `/uploads/advertisements/` directory
- `expires_at`: Calculated at creation time (now + 7 days)
- Unique constraint on `auto_id`: Only one active image per auto

---

## Backend Implementation

### 1. Model: `AdvertisementImage`

**Location:** `backend/src/models/AdvertisementImage.js`

**Key Methods:**

```javascript
// Create new image record
static async create(autoId, filename)
// Returns: Record with id, auto_id, filename, uploaded_at, expires_at

// Fetch non-expired image for an auto
static async findByAutoId(autoId)
// Returns: Record or null (auto-filters expired images)

// Delete image by auto ID
static async deleteByAutoId(autoId)
// Returns: Deleted record with filename (for cleanup)

// Find all expired images (for cleanup job)
static async findExpired()
// Returns: Array of expired records

// Batch fetch for multiple autos
static async findByAutoIds(autoIds)
// Returns: Array of non-expired images for these autos
```

---

### 2. Controller: `AdvertisementImageController`

**Location:** `backend/src/controllers/advertisementImageController.js`

**Endpoints:**

#### POST `/autos/:autoId/advertisement-image`
- **Auth:** Admin only
- **Input:** Multipart form-data with `image` file (PNG only)
- **Validation:**
  - File exists and is PNG format
  - Auto exists in database
  - Auto has at least one ACTIVE assignment
  - File size < 5MB
- **Behavior:**
  - Deletes existing image if present
  - Saves new image to `/uploads/advertisements/`
  - Creates database record with 7-day expiration
  - Returns image metadata
- **Response:**
```json
{
  "success": true,
  "message": "Advertisement image uploaded successfully",
  "image": {
    "id": "uuid",
    "auto_id": "uuid",
    "filename": "auto_id_uuid.png",
    "url": "/api/autos/{autoId}/advertisement-image",
    "uploaded_at": "2026-02-07T...",
    "expires_at": "2026-02-14T..."
  }
}
```

#### GET `/autos/:autoId/advertisement-image`
- **Auth:** None (public, for both admin and company portal)
- **Input:** None
- **Behavior:**
  - Fetches non-expired image
  - Returns raw PNG file (not JSON)
  - 404 if not found or expired
  - Auto-deletes expired record if file missing
- **Cache:** 1 hour (browser cache)

#### DELETE `/autos/:autoId/advertisement-image`
- **Auth:** Admin only
- **Input:** None
- **Behavior:**
  - Deletes database record
  - Removes file from disk
  - Returns success message

#### Cleanup Function: `cleanupExpiredImages()`
- **Called by:** Cleanup scheduler (hourly)
- **Behavior:**
  - Finds all expired records
  - Deletes files from disk
  - Removes database records
  - Logs cleanup stats

---

### 3. Routes: `autoRoutes.js`

```javascript
// Requires multer middleware for file uploads
const upload = multer({ dest: '/tmp/uploads' });

// Image upload endpoint (admin only)
router.post(
  '/:autoId/advertisement-image',
  authMiddleware,
  upload.single('image'),
  advertisementImageController.uploadAdvertisementImage
);

// Image fetch endpoint (public)
router.get(
  '/:autoId/advertisement-image',
  advertisementImageController.getAdvertisementImage
);

// Image delete endpoint (admin only)
router.delete(
  '/:autoId/advertisement-image',
  authMiddleware,
  advertisementImageController.deleteAdvertisementImage
);
```

---

### 4. Cleanup Scheduler

**Location:** `backend/src/services/cleanupService.js`

**Changes:**
- Runs hourly (every 0 minutes of every hour)
- Calls `advertisementImageController.cleanupExpiredImages()`
- Maintains existing cleanup for old assignments
- Non-blocking (failures logged, not thrown)

---

## Frontend Implementation

### Admin Panel: AdvertisementImageUpload Component

**Location:** `frontend/src/components/AdvertisementImageUpload.jsx`

**Props:**
```javascript
{
  autoId: string,           // ID of the auto
  autoNo: string,           // Display name of auto
  autoStatus: string,       // Current status (IDLE, ACTIVE, PREBOOKED)
  onImageUpdated: function  // Callback after upload/delete
}
```

**Features:**
- ✅ Only visible for ACTIVE autos
- ✅ PNG file type validation (client-side)
- ✅ Max 5MB file size check
- ✅ Shows existing image preview
- ✅ Double-click to view full image in modal
- ✅ Replace button when image exists
- ✅ Delete button for removing image
- ✅ Loading and error states
- ✅ Success feedback on upload
- ✅ No image processing on frontend (raw URL)

**Usage in Modal:**
```jsx
<AdvertisementImageUpload
  autoId={selectedAuto.id}
  autoNo={selectedAuto.auto_no}
  autoStatus={selectedAuto.status}
  onImageUpdated={(imageData) => {
    // Handle upload/delete completion
  }}
/>
```

---

### Company Portal: CompanyPortalAdvertisementImage

**Location:** `company-portal/src/components/CompanyPortalAdvertisementImage.jsx`

**Props:**
```javascript
{
  autoId: string,    // ID of the auto
  autoNo: string     // Display name of auto
}
```

**Features:**
- ✅ Read-only display
- ✅ Loading state while fetching
- ✅ Graceful handling of missing images
- ✅ Double-click to view full image
- ✅ Responsive design
- ✅ No upload or edit capability

**Usage in Assignment Card:**
```jsx
<CompanyPortalAdvertisementImage
  autoId={assignment.auto_id}
  autoNo={auto.auto_no}
/>
```

---

## File Storage

### Directory Structure
```
backend/
  uploads/
    advertisements/
      {autoId}_{uuid}.png
      {autoId}_{uuid}.png
      ...
  src/
    controllers/
      advertisementImageController.js
    models/
      AdvertisementImage.js
    routes/
      autoRoutes.js (modified)
    services/
      cleanupService.js (modified)
    migrations/
      003_create_advertisement_images_table.js
```

### Storage Rules
- Files stored in `/backend/uploads/advertisements/`
- Filenames: `{autoId}_{uuidv4()}.png`
- Only PNG files allowed
- No frontend processing or storage
- Backend serves via `/api/autos/:autoId/advertisement-image`

---

## Data Flow

### Upload Flow (Admin Panel)

1. Admin opens auto details (double-click auto in list)
2. **AdvertisementImageUpload** component renders
3. Admin selects PNG file from file picker
4. Component validates:
   - File type is PNG ✓
   - File size < 5MB ✓
5. Upload starts: `POST /autos/{autoId}/advertisement-image`
6. Backend:
   - Validates auto exists
   - Validates auto has ACTIVE assignment
   - Deletes old image if exists
   - Saves new file to disk
   - Creates database record (7-day expiration)
   - Returns success response
7. Component shows:
   - Success message
   - Image preview
   - Delete button
8. Parent modal receives callback notification

---

### Display Flow (Company Portal)

1. Company logs in
2. Dashboard fetches ACTIVE assignments
3. For each assignment, fetch associated auto
4. Render **CompanyPortalAdvertisementImage** component
5. Component requests: `GET /api/autos/{autoId}/advertisement-image`
6. Backend:
   - Checks if non-expired image exists
   - If expired, deletes record (cleanup)
   - Returns 404 if none
   - Serves PNG file if found
7. Component:
   - Shows loading while fetching
   - Displays image if exists
   - Shows empty state if not found
   - Allows double-click for full view

---

### Cleanup Flow (Scheduled)

1. Cleanup scheduler runs every hour
2. Calls `cleanupExpiredImages()`
3. Database query: Find all records where `expires_at <= NOW()`
4. For each expired record:
   - Delete file from disk
   - Delete database record
5. Log statistics
6. Non-blocking (failures don't crash server)

---

## Important Design Decisions

### ✅ What Frontend Does NOT Do
- **No image resizing** - Backend serves original PNG
- **No base64 encoding** - Always fetch via URL
- **No state mutations** - Only fetch and display
- **No processing** - Pure presentation

### ✅ What Backend Owns
- **File validation** - Type, size, format
- **Storage** - Disk management
- **Expiration** - Automatic cleanup after 7 days
- **Access control** - Admin-only upload, public fetch

### ✅ Security Considerations
- **Type validation:** Only PNG allowed at upload
- **Size limits:** 5MB max per image
- **Auth:** Upload/delete require admin auth
- **Auto validation:** Image can only exist if auto is ACTIVE
- **Path traversal:** Fixed storage directory, safe filenames

---

## Testing Checklist

### Backend
- [ ] Database table created successfully
- [ ] Upload endpoint validates PNG only
- [ ] Upload endpoint checks ACTIVE status
- [ ] GET endpoint returns PNG file correctly
- [ ] GET endpoint returns 404 for missing images
- [ ] DELETE endpoint removes file and record
- [ ] Cleanup job runs hourly
- [ ] Cleanup deletes expired records and files
- [ ] Multiple autos can have different images

### Admin Panel
- [ ] Component only shows for ACTIVE autos
- [ ] File picker accepts PNG
- [ ] File validation rejects non-PNG
- [ ] Upload shows loading state
- [ ] Success message displays
- [ ] Image preview shows after upload
- [ ] Double-click opens full-view modal
- [ ] Replace button works correctly
- [ ] Delete button removes image
- [ ] Error messages display on failures

### Company Portal
- [ ] Images display for ACTIVE assignments
- [ ] Loading state shows while fetching
- [ ] Missing images show graceful empty state
- [ ] Double-click opens full-view modal
- [ ] No upload/edit controls visible
- [ ] Images expire correctly (after 7 days)

---

## Integration with Existing Features

### Auto Details Modal
Add **AdvertisementImageUpload** to the modal that shows when admin double-clicks an auto in the list.

### Company Portal Dashboard
Add **CompanyPortalAdvertisementImage** to each assignment card or auto display section.

### No Breaking Changes
- All existing auto endpoints unchanged
- No modifications to assignment logic
- Cleanup scheduler extends existing service
- Fully isolated feature

---

## API Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/autos/:autoId/advertisement-image` | Admin | Upload PNG image |
| GET | `/autos/:autoId/advertisement-image` | None | Fetch PNG image |
| DELETE | `/autos/:autoId/advertisement-image` | Admin | Delete image |

---

## Files Created/Modified

### New Files
- `backend/src/models/AdvertisementImage.js`
- `backend/src/controllers/advertisementImageController.js`
- `backend/src/migrations/003_create_advertisement_images_table.js`
- `frontend/src/components/AdvertisementImageUpload.jsx`
- `company-portal/src/components/CompanyPortalAdvertisementImage.jsx`

### Modified Files
- `backend/src/routes/autoRoutes.js` - Added image endpoints
- `backend/src/services/cleanupService.js` - Added image cleanup
- `backend/src/index.js` - No changes needed (cleanup already enabled)

---

## Deployment Notes

1. **Run migrations** before deploying:
   ```bash
   npm run migrate
   ```

2. **Create uploads directory** if not exists:
   ```bash
   mkdir -p backend/uploads/advertisements
   ```

3. **Restart backend** to activate cleanup scheduler

4. **Clear browser cache** to load new components

5. **Test image upload** with small PNG first

---

## Future Enhancements

- [ ] Image optimization (compression before storage)
- [ ] Batch image upload for multiple autos
- [ ] Image rotation/editing in admin panel
- [ ] Multiple images per auto (gallery)
- [ ] Analytics: view counts per image
- [ ] CDN integration for faster serving

