import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string | null;
  altText?: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  imageUrl,
  altText = 'Evidence Photo',
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (imageUrl) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-[90vh] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 bg-slate-900/80 text-white hover:bg-slate-800 rounded-full transition focus:outline-none"
          aria-label="Close enlarged image"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-black/40">
          <img
            src={imageUrl}
            alt={altText}
            className="max-w-full max-h-[82vh] object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
