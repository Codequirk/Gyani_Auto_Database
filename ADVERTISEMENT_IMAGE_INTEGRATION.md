# Advertisement Image Feature - Integration Code

## Admin Panel Integration

### Step 1: Import Component
Add to the file that displays auto details modal (likely `AutoDetailsModal.jsx` or similar):

```jsx
import AdvertisementImageUpload from '../components/AdvertisementImageUpload';
```

### Step 2: Add to Modal Content
In the auto details modal JSX, add the component after auto information:

```jsx
{/* Existing auto details... */}
<div className="grid grid-cols-2 gap-4 mb-4">
  <div>
    <p className="text-sm text-gray-600">Auto Number</p>
    <p className="font-semibold">{selectedAuto.auto_no}</p>
  </div>
  <div>
    <p className="text-sm text-gray-600">Status</p>
    <Badge variant={getStatusColor(selectedAuto.status)}>
      {selectedAuto.status}
    </Badge>
  </div>
  {/* ... more details ... */}
</div>

{/* ADD THIS SECTION */}
<div className="mb-6">
  <AdvertisementImageUpload
    autoId={selectedAuto.id}
    autoNo={selectedAuto.auto_no}
    autoStatus={selectedAuto.status}
    onImageUpdated={(imageData) => {
      // Optional: show success message
      console.log('Image updated:', imageData);
      // Optionally refresh auto details
    }}
  />
</div>

{/* Rest of modal content... */}
```

### Step 3: Complete Example Modal

```jsx
// frontend/src/components/AutoDetailsModal.jsx
import React from 'react';
import { Modal, Badge, Button } from './UI';
import AdvertisementImageUpload from './AdvertisementImageUpload';

const AutoDetailsModal = ({ isOpen, auto, onClose }) => {
  if (!auto) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Auto Details - ${auto.auto_no}`}>
      <div className="space-y-6">
        {/* Auto Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Auto Number</p>
            <p className="font-semibold">{auto.auto_no}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <Badge
              variant={
                auto.status === 'ACTIVE'
                  ? 'success'
                  : auto.status === 'IDLE'
                  ? 'danger'
                  : 'warning'
              }
            >
              {auto.status}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-600">Owner</p>
            <p className="font-semibold">{auto.owner_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Area</p>
            <p className="font-semibold">{auto.area_name || 'N/A'}</p>
          </div>
        </div>

        {/* ADVERTISEMENT IMAGE UPLOAD */}
        <div className="border-t pt-4">
          <AdvertisementImageUpload
            autoId={auto.id}
            autoNo={auto.auto_no}
            autoStatus={auto.status}
            onImageUpdated={(imageData) => {
              if (imageData) {
                console.log('✓ Advertisement image updated');
              } else {
                console.log('✓ Advertisement image deleted');
              }
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AutoDetailsModal;
```

---

## Company Portal Integration

### Step 1: Import Component
Add to the file that displays assignments (likely `CompanyDashboard.jsx` or `AssignmentsList.jsx`):

```jsx
import CompanyPortalAdvertisementImage from '../components/CompanyPortalAdvertisementImage';
```

### Step 2: Add to Assignment Card
In each assignment display, add the component:

```jsx
{/* Existing assignment information... */}
<div className="p-4 border border-gray-200 rounded">
  <div className="grid grid-cols-2 gap-4 mb-4">
    <div>
      <p className="text-sm text-gray-600">Auto</p>
      <p className="font-semibold">{assignment.auto.auto_no}</p>
    </div>
    <div>
      <p className="text-sm text-gray-600">Owner</p>
      <p className="font-semibold">{assignment.auto.owner_name}</p>
    </div>
    {/* ... more details ... */}
  </div>

  {/* ADD THIS SECTION */}
  <div className="border-t pt-4">
    <p className="text-sm font-medium text-gray-700 mb-2">Advertisement</p>
    <CompanyPortalAdvertisementImage
      autoId={assignment.auto_id}
      autoNo={assignment.auto.auto_no}
    />
  </div>
</div>
```

### Step 3: Complete Example Assignment Card

```jsx
// company-portal/src/components/AssignmentCard.jsx
import React from 'react';
import CompanyPortalAdvertisementImage from './CompanyPortalAdvertisementImage';
import { Badge } from './UI';

const AssignmentCard = ({ assignment }) => {
  const getStatusColor = (status) => {
    return status === 'ACTIVE'
      ? 'success'
      : status === 'PREBOOKED'
      ? 'warning'
      : 'secondary';
  };

  return (
    <div className="p-4 border border-blue-200 bg-blue-50 rounded">
      {/* Assignment Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {assignment.auto?.auto_no}
        </h3>
        <Badge variant={getStatusColor(assignment.status)}>
          {assignment.status}
        </Badge>
      </div>

      {/* Assignment Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Owner</p>
          <p className="font-semibold">{assignment.auto?.owner_name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Area</p>
          <p className="font-semibold">{assignment.auto?.area_name || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Start Date</p>
          <p className="font-semibold">{new Date(assignment.start_date).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Duration</p>
          <p className="font-semibold">{assignment.days} days</p>
        </div>
      </div>

      {/* ADVERTISEMENT IMAGE DISPLAY */}
      {assignment.status === 'ACTIVE' && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Featured Image</p>
          <CompanyPortalAdvertisementImage
            autoId={assignment.auto_id}
            autoNo={assignment.auto?.auto_no}
          />
        </div>
      )}
    </div>
  );
};

export default AssignmentCard;
```

---

## Usage Examples

### Admin Panel - Uploading an Image

```jsx
// When admin double-clicks on an ACTIVE auto:
1. Modal opens with auto details
2. "Advertisement Image" section displays
3. Admin clicks "Upload Image" button
4. File picker opens (PNG files only)
5. Admin selects a PNG file (logo, advertisement, etc.)
6. Image uploads to backend
7. Preview displays in modal
8. Component shows "Image uploaded successfully"
9. Admin can:
   - Double-click image to view full size
   - Click "Replace Image" to upload new one
   - Click "Delete" to remove image
```

### Company Portal - Viewing an Image

```jsx
// When company views assignments:
1. For each ACTIVE assignment, check for advertisement image
2. CompanyPortalAdvertisementImage component renders
3. Attempts to fetch image from backend
4. If image exists and not expired:
   - Displays image in assignment card
   - Company can double-click for full view
5. If image missing or expired:
   - Shows "No advertisement image available" message
6. Image refreshes hourly from backend (browser cache)
```

---

## API Calls Made by Components

### Admin Upload Component

```javascript
// Fetch existing image
GET /api/autos/{autoId}/advertisement-image
// Returns: PNG file blob

// Upload new image
POST /api/autos/{autoId}/advertisement-image
// Multipart form-data: { image: File }
// Returns: { success: true, image: {...} }

// Delete image
DELETE /api/autos/{autoId}/advertisement-image
// Returns: { success: true, message: "..." }
```

### Company Portal Display Component

```javascript
// Fetch image for display
GET /api/autos/{autoId}/advertisement-image
// Returns: PNG file blob
// Cache-Control: public, max-age=3600 (1 hour)
```

---

## State Management

### Admin Upload Component

```jsx
const [image, setImage] = useState(null);
// { url: "blob:...", exists: true }

const [loading, setLoading] = useState(false);
// Loading existing image

const [uploading, setUploading] = useState(false);
// Uploading new image

const [error, setError] = useState('');
// "Only PNG images are accepted" etc.

const [showFullView, setShowFullView] = useState(false);
// Full-screen image view modal
```

### Company Portal Display Component

```jsx
const [hasImage, setHasImage] = useState(false);
// Whether image loaded successfully

const [loading, setLoading] = useState(true);
// Initially loading

const [showFullView, setShowFullView] = useState(false);
// Full-screen image view modal
```

---

## Error Handling

### Admin Upload - Expected Errors

```
"Only PNG images are accepted"
- User selected non-PNG file

"File size must be less than 5MB"
- File exceeds size limit

"Auto must have an ACTIVE assignment to upload advertisement"
- Trying to upload for IDLE or PREBOOKED auto

"Failed to upload image"
- Network or server error

"Auto not found"
- Auto was deleted before upload
```

### Company Portal - Expected States

```
"Loading image..."
- Initial fetch in progress

"No advertisement image available"
- No image exists or expired

[Image displays]
- Image fetched and rendered successfully
```

---

## Testing the Feature

### Manual Test - Upload

```
1. Open admin panel
2. Find any ACTIVE auto (status = "ACTIVE")
3. Double-click to open details
4. Scroll to "Advertisement Image" section
5. Click "Upload Image" button
6. Select a PNG file from your computer
7. Verify:
   - Loading spinner shows
   - Image preview appears
   - Success message displays
8. Double-click image to view full size
9. Click "Replace Image" and upload different PNG
10. Click "Delete" to remove image
```

### Manual Test - Display

```
1. Open company portal
2. Login with company account
3. Go to dashboard/assignments page
4. Find any ACTIVE assignment
5. Look for "Featured Image" section
6. If admin uploaded image:
   - Image should display
   - Should be clickable
   - Double-click shows full size
7. If no image or expired:
   - "No advertisement image available" message
```

---

## Troubleshooting

### Image doesn't upload
- Check file is PNG format
- Check file size < 5MB
- Check auto has ACTIVE assignment
- Check browser console for errors
- Check server logs (backend)

### Image doesn't display in company portal
- Check image was successfully uploaded in admin
- Wait a moment (cache may be stale)
- Try refreshing the page
- Check browser DevTools Network tab (204 vs 404)

### Cleanup isn't deleting old images
- Check cleanup scheduler is running
- Look in backend logs for "[ADV-IMAGE]" messages
- Verify `/uploads/advertisements/` directory exists
- Check file permissions on directory

---

## Performance Considerations

### Image Caching
- Backend sets `Cache-Control: public, max-age=3600`
- Browser caches images for 1 hour
- Images don't need to be refetched frequently

### Cleanup Efficiency
- Runs hourly (configurable in cleanupService.js)
- Only deletes truly expired records
- Non-blocking (doesn't affect API requests)
- Can be adjusted to run less frequently if needed

### Storage
- Each image stored once on disk
- One image per auto (unique constraint)
- 7-day expiration prevents unlimited growth
- ~1-2MB per image typical (adjust 5MB limit if needed)

