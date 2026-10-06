import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  X,
  Check,
  RotateCcw,
  Upload,
  Zap,
  ZapOff,
  VideoOff,
} from 'lucide-react';
import { nativeService } from '../services/nativeService';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
  onBrowseFiles?: () => void;
  title?: string;
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onBrowseFiles,
  title = 'Take Photo Evidence',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashEffect, setIsFlashEffect] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [supportsTorch, setSupportsTorch] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);

  // Stop camera tracks helper
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Play subtle shutter sound using Web Audio API
  const playShutterSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio playback non-blocking
    }
  };

  // Start Camera stream
  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      stopStream();
      setIsLoading(true);
      setCameraError(null);
      setIsTorchOn(false);
      setSupportsTorch(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported by your browser.');
        setIsLoading(false);
        return;
      }

      try {
        // Enumerate video devices
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevs = devices.filter((d) => d.kind === 'videoinput');
          setAvailableDevices(videoDevs);
        } catch {
          // Non-blocking device list
        }

        // Try primary constraints
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: mode,
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch {
          // Fallback to basic video without facingMode constraint
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Check torch support
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = (track.getCapabilities?.() as { torch?: boolean }) || {};
          if (capabilities.torch) {
            setSupportsTorch(true);
          }
        }

        setIsLoading(false);
      } catch (err: unknown) {
        const error = err as { name?: string; message?: string };
        setIsLoading(false);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setCameraError('Camera permission was denied. Please allow camera permissions in your browser address bar.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setCameraError('No camera found on your device.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          setCameraError('Camera is currently in use by another application.');
        } else {
          setCameraError(error.message || 'Unable to access camera.');
        }
      }
    },
    [stopStream]
  );

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newTorchState = !isTorchOn;
      await (track as unknown as { applyConstraints: (c: { advanced: Array<{ torch: boolean }> }) => Promise<void> }).applyConstraints({
        advanced: [{ torch: newTorchState }],
      });
      setIsTorchOn(newTorchState);
      nativeService.triggerHaptic('light');
    } catch {
      // Torch not supported or failed
    }
  };

  // Flip Facing Mode
  const handleFlipCamera = () => {
    nativeService.triggerHaptic('medium');
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  // Capture Snapshot
  const handleCapture = () => {
    if (!videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if front-facing camera
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Visual & Haptic feedback
    setIsFlashEffect(true);
    playShutterSound();
    nativeService.triggerHaptic('heavy');
    setTimeout(() => setIsFlashEffect(false), 200);

    // Convert to DataURL and File
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const file = new File([blob], `evidence-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        setCapturedDataUrl(dataUrl);
        setCapturedFile(file);
      },
      'image/jpeg',
      0.9
    );
  };

  // Retake photo
  const handleRetake = () => {
    nativeService.triggerHaptic('light');
    setCapturedDataUrl(null);
    setCapturedFile(null);
    startCamera(facingMode);
  };

  // Accept and submit photo
  const handleConfirmPhoto = () => {
    if (capturedFile && capturedDataUrl) {
      nativeService.triggerHaptic('success');
      onCapture(capturedFile, capturedDataUrl);
      handleClose();
    }
  };

  // Close modal and cleanup
  const handleClose = useCallback(() => {
    stopStream();
    setCapturedDataUrl(null);
    setCapturedFile(null);
    setCameraError(null);
    onClose();
  }, [stopStream, onClose]);

  // Handle modal lifecycle
  useEffect(() => {
    if (isOpen) {
      setCapturedDataUrl(null);
      setCapturedFile(null);
      startCamera(facingMode);
      document.body.style.overflow = 'hidden';
    } else {
      stopStream();
      document.body.style.overflow = '';
    }

    return () => {
      stopStream();
      document.body.style.overflow = '';
    };
  }, [isOpen, startCamera, facingMode, stopStream]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Flash simulation overlay */}
      {isFlashEffect && (
        <div className="absolute inset-0 bg-white z-[60] pointer-events-none transition-opacity duration-150 opacity-90 animate-out fade-out" />
      )}

      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-xl bg-slate-950 text-white rounded-none sm:rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">{title}</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                {capturedDataUrl ? (
                  <span className="text-emerald-400 font-semibold">Photo captured • Review</span>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Viewfinder</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Torch Toggle */}
            {supportsTorch && !capturedDataUrl && !cameraError && (
              <button
                type="button"
                onClick={toggleTorch}
                aria-label="Toggle Flashlight"
                className={`p-2 rounded-xl transition cursor-pointer ${
                  isTorchOn ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close Camera"
              className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div className="relative flex-1 min-h-[350px] sm:min-h-[420px] bg-black flex items-center justify-center overflow-hidden">
          {/* Captured Preview Mode */}
          {capturedDataUrl ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedDataUrl}
                alt="Captured civic issue evidence"
                className="w-full h-full object-contain max-h-[60vh]"
              />
              <div className="absolute top-3 left-3 px-3 py-1 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-full text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Photo Ready
              </div>
            </div>
          ) : cameraError ? (
            /* Error Fallback */
            <div className="p-6 sm:p-8 text-center max-w-sm space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <VideoOff className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white">Camera Unavailable</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </button>
                {onBrowseFiles && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onBrowseFiles();
                    }}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload from Device Files</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Active Live Video Feed */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover sm:object-contain ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Viewfinder Reticle & Guides */}
              <div className="absolute inset-6 sm:inset-10 border-2 border-white/30 rounded-2xl pointer-events-none transition-all flex flex-col justify-between p-3">
                {/* Corner Markers */}
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-white" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-white" />
                </div>
                {/* Center crosshair */}
                <div className="self-center w-6 h-6 border border-dashed border-white/40 rounded-full" />
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-white" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-white" />
                </div>
              </div>

              {/* Loading spinner */}
              {isLoading && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-300 font-medium">Initializing camera...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 z-20">
          {capturedDataUrl ? (
            /* Review Actions */
            <div className="w-full flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmPhoto}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Use Photo</span>
              </button>
            </div>
          ) : (
            /* Capture Controls */
            <div className="w-full flex items-center justify-between">
              {/* Secondary action: Browse Files */}
              <div className="w-12 flex justify-start">
                {onBrowseFiles && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onBrowseFiles();
                    }}
                    title="Choose from gallery or files"
                    className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl transition cursor-pointer"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Shutter Button */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={isLoading || !!cameraError}
                  aria-label="Capture Photo"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white hover:bg-slate-100 active:scale-90 p-1.5 shadow-xl transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer group"
                >
                  <div className="w-full h-full rounded-full border-2 border-slate-900 group-hover:scale-95 transition-transform bg-white" />
                </button>
              </div>

              {/* Flip camera switch */}
              <div className="w-12 flex justify-end">
                {availableDevices.length > 1 || !cameraError ? (
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    disabled={isLoading || !!cameraError}
                    title="Switch camera"
                    aria-label="Switch Camera Facing"
                    className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl transition active:scale-95 cursor-pointer disabled:opacity-40"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
