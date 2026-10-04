import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export interface NativePosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export const nativeService = {
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  getPlatform(): string {
    return Capacitor.getPlatform();
  },

  async initNativeApp(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Set status bar style to dark text/icons or light content
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    } catch (err) {
      console.warn('[CivicFix Native] StatusBar init warning:', err);
    }

    try {
      // Hide native splash screen smoothly
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch (err) {
      console.warn('[CivicFix Native] SplashScreen init warning:', err);
    }
  },

  async getCurrentLocation(): Promise<NativePosition> {
    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await Geolocation.checkPermissions();
        if (permission.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') {
            throw new Error('Location permission denied on device.');
          }
        }

        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        });

        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
      } catch (err: any) {
        console.warn('[CivicFix Native] Native Geolocation error, trying web fallback:', err);
      }
    }

    // Web Fallback
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation is not supported by your browser.'));
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let msg = 'Failed to retrieve location.';
          if (error.code === error.PERMISSION_DENIED) msg = 'Location permission denied.';
          else if (error.code === error.POSITION_UNAVAILABLE) msg = 'GPS position unavailable.';
          else if (error.code === error.TIMEOUT) msg = 'Location request timed out.';
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    });
  },

  async capturePhoto(): Promise<{ file?: File; dataUrl?: string; error?: string }> {
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await Camera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt, // Allows citizen to pick Camera or Photos
        });

        if (photo.dataUrl) {
          // Convert DataURL to File object for Supabase Storage uploads
          const res = await fetch(photo.dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `evidence-${Date.now()}.${photo.format || 'jpg'}`, {
            type: `image/${photo.format || 'jpeg'}`,
          });

          return { file, dataUrl: photo.dataUrl };
        }
      } catch (err: any) {
        if (err?.message?.includes('cancelled') || err?.message?.includes('dismissed')) {
          return { error: 'Photo selection cancelled' };
        }
        console.warn('[CivicFix Native] Camera error, falling back to web file input:', err);
      }
    }

    return { error: 'Native camera unavailable or cancelled' };
  },

  async triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        if (type === 'success') {
          await Haptics.notification({ type: NotificationType.Success });
        } else if (type === 'warning') {
          await Haptics.notification({ type: NotificationType.Warning });
        } else if (type === 'error') {
          await Haptics.notification({ type: NotificationType.Error });
        } else if (type === 'medium') {
          await Haptics.impact({ style: ImpactStyle.Medium });
        } else if (type === 'heavy') {
          await Haptics.impact({ style: ImpactStyle.Heavy });
        } else {
          await Haptics.impact({ style: ImpactStyle.Light });
        }
      } else if (navigator.vibrate) {
        const patterns: Record<string, number | number[]> = {
          light: 10,
          medium: 20,
          heavy: 35,
          success: [15, 30, 15],
          warning: [25, 40, 25],
          error: [40, 40, 40],
        };
        navigator.vibrate(patterns[type] || 10);
      }
    } catch {
      // Non-blocking silent fallback
    }
  },
};
