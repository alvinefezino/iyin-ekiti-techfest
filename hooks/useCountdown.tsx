"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type Remaining = { days: number; hours: number; minutes: number; seconds: number; done: boolean };

const calc = (target: number): Remaining => {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: diff === 0,
  };
};

const DateCtx = createContext<string>("");
const Ctx = createContext<Remaining>({ days: 0, hours: 0, minutes: 0, seconds: 0, done: false });

export function CountdownProvider({ date, children }: { date: string; children: React.ReactNode }) {
  const target = new Date(date).getTime();
  const [r, setR] = useState<Remaining>(() => calc(target));
  useEffect(() => {
    setR(calc(target));
    const t = setInterval(() => setR(calc(target)), 1000);
    return () => clearInterval(t);
  }, [target]);
  return (
    <DateCtx.Provider value={date}>
      <Ctx.Provider value={r}>{children}</Ctx.Provider>
    </DateCtx.Provider>
  );
}

export const useCountdown = () => useContext(Ctx);
export const useEventDate = () => useContext(DateCtx);
export const pad = (n: number) => String(n).padStart(2, "0");
