"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wifi, WifiOff } from "lucide-react";

/**
 * NetworkStatusHook — monitors online/offline status and notifies the user.
 * Also exposes a `useOnlineStatus` hook for components to consume.
 */
let isOnline = true;
const listeners = new Set<(online: boolean) => void>();

function notify(online: boolean) {
  isOnline = online;
  listeners.forEach((l) => l(online));
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(isOnline);
  useEffect(() => {
    const cb = (v: boolean) => setOnline(v);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return online;
}

export function NetworkStatusHook() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Initial sync
    notify(navigator.onLine);

    const handleOnline = () => {
      notify(true);
      toast.success("Back online — changes will sync", {
        icon: <Wifi size={14} />,
        duration: 3000,
      });
    };
    const handleOffline = () => {
      notify(false);
      toast.warning("You're offline — changes saved locally", {
        icon: <WifiOff size={14} />,
        duration: 5000,
      });
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return null;
}
