import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { autoPortalService } from '../services/api';
import { Card, Button, ErrorAlert, SuccessAlert, LoadingSpinner } from '../components/UI';
import { getFullImageUrl } from '../config/url';

export default function UploadPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [auto, setAuto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'camera'

  useEffect(() => {
    const autoId = localStorage.getItem('auto_id');
    const autoNo = localStorage.getItem('auto_no');
    const driverName = localStorage.getItem('driver_name');
    const imageUrl = localStorage.getItem('image_url');
    const imageUploadDate = localStorage.getItem('image_upload_date');

    if (!autoId) {
      navigate('/');
      return;
    }

    // Set auto data from localStorage (includes cached image data)
    const autoData = {
      id: autoId,
      auto_no: autoNo,
      owner_name: driverName,
      image_url: imageUrl || null,
      image_upload_date: imageUploadDate || null,
    };
    
    console.log('[UPLOAD] Initial auto data from localStorage:', autoData);
    setAuto(autoData);

    // Fetch auto details to refresh image data from server
    // But only do this after a small delay to ensure state is set
    const timer = setTimeout(() => {
      fetchAutoDetails(autoId);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  const fetchAutoDetails = async (autoId) => {
    try {
      setLoading(true);
      const response = await autoPortalService.getAuto(autoId);
      console.log('[FETCH] Auto details response:', response.data);
      
      if (response.data) {
        const autoData = response.data;
        setAuto(prev => ({
          ...prev,
          ...autoData,
        }));
        
        // Update localStorage with fresh image data from server
        if (autoData.image_url) {
          console.log('[FETCH] Updating localStorage with fresh image data');
          localStorage.setItem('image_url', autoData.image_url);
          localStorage.setItem('image_upload_date', autoData.image_upload_date || '');
        }
      }
    } catch (err) {
      console.error('[UPLOAD] Error fetching auto details:', err);
      // Not critical - continue with cached data from localStorage
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Only JPEG, PNG, and WebP images are allowed');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      setError('');

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      console.log(`📤 [Auto Portal Upload] Starting upload for auto ${auto.id}`);
      console.log(`   File: ${selectedFile.name}, Size: ${(selectedFile.size / 1024).toFixed(2)}KB`);
      
      const response = await autoPortalService.uploadImage(auto.id, selectedFile);
      
      console.log(`✓ [Auto Portal Upload] Response received:`, response);
      console.log(`   Response keys: ${Object.keys(response.data).join(', ')}`);
      console.log(`   image_url: ${response.data?.image_url}`);
      console.log(`   image_upload_date: ${response.data?.image_upload_date}`);

      setSuccess('Image uploaded successfully! It will appear in the admin panel and image management.');
      
      // Update auto object with new image
      if (response.data?.image_url) {
        console.log(`✓ [Auto Portal Upload] Updating state with new image URL`);
        setAuto(prev => ({
          ...prev,
          image_url: response.data.image_url,
          image_upload_date: response.data.image_upload_date,
        }));
        // Persist to localStorage so it stays on re-login
        localStorage.setItem('image_url', response.data.image_url);
        localStorage.setItem('image_upload_date', response.data.image_upload_date || '');
      } else {
        console.warn(`⚠️  [Auto Portal Upload] No image_url in response!`);
      }

      // Reset file selection
      setSelectedFile(null);
      setImagePreview(null);

      // Reset form input if it exists
      const fileInput = document.getElementById('fileInput');
      if (fileInput) {
        fileInput.value = '';
      }

      // Auto-refresh after 2 seconds
      console.log(`⏳ [Auto Portal Upload] Waiting 2s before refresh...`);
      setTimeout(() => {
        console.log(`🔄 [Auto Portal Upload] Refreshing auto details...`);
        fetchAutoDetails(auto.id);
      }, 2000);
    } catch (err) {
      console.error(`❌ [Auto Portal Upload] Error:`, err);
      console.error(`   Error message: ${err.message}`);
      console.error(`   Error response:`, err.response?.data);
      const errorMessage = err.response?.data?.error || err.message || 'Upload failed';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auto_auth_token');
    localStorage.removeItem('auto_id');
    localStorage.removeItem('auto_no');
    localStorage.removeItem('driver_name');
    
    // Stop camera if running
    if (cameraActive && videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    
    navigate('/');
  };

  const startCamera = async () => {
    try {
      setError('');
      console.log('[CAMERA] Requesting camera access...');
      
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[CAMERA] Stream obtained:', stream);
      console.log('[CAMERA] Video tracks:', stream.getVideoTracks().length);
      
      // First, show the modal so video element renders in DOM
      setCameraActive(true);
      
      // Then attach stream to video element (use a small delay to ensure DOM is updated)
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const video = videoRef.current;
      if (!video) {
        console.error('[CAMERA] Video ref is null after modal shown');
        setError('Video element not found');
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      video.srcObject = stream;
      console.log('[CAMERA] Stream attached to video element');
      
      // Wait for video to be ready
      video.onloadedmetadata = () => {
        console.log('[CAMERA] Metadata loaded, video dimensions:', video.videoWidth, 'x', video.videoHeight);
        video.play().then(() => {
          console.log('[CAMERA] ✓ Video playing successfully');
        }).catch(err => {
          console.error('[CAMERA] Play error:', err);
          setError('Could not start video playback');
        });
      };
      
      // Fallback in case onloadedmetadata doesn't fire
      setTimeout(() => {
        if (video.readyState >= 2 && !video.playing) {
          console.log('[CAMERA] Timeout - forcing play');
          video.play().catch(err => console.error('[CAMERA] Forced play error:', err));
        }
      }, 1000);
      
    } catch (err) {
      console.error('[CAMERA] Error:', err);
      console.error('[CAMERA] Error name:', err.name);
      console.error('[CAMERA] Error message:', err.message);
      
      setCameraActive(false);
      
      if (err.name === 'NotAllowedError') {
        setError('❌ Camera permission denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('❌ No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('❌ Camera is in use by another application.');
      } else {
        setError('❌ Error: ' + err.message);
      }
    }
  };

  const stopCamera = () => {
    console.log('[CAMERA] Stopping camera...');
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      console.log('[CAMERA] Stopping', tracks.length, 'tracks');
      tracks.forEach(track => {
        console.log('[CAMERA] Stopping track:', track.kind);
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    console.log('[CAMERA] Camera stopped');
  };

  const capturePhoto = async () => {
    try {
      console.log('[CAPTURE] Starting capture...');
      if (canvasRef.current && videoRef.current) {
        const context = canvasRef.current.getContext('2d');
        const video = videoRef.current;
        
        // Set canvas size to video dimensions
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
        
        console.log('[CAPTURE] Canvas size:', canvasRef.current.width, 'x', canvasRef.current.height);
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0);
        
        // Get image data
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.95);
        console.log('[CAPTURE] Image data created');
        
        // Convert to blob
        canvasRef.current.toBlob((blob) => {
          console.log('[CAPTURE] Blob created:', blob.size, 'bytes');
          
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setSelectedFile(file);
          setImagePreview(imageData);
          
          console.log('[CAPTURE] Preview set, closing camera');
          
          // Stop camera
          stopCamera();
          setUploadMode('preview');
          setError('');
        }, 'image/jpeg', 0.95);
      }
    } catch (err) {
      console.error('[CAPTURE] Error:', err);
      setError('Failed to capture photo: ' + err.message);
    }
  };

  const switchMode = (mode) => {
    console.log('[SWITCH-MODE] Switching to mode:', mode);
    setUploadMode(mode);
    if (mode === 'camera') {
      console.log('[SWITCH-MODE] Starting camera...');
      startCamera();
    } else if (mode === 'file') {
      console.log('[SWITCH-MODE] Stopping camera...');
      stopCamera();
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setUploadMode('file');
    stopCamera();
    document.getElementById('fileInput').value = '';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 p-4">
      {/* Video and Canvas Elements - Always Rendered */}
      <video
        ref={videoRef}
        autoPlay={true}
        playsInline={true}
        muted={true}
        style={{ 
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 40,
          display: cameraActive && uploadMode === 'camera' ? 'block' : 'none',
          objectFit: 'cover'
        }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">🚕 Auto Portal</h1>
            <p className="text-blue-100">Upload Advertisement Image</p>
          </div>
          <Button variant="danger" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Auto Info Card */}
        <Card className="mb-6 p-6 border-l-4 border-blue-600">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 font-semibold">Driver Name</p>
              <p className="text-lg font-bold text-gray-900">{auto?.owner_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold">Auto Number</p>
              <p className="text-lg font-bold text-gray-900">{auto?.auto_no || 'N/A'}</p>
            </div>
          </div>
        </Card>

        {/* Upload Section */}
        <Card className="p-8">
          {/* Show after successful upload OR if image already exists */}
          {success || auto?.image_url ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">✅ Image Uploaded Successfully!</h2>
              
              {success && (
                <div className="mb-6">
                  <SuccessAlert message={success} />
                </div>
              )}

              {/* Current Image Display */}
              {auto?.image_url && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📸 Your Latest Upload</h3>
                  <div className="bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={`${getFullImageUrl(auto.image_url)}?t=${Date.now()}`}
                      alt="Uploaded advertisement"
                      className="w-full max-h-96 object-contain"
                    />
                  </div>
                  {auto.image_upload_date && (
                    <p className="text-sm text-gray-600 mt-3">
                      ⏰ Uploaded on: {new Date(auto.image_upload_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* Post-Upload Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => switchMode('camera')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                >
                  📸 Retake Photo
                </Button>
                <Button
                  onClick={() => switchMode('file')}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
                >
                  📁 Replace Image
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📤 Upload New Advertisement</h2>

              {error && (
                <div className="mb-6">
                  <ErrorAlert message={error} />
                </div>
              )}

              {/* Mode Selection */}
              {!imagePreview && (
                <div className="mb-6 flex gap-3">
                  <Button
                    onClick={() => switchMode('file')}
                    className={`flex-1 ${uploadMode === 'file' ? 'bg-blue-600' : 'bg-gray-400'} hover:opacity-90`}
                  >
                    📁 Choose File
                  </Button>
                  <Button
                    onClick={() => switchMode('camera')}
                    className={`flex-1 ${uploadMode === 'camera' ? 'bg-blue-600' : 'bg-gray-400'} hover:opacity-90`}
                  >
                    📸 Take Photo
                  </Button>
                </div>
              )}

              {/* Camera View Modal */}
              {cameraActive && uploadMode === 'camera' && (
                <div className="fixed inset-0 bg-black bg-opacity-0 z-50 flex flex-col items-center justify-center p-4">
                  {/* Video is displayed full-screen behind this modal */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: 'none' }}>
                    <h2 className="text-white text-2xl font-bold drop-shadow-lg">📸 Camera Feed</h2>
                    <p className="text-center text-white text-lg mt-4 drop-shadow-lg">Position yourself and your auto in the frame</p>
                  </div>
                  
                  {/* Controls overlay - clickable */}
                  <div className="absolute bottom-8 left-0 right-0 flex gap-4 justify-center px-4" style={{ pointerEvents: 'auto' }}>
                    <Button
                      onClick={capturePhoto}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 text-lg rounded-lg"
                    >
                      ✓ CAPTURE PHOTO
                    </Button>
                    <Button
                      onClick={stopCamera}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 text-lg rounded-lg"
                    >
                      ✕ CANCEL
                    </Button>
                  </div>
                </div>
              )}

              {/* File Preview */}
              {imagePreview && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Preview</p>
                  <div className="bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-h-64 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* File Input */}
              {uploadMode === 'file' && !imagePreview && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    📁 Select Image (JPEG, PNG, WebP - Max 5MB)
                  </label>
                  <input
                    id="fileInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
              )}

              {/* Upload/Reset Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                >
                  {uploading ? '⏳ Uploading...' : '📤 Upload Image'}
                </Button>
                {imagePreview && (
                  <Button
                    onClick={resetUpload}
                    disabled={uploading}
                    variant="danger"
                    className="flex-1"
                  >
                    Change
                  </Button>
                )}
              </div>

              <p className="text-sm text-gray-600 mt-4 text-center">
                💡 Your image will appear in the admin panel's Image Management section and Auto Details page
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
