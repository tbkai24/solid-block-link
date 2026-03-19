import { useCallback, useEffect, useState } from "react";

export type AdminAlertTone = "success" | "warning" | "danger";

export function useAdminAlert() {
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<AdminAlertTone>("warning");

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const showAlert = useCallback((nextTone: AdminAlertTone, nextMessage: string) => {
    setTone(nextTone);
    setMessage(nextMessage);
  }, []);

  return { message, tone, showAlert };
}
