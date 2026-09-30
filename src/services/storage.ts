import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { STORAGE_BUCKETS } from '../utils/constants';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const storageService = {
  /**
   * Upload image to complaint-images bucket
   */
  async uploadComplaintImage(file: File, userId: string): Promise<{ url: string | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        return { url: dataUrl, error: null };
      } catch (err: any) {
        return { url: null, error: err };
      }
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.COMPLAINT_IMAGES)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        // Fallback to local DataURL so user is never blocked
        const dataUrl = await readFileAsDataUrl(file);
        return { url: dataUrl, error: null };
      }

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKETS.COMPLAINT_IMAGES)
        .getPublicUrl(fileName);

      return { url: publicUrl, error: null };
    } catch (err: any) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        return { url: dataUrl, error: null };
      } catch {
        return { url: null, error: err };
      }
    }
  },

  /**
   * Upload image to resolution-images bucket (Admin)
   */
  async uploadResolutionImage(file: File, adminId: string): Promise<{ url: string | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        return { url: dataUrl, error: null };
      } catch (err: any) {
        return { url: null, error: err };
      }
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `resolutions/${adminId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.RESOLUTION_IMAGES)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        const dataUrl = await readFileAsDataUrl(file);
        return { url: dataUrl, error: null };
      }

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKETS.RESOLUTION_IMAGES)
        .getPublicUrl(fileName);

      return { url: publicUrl, error: null };
    } catch (err: any) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        return { url: dataUrl, error: null };
      } catch {
        return { url: null, error: err };
      }
    }
  },
};
