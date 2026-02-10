import React, { useState } from 'react';

/**
 * CompanyPortalAdvertisementImage Component
 * 
 * Displays advertisement images for ACTIVE assignments in company portal
 * - Read-only display
 * - Clickable to view full image
 * - Shows loading state while fetching
 */
const CompanyPortalAdvertisementImage = ({ autoId, autoNo }) => {
  const [hasImage, setHasImage] = useState(false);
  const [showFullView, setShowFullView] = useState(false);
  const [loading, setLoading] = useState(true);

  // Handle image load
  const handleImageLoad = () => {
    setLoading(false);
    setHasImage(true);
  };

  // Handle image load error (no image or expired)
  const handleImageError = () => {
    setLoading(false);
    setHasImage(false);
  };

  return (
    <>
      {/* Image Container */}
      {loading && (
        <div className="w-full max-w-xs h-48 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading image...</p>
        </div>
      )}

      {hasImage && (
        <img
          src={`/api/autos/${autoId}/advertisement-image`}
          alt={`Advertisement for Auto ${autoNo}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onDoubleClick={() => setShowFullView(true)}
          className="w-full max-w-xs h-auto rounded border border-blue-200 cursor-pointer hover:opacity-80 transition shadow-sm"
          title={`Double-click to view full image for ${autoNo}`}
        />
      )}

      {!loading && !hasImage && (
        <div className="w-full max-w-xs h-24 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
          <p className="text-sm text-gray-500 text-center px-4">No advertisement image available</p>
        </div>
      )}

      {/* Full View Modal */}
      {showFullView && hasImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFullView(false)}
        >
          <div className="max-w-4xl max-h-96 relative">
            <img
              src={`/api/autos/${autoId}/advertisement-image`}
              alt={`Advertisement Full View for Auto ${autoNo}`}
              className="max-w-full max-h-full rounded"
            />
            <button
              onClick={() => setShowFullView(false)}
              className="absolute top-2 right-2 bg-white rounded-full p-2 hover:bg-gray-200 transition"
              title="Close (ESC or click outside)"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CompanyPortalAdvertisementImage;
