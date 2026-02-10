import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Button, LoadingSpinner, ErrorAlert } from '../UI';

/**
 * AdvertisementImageUpload Component
 * 
 * Allows admins to upload PNG advertisement images for ACTIVE autos
 * - Validates file type (PNG only)
 * - Shows preview of uploaded image
 * - Allows replacing existing image
 * - Full-screen view on double-click
 */
const AdvertisementImageUpload = ({ autoId, autoNo, autoStatus, onImageUpdated }) => {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showFullView, setShowFullView] = useState(false);

  // Fetch existing image on mount
  useEffect(() => {
    fetchImage();
  }, [autoId]);

  const fetchImage = async () => {
    try {
      setLoading(true);
      // Try to fetch the image
      const response = await api.get(`/autos/${autoId}/advertisement-image`, {
        responseType: 'blob',
      });

      // Create URL for the image
      const imageUrl = URL.createObjectURL(response.data);
      setImage({
        url: imageUrl,
        exists: true,
      });
    } catch (err) {
      // No image found, that's fine
      setImage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'image/png') {
      setError('Only PNG images are accepted');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post(`/autos/${autoId}/advertisement-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update local image
      const imageUrl = URL.createObjectURL(file);
      setImage({
        url: imageUrl,
        exists: true,
      });

      setError('');
      // Call parent callback
      if (onImageUpdated) {
        onImageUpdated(response.data.image);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this advertisement image?')) return;

    setLoading(true);
    try {
      await api.delete(`/autos/${autoId}/advertisement-image`);
      setImage(null);
      setError('');
      if (onImageUpdated) {
        onImageUpdated(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete image');
    } finally {
      setLoading(false);
    }
  };

  // Only show for ACTIVE autos
  if (autoStatus !== 'ACTIVE') {
    return (
      <div className="p-4 bg-gray-50 rounded border border-gray-200">
        <p className="text-sm text-gray-600">
          Advertisement images can only be uploaded for ACTIVE autos.
        </p>
        <p className="text-xs text-gray-500 mt-1">Current status: {autoStatus}</p>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-4 border border-blue-200 bg-blue-50 rounded">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Advertisement Image</h3>

      {error && <ErrorAlert message={error} />}

      {/* Existing Image */}
      {image?.exists && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Current Image:</p>
          <img
            src={`/api/autos/${autoId}/advertisement-image`}
            alt="Advertisement"
            onDoubleClick={() => setShowFullView(true)}
            className="w-full max-w-xs h-auto rounded border border-gray-300 cursor-pointer hover:opacity-80 transition"
            title="Double-click to view full size"
          />
          <p className="text-xs text-gray-500 mt-2">Double-click to view full image</p>
        </div>
      )}

      {/* Upload Section */}
      <div className="flex gap-2">
        <label className="flex-1">
          <input
            type="file"
            accept=".png,image/png"
            onChange={handleFileSelect}
            disabled={uploading || loading}
            className="hidden"
          />
          <Button
            as="span"
            variant={uploading ? 'secondary' : 'primary'}
            disabled={uploading || loading}
            className="w-full cursor-pointer"
          >
            {uploading ? 'Uploading...' : image?.exists ? 'Replace Image' : 'Upload Image'}
          </Button>
        </label>

        {image?.exists && (
          <Button
            onClick={handleDelete}
            variant="danger"
            disabled={loading || uploading}
          >
            Delete
          </Button>
        )}
      </div>

      {/* Full View Modal */}
      {showFullView && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFullView(false)}
        >
          <div className="max-w-4xl max-h-96 relative">
            <img
              src={`/api/autos/${autoId}/advertisement-image`}
              alt="Advertisement Full View"
              className="max-w-full max-h-full rounded"
            />
            <button
              onClick={() => setShowFullView(false)}
              className="absolute top-2 right-2 bg-white rounded-full p-2 hover:bg-gray-200 transition"
              title="Close (ESC)"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Info Text */}
      <p className="text-xs text-gray-500 mt-3">
        ℹ️ PNG format only. Images expire after 7 days.
      </p>
    </div>
  );
};

export default AdvertisementImageUpload;
