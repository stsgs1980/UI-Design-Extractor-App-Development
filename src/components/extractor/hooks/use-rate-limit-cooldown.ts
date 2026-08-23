"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const COOLDOWN_MS = 60_000;

export function useRateLimitCooldown(cooldownMs = COOLDOWN_MS) {
  const [until, setUntil] = useState(0);
  const [tick, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Tick every second while in cooldown
  useEffect(() => {
    if (until <= Date.now()) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [until, tick]);

  const isCooldown = until > Date.now();
  const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));

  const triggerCooldown = useCallback(() => {
    setUntil(Date.now() + cooldownMs);
  }, [cooldownMs]);

  const resetCooldown = useCallback(() => setUntil(0), []);

  return { isCooldown, remaining, triggerCooldown, resetCooldown };
}
