// Audio and OS Desktop Notification Service for LeadPilot

class NotificationService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private desktopEnabled: boolean = true;

  constructor() {
    // Check saved preferences
    const savedSound = localStorage.getItem('leadpilot_sound_enabled');
    if (savedSound !== null) {
      this.soundEnabled = savedSound === 'true';
    }

    const savedDesktop = localStorage.getItem('leadpilot_desktop_notifications');
    if (savedDesktop !== null) {
      this.desktopEnabled = savedDesktop === 'true';
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    localStorage.setItem('leadpilot_sound_enabled', String(enabled));
  }

  public isDesktopEnabled(): boolean {
    return this.desktopEnabled;
  }

  public setDesktopEnabled(enabled: boolean): void {
    this.desktopEnabled = enabled;
    localStorage.setItem('leadpilot_desktop_notifications', String(enabled));
    if (enabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  public requestPermission(): Promise<NotificationPermission> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.requestPermission();
    }
    return Promise.resolve('denied' as NotificationPermission);
  }

  /**
   * Play a pleasant harmonic double chime using Web Audio API
   */
  public playInboundChime(): void {
    if (!this.soundEnabled || typeof window === 'undefined') return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Note 1: E6 (1318.5 Hz)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.5, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: B6 (1975.5 Hz) - higher harmony after 100ms
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1975.5, now + 0.1);
      gain2.gain.setValueAtTime(0.06, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.5);
    } catch (err) {
      // Graceful fallback if audio context fails
      console.debug('Notification audio playback skipped:', err);
    }
  }

  private lastNotificationKey: string = '';
  private lastNotificationTime: number = 0;

  /**
   * Trigger Desktop OS Notification
   */
  public showDesktopNotification(title: string, body: string, onClick?: () => void): void {
    if (!this.desktopEnabled || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: body.length > 100 ? body.substring(0, 100) + '...' : body,
          icon: '/favicon.svg',
          tag: `leadpilot-inbound-${encodeURIComponent(title)}`,
          silent: true, // We already manage sound harmoniously via playInboundChime
        });

        if (onClick) {
          notif.onclick = () => {
            window.focus();
            onClick();
            notif.close();
          };
        }
      } catch (err) {
        console.debug('Desktop notification error:', err);
      }
    } else if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  /**
   * Complete inbound alert (audio + desktop toast with duplicate suppression)
   */
  public notifyInboundMessage(senderName: string, textSnippet: string, onClick?: () => void): void {
    const dedupeKey = `${senderName}:${textSnippet}`;
    const now = Date.now();
    if (dedupeKey === this.lastNotificationKey && now - this.lastNotificationTime < 3000) {
      return; // Suppress duplicate alert within 3 seconds
    }
    this.lastNotificationKey = dedupeKey;
    this.lastNotificationTime = now;

    this.playInboundChime();

    // Trigger OS notification especially if document is hidden or window is not focused
    if (typeof document !== 'undefined' && document.hidden) {
      this.showDesktopNotification(`New WhatsApp from ${senderName}`, textSnippet, onClick);
    }
  }
}

export const notifications = new NotificationService();
