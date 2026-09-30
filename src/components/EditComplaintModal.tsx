import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Camera, 
  MapPin, 
  Loader2, 
  AlertCircle, 
  Save, 
  Navigation
} from 'lucide-react';
import { COMPLAINT_CATEGORIES } from '../utils/constants';
import { LocationPickerMap } from './LocationPickerMap';
import { reverseGeocode } from '../services/geocoding';
import { compressImage } from '../utils/imageCompressor';
import { storageService } from '../services/storage';
import { complaintsService } from '../services/complaints';
import { useAuth } from '../hooks/useAuth';
import type { Complaint, ComplaintCategory } from '../types';

interface EditComplaintModalProps {
  isOpen: boolean;
  complaint: Complaint;
  onClose: () => void;
  onSaved: (updatedComplaint: Complaint) => void;
}

export const EditComplaintModal: React.FC<EditComplaintModalProps> = ({
  isOpen,
  complaint,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();

  const [category, setCategory] = useState<ComplaintCategory>(complaint.category);
  const [description, setDescription] = useState(complaint.description);
  const [latitude, setLatitude] = useState(complaint.latitude);
  const [longitude, setLongitude] = useState(complaint.longitude);
  const [address, setAddress] = useState(complaint.address || '');

  // Photo
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(complaint.photo_url);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(complaint.photo_url);

  // States
  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(complaint.category);
      setDescription(complaint.description);
      setLatitude(complaint.latitude);
      setLongitude(complaint.longitude);
      setAddress(complaint.address || '');
      setCurrentPhotoUrl(complaint.photo_url);
      setPhotoPreview(complaint.photo_url);
      setNewPhotoFile(null);
      setErrorMsg(null);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, complaint]);

  const fetchAddress = useCallback(async (lat: number, lng: number) => {
    if (geocodeAbortRef.current) geocodeAbortRef.current.abort();
    geocodeAbortRef.current = new AbortController();

    setIsGeocoding(true);
    try {
      const result = await reverseGeocode(lat, lng, geocodeAbortRef.current.signal);
      setAddress(result.address);
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const handleLocationChange = (coords: { lat: number; lng: number }) => {
    setLatitude(coords.lat);
    setLongitude(coords.lng);
    fetchAddress(coords.lat, coords.lng);
  };

  const handleGetGPSLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setIsLocating(false);
        fetchAddress(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file.');
      return;
    }

    try {
      const compressed = await compressImage(file);
      setNewPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch {
      setErrorMsg('Failed to process image preview.');
    }
  };

  const handleRemovePhoto = () => {
    setNewPhotoFile(null);
    setCurrentPhotoUrl(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);

    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 10) {
      setErrorMsg('Description must be at least 10 characters.');
      return;
    }

    setIsSaving(true);

    try {
      let finalPhotoUrl = currentPhotoUrl;

      // If citizen selected a new photo
      if (newPhotoFile) {
        const { url, error: uploadError } = await storageService.uploadComplaintImage(
          newPhotoFile,
          user.id
        );
        if (uploadError || !url) {
          setIsSaving(false);
          setErrorMsg('Failed to upload replacement photo.');
          return;
        }
        finalPhotoUrl = url;
      }

      // Update complaint in Supabase
      const { data: updated, error: updateError } = await complaintsService.updateComplaint(
        complaint.id,
        user.id,
        {
          category,
          description: trimmedDesc,
          latitude,
          longitude,
          address: address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          photo_url: finalPhotoUrl,
        }
      );

      setIsSaving(false);

      if (updateError || !updated) {
        setErrorMsg(updateError?.message || 'Failed to update complaint. You can only edit unresolved complaints.');
        return;
      }

      onSaved(updated);
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      setErrorMsg(err?.message || 'Unexpected error updating complaint.');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
      onClick={() => !isSaving && onClose()}
    >
      <div 
        className="relative max-w-2xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 my-8 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Grievance Report</h2>
            <p className="text-xs text-slate-500">Update issue details, photo, or map location</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {COMPLAINT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Description <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {description.trim().length}/10 min chars
              </span>
            </div>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
          </div>

          {/* Photo */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Photo Evidence
            </label>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-36">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-rose-600 transition text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer bg-slate-50/50 flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-slate-700">Attach new photo</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          {/* Location Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Location Pin
              </label>
              <button
                type="button"
                onClick={handleGetGPSLocation}
                disabled={isLocating}
                className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
              >
                {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                Use Current GPS
              </button>
            </div>
            <LocationPickerMap
              latitude={latitude}
              longitude={longitude}
              onLocationChange={handleLocationChange}
              className="h-48"
            />
            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-rose-500 inline mr-1" />
              {isGeocoding ? 'Resolving address...' : address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving Changes...' : 'Save Updates'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
