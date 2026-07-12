"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type HelpDeskNotification = {
  id: string;
  ticketId?: string;
  ticketNumber?: string;
  customerName?: string;
  consumerType?: string;
  sourceChannel?: string;
  liveChatSessionId?: string;
  callbackRequestId?: string;
  title?: string;
  message?: string;
  eventType?: string;
  read?: boolean;
  createdAt?: string;
};

type HelpDeskNotificationsState = {
  visible: boolean;
  notifications: HelpDeskNotification[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: ((id: string) => void) | null;
  onMarkAllRead: (() => void) | null;
  onOpenTicket: ((n: HelpDeskNotification) => void) | null;
};

const defaultState: HelpDeskNotificationsState = {
  visible: false,
  notifications: [],
  unreadCount: 0,
  loading: false,
  onMarkRead: null,
  onMarkAllRead: null,
  onOpenTicket: null,
};

const HelpDeskNotificationsContext = createContext({
  ...defaultState,
  setHelpDeskNotifications: (_patch: Partial<HelpDeskNotificationsState>) => {},
});

export function HelpDeskNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HelpDeskNotificationsState>(defaultState);

  const setHelpDeskNotifications = useCallback((patch: Partial<HelpDeskNotificationsState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ ...state, setHelpDeskNotifications }),
    [state, setHelpDeskNotifications],
  );

  return (
    <HelpDeskNotificationsContext.Provider value={value}>
      {children}
    </HelpDeskNotificationsContext.Provider>
  );
}

export function useHelpDeskNotifications() {
  return useContext(HelpDeskNotificationsContext);
}
