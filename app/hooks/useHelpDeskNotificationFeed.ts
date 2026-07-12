"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supportApi } from "@/lib/supportApi";
import { useHelpDeskNotifications, type HelpDeskNotification } from "@/app/contexts/HelpDeskNotificationsContext";

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    /* ignore */
  }
}

export function useHelpDeskNotificationFeed({
  enabled = false,
  visible = false,
  onOpenTicket,
}: {
  enabled?: boolean;
  visible?: boolean;
  onOpenTicket?: (n: HelpDeskNotification) => void;
}) {
  const { setHelpDeskNotifications } = useHelpDeskNotifications();
  const [notifications, setNotifications] = useState<HelpDeskNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const prevUnreadRef = useRef(0);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      const data = await supportApi.adminMarkNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      const nextUnread = Number(data?.unreadCount) || 0;
      setUnreadCount(nextUnread);
      prevUnreadRef.current = nextUnread;
    } catch {
      /* ignore */
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await supportApi.adminMarkAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setUnreadCount(0);
      prevUnreadRef.current = 0;
      return undefined;
    }

    let cancelled = false;

    const loadNotifications = (silent = false) => {
      if (!silent) setLoading(true);
      return supportApi.adminNotifications()
        .catch(() => ({ notifications: [], unreadCount: 0 }))
        .then((res) => {
          if (cancelled) return;
          const list = Array.isArray(res?.notifications) ? res.notifications : [];
          const unread = Number(res?.unreadCount) || 0;
          setNotifications(list);
          setUnreadCount(unread);
          if (silent && unread > prevUnreadRef.current) {
            playNotificationSound();
          }
          prevUnreadRef.current = unread;
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    void loadNotifications(false);
    const timer = window.setInterval(() => void loadNotifications(true), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setHelpDeskNotifications({
        visible: false,
        notifications: [],
        unreadCount: 0,
        loading: false,
        onMarkRead: null,
        onMarkAllRead: null,
        onOpenTicket: null,
      });
      return undefined;
    }

    setHelpDeskNotifications({
      visible,
      notifications,
      unreadCount,
      loading,
      onMarkRead: handleMarkRead,
      onMarkAllRead: handleMarkAllRead,
      onOpenTicket: onOpenTicket || null,
    });

    return () => {
      setHelpDeskNotifications({
        visible: false,
        notifications: [],
        unreadCount: 0,
        loading: false,
        onMarkRead: null,
        onMarkAllRead: null,
        onOpenTicket: null,
      });
    };
  }, [
    enabled,
    visible,
    notifications,
    unreadCount,
    loading,
    handleMarkRead,
    handleMarkAllRead,
    onOpenTicket,
    setHelpDeskNotifications,
  ]);

  return { notifications, unreadCount, loading, handleMarkRead, handleMarkAllRead };
}
