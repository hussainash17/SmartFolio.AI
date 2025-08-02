import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';

export class CapacitorService {
  private static instance: CapacitorService;
  private isMobile: boolean;

  private constructor() {
    this.isMobile = Capacitor.isNativePlatform();
  }

  public static getInstance(): CapacitorService {
    if (!CapacitorService.instance) {
      CapacitorService.instance = new CapacitorService();
    }
    return CapacitorService.instance;
  }

  // Check if running on mobile
  public isNativePlatform(): boolean {
    return this.isMobile;
  }

  // App lifecycle
  public async initializeApp(): Promise<void> {
    if (!this.isMobile) return;

    try {
      // Initialize status bar
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });

      // Hide splash screen after app is ready
      await SplashScreen.hide();

      // Set up app state listeners
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
      });

      App.addListener('appUrlOpen', (data) => {
        console.log('App opened with URL:', data.url);
      });

      App.addListener('appRestoredResult', (data) => {
        console.log('Restored state:', data);
      });

    } catch (error) {
      console.error('Error initializing Capacitor app:', error);
    }
  }

  // Haptic feedback
  public async triggerHaptic(style: ImpactStyle = ImpactStyle.Light): Promise<void> {
    if (!this.isMobile) return;

    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.error('Error triggering haptic feedback:', error);
    }
  }

  // Keyboard management
  public async showKeyboard(): Promise<void> {
    if (!this.isMobile) return;

    try {
      await Keyboard.show();
    } catch (error) {
      console.error('Error showing keyboard:', error);
    }
  }

  public async hideKeyboard(): Promise<void> {
    if (!this.isMobile) return;

    try {
      await Keyboard.hide();
    } catch (error) {
      console.error('Error hiding keyboard:', error);
    }
  }

  // Push notifications
  public async requestPushPermissions(): Promise<boolean> {
    if (!this.isMobile) return false;

    try {
      const result = await PushNotifications.requestPermissions();
      return result.receive === 'granted';
    } catch (error) {
      console.error('Error requesting push permissions:', error);
      return false;
    }
  }

  public async registerPushNotifications(): Promise<void> {
    if (!this.isMobile) return;

    try {
      await PushNotifications.register();
    } catch (error) {
      console.error('Error registering push notifications:', error);
    }
  }

  public async addPushListeners(): Promise<void> {
    if (!this.isMobile) return;

    try {
      // Registration success
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success:', token.value);
        // Send token to your backend
        this.sendTokenToBackend(token.value);
      });

      // Registration error
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration:', error.error);
      });

      // Push notification received
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification);
      });

      // Push notification action clicked
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed:', notification);
      });

    } catch (error) {
      console.error('Error adding push listeners:', error);
    }
  }

  // Local notifications
  public async scheduleLocalNotification(notification: {
    title: string;
    body: string;
    id?: number;
    schedule?: { at: Date };
  }): Promise<void> {
    if (!this.isMobile) return;

    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: notification.id || Date.now(),
          title: notification.title,
          body: notification.body,
          schedule: notification.schedule,
          sound: 'default',
          attachments: undefined,
          actionTypeId: '',
          extra: null
        }]
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  // Device information
  public async getDeviceInfo(): Promise<any> {
    if (!this.isMobile) return null;

    try {
      const info = await Device.getInfo();
      return info;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }

  // Network status
  public async getNetworkStatus(): Promise<any> {
    if (!this.isMobile) return null;

    try {
      const status = await Network.getStatus();
      return status;
    } catch (error) {
      console.error('Error getting network status:', error);
      return null;
    }
  }

  public async addNetworkListener(callback: (status: any) => void): Promise<void> {
    if (!this.isMobile) return;

    try {
      Network.addListener('networkStatusChange', callback);
    } catch (error) {
      console.error('Error adding network listener:', error);
    }
  }

  // Private methods
  private async sendTokenToBackend(token: string): Promise<void> {
    // TODO: Implement sending push token to your FastAPI backend
    console.log('Sending push token to backend:', token);
  }
}

// Export singleton instance
export const capacitorService = CapacitorService.getInstance(); 