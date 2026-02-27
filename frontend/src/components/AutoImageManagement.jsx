import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Button, LoadingSpinner, ErrorAlert, Badge } from './UI';
import { Link } from 'react-router-dom';
import { BACKEND_BASE_URL, getFullImageUrl } from '../config/url';

/**
 * AutoImageManagement Component
 * 
 * Displays autos in 3 sections based on weekly image status:
 * 1. MISSING - No image or old image past deadline
 * 2. BUFFER - Previous week image in Sun-Tue window
 * 3. UPLOADED - Current week image
 */
const AutoImageManagement = () => {
  const [sections, setSections] = useState({ MISSING: [], BUFFER: [], UPLOADED: [] });
  const [summary, setSummary] = useState({ total: 0, missing: 0, buffer: 0, uploaded: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingAutoId, setUploadingAutoId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({}); // Map of autoId -> file
  const [successMessage, setSuccessMessage] = useState('');
  const [fullViewImage, setFullViewImage] = useState(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false); // Track modal image load failures
  const fileInputRefs = useRef({}); // Refs for file inputs

  useEffect(() => {
    fetchImageSections();
    // Refresh every 30 seconds
    const interval = setInterval(fetchImageSections, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchImageSections = async () => {
    try {
      setError('');
      console.log(`🔄 [Fetch] Getting image sections...`);
      const response = await api.get('/auto-images/image-sections');
      
      console.log(`✓ [Fetch] Response received:`, response.data);
      console.log(`   Response keys: ${Object.keys(response.data).join(', ')}`);
      
      if (response.data.summary) {
        console.log(`   Summary: total=${response.data.summary.total}, missing=${response.data.summary.missing}, buffer=${response.data.summary.buffer}, uploaded=${response.data.summary.uploaded}`);
      }
      
      if (response.data.sections) {
        console.log(`   Sections: MISSING=${response.data.sections.MISSING?.length}, BUFFER=${response.data.sections.BUFFER?.length}, UPLOADED=${response.data.sections.UPLOADED?.length}`);
        
        if (response.data.sections.UPLOADED && response.data.sections.UPLOADED.length > 0) {
          console.log(`   ✓ ${response.data.sections.UPLOADED.length} autos with uploaded images:`);
          response.data.sections.UPLOADED.forEach((auto, idx) => {
            console.log(`     [${idx+1}] ${auto.auto_no} - image_url: ${auto.image_url}`);
          });
        } else {
          console.warn(`   ⚠️  No autos with uploaded images`);
        }
      }
      
      setSections(response.data.sections);
      setSummary(response.data.summary);
      console.log(`✓ [Fetch] State updated`);
    } catch (err) {
      console.error(`❌ [Fetch] Error fetching image sections:`, err);
      console.error(`   Error message: ${err.message}`);
      console.error(`   Error response:`, err.response?.data);
      setError('Failed to load image sections. ' + (err.response?.data?.error || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async (autoId) => {
    const selectedFile = selectedFiles[autoId];
    
    console.log(`📤 [Upload Start] autoId: ${autoId}, file: ${selectedFile?.name}, size: ${selectedFile?.size}`);
    
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    // Validate file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      setError('');
      setUploadingAutoId(autoId);

      console.log(`🔄 [Upload] Posting to /auto-images/${autoId}/upload-image`);
      const response = await api.post(`/auto-images/${autoId}/upload-image`, formData);

      console.log(`✓ [Upload] Response received:`, response.data);
      console.log(`   Response type: ${typeof response.data}`);
      console.log(`   Response keys: ${Object.keys(response.data).join(', ')}`);
      
      if (response.data.auto) {
        console.log(`✓ [Upload] Auto object found`);
        console.log(`   Auto keys: ${Object.keys(response.data.auto).join(', ')}`);
        console.log(`   imageUrl: ${response.data.auto.imageUrl}`);
        console.log(`   auto_no: ${response.data.auto.auto_no}`);
        console.log(`   Image URL exists: ${!!response.data.auto.imageUrl}`);
      } else {
        console.warn(`⚠️  [Upload] No auto object in response!`);
      }
      
      setSuccessMessage(`✅ Image uploaded for ${response.data.auto.auto_no}`);
      setTimeout(() => setSuccessMessage(''), 3000);

      setSelectedFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[autoId];
        return newFiles;
      });
      
      // Wait a moment then refresh sections with cache-busting
      console.log(`⏳ [Upload] Waiting 500ms before refresh...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`🔄 [Upload] Refreshing sections...`);
      await fetchImageSections();
      console.log(`✓ [Upload] Sections refreshed`);
    } catch (err) {
      console.error(`❌ [Upload] Error:`, err);
      console.error(`   Error message: ${err.message}`);
      console.error(`   Error response:`, err.response?.data);
      setError('Failed to upload image: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingAutoId(null);
    }
  };

  const handleDeleteImage = async (autoId, autoNo) => {
    if (!window.confirm(`Delete image for ${autoNo}?`)) return;

    try {
      setError('');
      setUploadingAutoId(autoId);

      await api.delete(`/auto-images/${autoId}/delete-image`);

      setSuccessMessage(`✅ Image deleted for ${autoNo}`);
      setTimeout(() => setSuccessMessage(''), 3000);

      // Refresh sections
      await fetchImageSections();
    } catch (err) {
      setError('Failed to delete image: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingAutoId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  const getSectionColor = (section) => {
    switch (section) {
      case 'MISSING':
        return 'bg-red-50 border-red-200';
      case 'BUFFER':
        return 'bg-yellow-50 border-yellow-200';
      case 'UPLOADED':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getSectionBadgeColor = (section) => {
    switch (section) {
      case 'MISSING':
        return 'danger';
      case 'BUFFER':
        return 'warning';
      case 'UPLOADED':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getSectionDescription = (section) => {
    switch (section) {
      case 'MISSING':
        return '⚠️ No image or expired - Upload new image immediately';
      case 'BUFFER':
        return '🔄 Previous week image - Replace with current week image (Sun-Tue window)';
      case 'UPLOADED':
        return '✅ Current week image - Valid until next Sunday';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex gap-3">
        <Link
          to="/autos"
          className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
        >
          📋 Auto Management
        </Link>
        <button
          disabled
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg cursor-default flex items-center gap-2"
        >
          📸 Image Management
        </button>
      </div>

      {/* Header with Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">📸 Weekly Auto Image Management</h1>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <p className="text-gray-600 text-sm">Total Autos</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="bg-red-50 p-4 rounded border border-red-200">
            <p className="text-red-600 text-sm">Missing Images</p>
            <p className="text-2xl font-bold text-red-600">{summary.missing}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
            <p className="text-yellow-600 text-sm">Buffer Window</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.buffer}</p>
          </div>
          <div className="bg-green-50 p-4 rounded border border-green-200">
            <p className="text-green-600 text-sm">Uploaded</p>
            <p className="text-2xl font-bold text-green-600">{summary.uploaded}</p>
          </div>
        </div>

        {/* Messages */}
        {error && <ErrorAlert message={error} />}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}
      </div>

      {/* All 3 Sections Stacked */}
      {['MISSING', 'BUFFER', 'UPLOADED'].map((sectionName) => (
        <div key={sectionName} className="bg-white rounded-lg shadow p-6">
          {/* Section Header */}
          <div className={`p-4 rounded border mb-4 flex justify-between items-center ${getSectionColor(sectionName)}`}>
            <div>
              <p className="font-bold text-lg">
                {sectionName === 'MISSING' && '🔴 Missing Images'}
                {sectionName === 'BUFFER' && '🟡 Buffer Window'}
                {sectionName === 'UPLOADED' && '🟢 Uploaded Images'}
              </p>
              <p className="text-sm mt-1">{getSectionDescription(sectionName)}</p>
            </div>
            <span className="text-2xl font-bold text-gray-700">
              {sectionName === 'MISSING' && summary.missing}
              {sectionName === 'BUFFER' && summary.buffer}
              {sectionName === 'UPLOADED' && summary.uploaded}
            </span>
          </div>

          {/* Auto List for Section */}
          {sections[sectionName]?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No autos in this section</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sections[sectionName]?.map((auto) => {
                console.log(`[Section] ${sectionName} - ${auto.auto_no}:`, { 
                  id: auto.id, 
                  image_url: auto.image_url,
                  image_upload_date: auto.image_upload_date
                });
                return (
                <div
                  key={auto.id}
                  className={`border rounded p-4 ${getSectionColor(sectionName)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg">{auto.auto_no}</h3>
                        <Badge
                          label={sectionName}
                          color={getSectionBadgeColor(sectionName)}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Owner: {auto.owner_name}</p>
                      
                      {/* Image Details */}
                      {auto.image_upload_date && (
                        <div className="text-xs text-gray-500 mb-3">
                          <p>Uploaded: {new Date(auto.image_upload_date).toLocaleDateString('en-IN')}</p>
                          <p>Week {auto.image_week_number}/{auto.image_year}</p>
                        </div>
                      )}

                      {/* Image Preview - Hidden in UPLOADED section, only shown on double-click */}
                      {auto.image_url && sectionName !== 'UPLOADED' && (
                        <div className="mb-3">
                          <img
                            src={getFullImageUrl(auto.image_url)}
                            alt={auto.auto_no}
                            className="max-w-xs h-auto rounded border border-gray-300 cursor-pointer hover:opacity-80 transition"
                            onDoubleClick={() => {
                              console.log(`[Double-click] Opening image for ${auto.auto_no}`);
                              setFullViewImage(auto);
                            }}
                            title="Double-click to view full size"
                            onError={(e) => {
                              console.error('[Image Error] Failed to load:', e);
                              e.target.style.display = 'none';
                            }}
                            onLoad={() => {
                              console.log(`[Image Load] Image loaded for ${auto.auto_no}`);
                            }}
                          />
                        </div>
                      )}

                      {/* For UPLOADED section, show a "Click to view" button instead */}
                      {auto.image_url && sectionName === 'UPLOADED' && (
                        <div className="mb-3">
                          <button
                            onClick={() => {
                              console.log('[View Image] Button clicked for:', {
                                auto_no: auto.auto_no,
                                id: auto.id,
                                image_url: auto.image_url,
                                image_upload_date: auto.image_upload_date,
                                image_week_number: auto.image_week_number,
                                image_year: auto.image_year
                              });
                              setImageLoadFailed(false);
                              setFullViewImage(auto);
                            }}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium transition"
                            title="Click to view image"
                          >
                            👁️ View Image
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="ml-4 flex flex-col gap-2 min-w-max">
                      {sectionName === 'MISSING' || sectionName === 'BUFFER' ? (
                        <>
                          <input
                            ref={(el) => fileInputRefs.current[auto.id] = el}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSelectedFiles((prev) => ({ ...prev, [auto.id]: file }));
                                console.log(`[Upload] File selected for ${auto.auto_no}: ${file.name}`);
                              }
                            }}
                            disabled={uploadingAutoId === auto.id}
                            className="hidden"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              console.log(`[Upload] Clicking file input for ${auto.auto_no}`);
                              fileInputRefs.current[auto.id]?.click();
                            }}
                            disabled={uploadingAutoId === auto.id}
                          >
                            {uploadingAutoId === auto.id ? 'Uploading...' : '📤 Upload'}
                          </Button>
                          {selectedFiles[auto.id] && (
                            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                              <p>✓ {selectedFiles[auto.id].name}</p>
                            </div>
                          )}
                          {selectedFiles[auto.id] && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => {
                                console.log(`[Upload] Confirming upload for ${auto.auto_no}`);
                                handleUploadImage(auto.id);
                              }}
                              disabled={uploadingAutoId === auto.id}
                            >
                              {uploadingAutoId === auto.id ? 'Processing...' : '✓ Confirm'}
                            </Button>
                          )}
                        </>
                      ) : null}

                      {auto.image_url && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteImage(auto.id, auto.auto_no)}
                          disabled={uploadingAutoId === auto.id}
                        >
                          {uploadingAutoId === auto.id ? 'Deleting...' : '🗑️ Delete'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Full View Modal */}
      {fullViewImage && (
        <>
          {console.log('[Modal Render] Modal is being rendered for:', fullViewImage.auto_no)}
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex items-center justify-center p-4"
            onClick={() => {
              console.log('[Modal] Closing modal by clicking overlay');
              setFullViewImage(null);
              setImageLoadFailed(false);
            }}
          >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-4xl max-h-[90vh] flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Top Right */}
            <button
              onClick={() => {
                console.log('[Modal] Close button clicked');
                setFullViewImage(null);
                setImageLoadFailed(false);
              }}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center z-10"
              title="Close (ESC)"
            >
              ✕
            </button>

            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">{fullViewImage.auto_no} - Image Preview</h2>
            </div>

            {/* Image / Error State */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-gray-100">
              {!imageLoadFailed ? (
                <img
                  src={getFullImageUrl(fullViewImage.image_url)}
                  alt={fullViewImage.auto_no}
                  className="max-h-full max-w-full object-contain"
                  onLoad={() => {
                    console.log('[Modal] Image loaded successfully:', {
                      auto: fullViewImage.auto_no,
                      image_url: fullViewImage.image_url,
                      fullUrl: getFullImageUrl(fullViewImage.image_url),
                      BASE_URL
                    });
                  }}
                  onError={(e) => {
                    const fullUrl = getFullImageUrl(fullViewImage.image_url);
                    console.error('[Modal] Image failed to load:', {
                      auto: fullViewImage.auto_no,
                      image_url: fullViewImage.image_url,
                      fullUrl: fullUrl,
                      BACKEND_BASE_URL,
                      error: e.type,
                      status: e.target?.status,
                      statusText: e.target?.statusText
                    });
                    setImageLoadFailed(true);
                  }}
                />
              ) : (
                <div className="bg-white rounded-lg p-8 text-center max-w-md">
                  <div className="text-5xl mb-4">⚠️</div>
                  <h3 className="text-xl font-bold text-red-600 mb-2">Image Not Found</h3>
                  <p className="text-gray-600 mb-4">The image file is missing or has been deleted from the server.</p>
                  <p className="text-sm text-gray-500 mb-6 break-all">{fullViewImage.image_url}</p>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700 mb-3">What you can do:</p>
                    <button
                      onClick={() => {
                        setFullViewImage(null);
                        setImageLoadFailed(false);
                        // Trigger upload for this auto
                        setTimeout(() => {
                          fileInputRefs.current[fullViewImage.id]?.click();
                        }, 100);
                      }}
                      className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition"
                    >
                      📤 Re-upload Image
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Delete this broken image entry from the database?')) {
                          await handleDeleteImage(fullViewImage.id, fullViewImage.auto_no);
                          setFullViewImage(null);
                          setImageLoadFailed(false);
                        }
                      }}
                      className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition"
                    >
                      🗑️ Delete Entry
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {fullViewImage.image_upload_date && (
              <div className="border-t p-4 text-sm text-gray-600 bg-gray-50">
                <p>📅 Uploaded: {new Date(fullViewImage.image_upload_date).toLocaleDateString('en-IN')}</p>
                <p>📆 Week {fullViewImage.image_week_number}/{fullViewImage.image_year}</p>
              </div>
            )}
          </div>
          </div>
        </>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-semibold mb-2">📋 How it works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>MISSING Section:</strong> Upload new image or it will auto-delete after Tuesday deadline</li>
          <li><strong>BUFFER Section:</strong> Previous week image still visible. Upload new one to replace (Sun-Tue window)</li>
          <li><strong>UPLOADED Section:</strong> Current week image. Valid until next Sunday when it moves to buffer</li>
          <li>System automatically manages section transitions on Sunday midnight and Tuesday 23:59</li>
        </ul>
      </div>
    </div>
  );
};

export default AutoImageManagement;
