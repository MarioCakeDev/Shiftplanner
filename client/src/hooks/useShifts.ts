import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type { Shift, BatchRequest } from "../lib/api";

export function useShifts(month: string) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const updated = await api.shifts.list(month);
    setShifts(updated);
    return updated;
  }, [month]);

  useEffect(() => {
    setLoading(true);
    reload().catch(console.error).finally(() => setLoading(false));
  }, [reload]);

  const batch = useCallback(async (data: BatchRequest) => {
    const result = await api.shifts.batch(data);
    await reload();
    return result;
  }, [reload]);

  const remove = useCallback(async (id: string) => {
    await api.shifts.delete(id);
    setShifts(prev => prev.filter(s => s.id !== id));
  }, []);

  const update = useCallback(async (id: string, data: Partial<Pick<Shift, "title" | "color" | "startDateTime" | "endDateTime">>) => {
    const updated = await api.shifts.update(id, data);
    setShifts(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  }, []);

  return { shifts, loading, batch, reload, remove, update };
}
