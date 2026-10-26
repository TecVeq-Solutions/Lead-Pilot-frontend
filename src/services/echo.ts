import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Expose Pusher to window for Laravel Echo
if (typeof window !== 'undefined') {
  (window as any).Pusher = Pusher;
}

let echoInstance: Echo<any> | null = null;
let currentToken: string | null = null;

export const getEcho = (token?: string | null): Echo<any> | null => {
  if (typeof window === 'undefined') return null;

  // If token changed, disconnect old instance
  if (token && token !== currentToken && echoInstance) {
    try {
      echoInstance.disconnect();
    } catch (e) {
      // ignore
    }
    echoInstance = null;
  }

  if (echoInstance) {
    return echoInstance;
  }

  currentToken = token || null;

  const reverbKey = import.meta.env.VITE_REVERB_APP_KEY || 'leadpilot_key';
  const reverbHost = import.meta.env.VITE_REVERB_HOST || window.location.hostname || 'localhost';
  const reverbPort = import.meta.env.VITE_REVERB_PORT || '8080';
  const reverbScheme = import.meta.env.VITE_REVERB_SCHEME || 'http';
  const apiBase = ((import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api/v1')
    .replace(/\/api\/v1\/?$/, '');

  try {
    echoInstance = new Echo({
      broadcaster: 'reverb',
      key: reverbKey,
      wsHost: reverbHost,
      wsPort: parseInt(reverbPort, 10),
      wssPort: parseInt(reverbPort, 10),
      forceTLS: reverbScheme === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${apiBase}/api/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          Accept: 'application/json',
        },
      },
    });

    // Gracefully handle connection issues without breaking the app
    echoInstance.connector.pusher.connection.bind('error', (err: any) => {
      console.debug('WebSocket connection state:', err?.error?.data?.code || 'offline');
    });

    return echoInstance;
  } catch (err) {
    console.debug('Echo initialization skipped:', err);
    return null;
  }
};

export const leaveEchoChannel = (channelName: string): void => {
  if (echoInstance) {
    try {
      echoInstance.leave(channelName);
    } catch (e) {
      // ignore
    }
  }
};

export const disconnectEcho = (): void => {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch (e) {
      // ignore
    }
    echoInstance = null;
  }
};
