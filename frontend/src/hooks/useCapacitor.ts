import { useEffect, useState } from 'react';
import { capacitorService } from '@/services/capacitor';
import { ImpactStyle } from '@capacitor/haptics';

export const useCapacitor = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [networkStatus, setNetworkStatus] = useState<any>(null);

  useEffect(() => {
    const initCapacitor = async () => {
      const mobile = capacitorService.isNativePlatform();
      setIsMobile(mobile);

      if (mobile) {
        // Initialize the app
        await capacitorService.initializeApp();

        // Get device info
        const info = await capacitorService.getDeviceInfo();
        setDeviceInfo(info);

        // Get network status
        const status = await capacitorService.getNetworkStatus();
        setNetworkStatus(status);

        // Add network listener
        await capacitorService.addNetworkListener((status) => {
          setNetworkStatus(status);
        });

        // Request push permissions and register
        const hasPermission = await capacitorService.requestPushPermissions();
        if (hasPermission) {
          await capacitorService.registerPushNotifications();
          await capacitorService.addPushListeners();
        }
      }
    };

    initCapacitor();
  }, []);

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    await capacitorService.triggerHaptic(style);
  };

  const showKeyboard = async () => {
    await capacitorService.showKeyboard();
  };

  const hideKeyboard = async () => {
    await capacitorService.hideKeyboard();
  };

  const scheduleNotification = async (notification: {
    title: string;
    body: string;
    id?: number;
    schedule?: { at: Date };
  }) => {
    await capacitorService.scheduleLocalNotification(notification);
  };

  return {
    isMobile,
    deviceInfo,
    networkStatus,
    triggerHaptic,
    showKeyboard,
    hideKeyboard,
    scheduleNotification,
  };
}; 