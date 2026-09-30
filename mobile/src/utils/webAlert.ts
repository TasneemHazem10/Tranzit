import { Alert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export function setupWebAlerts() {
  if (Platform.OS !== 'web') return;

  (Alert as unknown as { alert: unknown }).alert = (
    title?: string,
    message?: string,
    buttons?: AlertButton[]
  ) => {
    const text = `${title ?? ''}\n\n${message ?? ''}`.replace(/^\n\n|\n\n$/g, '').trim();
    const destructive = buttons?.find((b) => b.style === 'destructive');
    const hasCancel = !!buttons?.find((b) => b.style === 'cancel');

    if (destructive && hasCancel) {
      if (window.confirm(text || title || '')) destructive.onPress?.();
    } else {
      window.alert(text || title || '');
    }
  };
}