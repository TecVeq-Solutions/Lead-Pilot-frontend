import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { getEcho } from '../../services/echo';
import { useAuthStore } from '../../stores/authStore';

export type ConnectionState = 'live' | 'reconnecting' | 'offline';

/**
 * Global Real-Time & Network Resilience Banner.
 * Observes browser online/offline events and actual Pusher/Echo WebSocket states.
 * Notifies the operator transparently when re-connection or polling fallback is active.
 */
export const ConnectionStatusBanner: React.FC = () => {
  const { token } = useAuthStore();
  const [connectionState, setConnectionState] = useState<ConnectionState>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'live'
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Browser Connectivity Event Listeners
    const handleOnline = () => {
      setConnectionState('live');
      setDismissed(false);
    };

    const handleOffline = () => {
      setConnectionState('offline');
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Echo / Pusher WebSocket Connection State Listeners
    let pusherHandler: ((states: { current: string; previous: string }) => void) | null = null;
    let echo: any = null;

    if (token) {
      echo = getEcho(token);
      const pusherConnection = echo?.connector?.pusher?.connection;

      if (pusherConnection) {
        pusherHandler = (states: { current: string; previous: string }) => {
          if (!navigator.onLine) {
            setConnectionState('offline');
            return;
          }

          switch (states.current) {
            case 'connected':
              setConnectionState('live');
              setDismissed(false);
              break;
            case 'connecting':
              setConnectionState('reconnecting');
              setDismissed(false);
              break;
            case 'unavailable':
            case 'failed':
            case 'disconnected':
              setConnectionState(navigator.onLine ? 'reconnecting' : 'offline');
              setDismissed(false);
              break;
            default:
              break;
          }
        };

        pusherConnection.bind('state_change', pusherHandler);
      }
    }

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (pusherHandler && echo?.connector?.pusher?.connection) {
        try {
          echo.connector.pusher.connection.unbind('state_change', pusherHandler);
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, [token]);

  // Don't render banner if fully live or temporarily dismissed
  if (connectionState === 'live' || dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      className={`w-full px-6 py-2.5 text-xs font-bold transition-all duration-300 flex items-center justify-between shrink-0 z-50 ${
        connectionState === 'offline'
          ? 'bg-rose-600 text-white shadow-md'
          : 'bg-amber-500 text-slate-900 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-2.5 mx-auto">
        {connectionState === 'offline' ? (
          <>
            <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
            <span>
              You are currently offline. Check your internet connection. (Live updates will resume once reconnected).
            </span>
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-slate-900" />
            <span>
              Real-time stream reconnecting... Polling fallback active (conversations stay up to date).
            </span>
          </>
        )}
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded opacity-80 hover:opacity-100 transition-opacity"
        title="Dismiss warning for this session"
      >
        Dismiss
      </button>
    </div>
  );
};
