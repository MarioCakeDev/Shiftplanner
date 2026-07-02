import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type { ShiftTemplate } from "../lib/api";

export function useTemplates() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.templates.list().then(setTemplates).catch(console.error).finally(() => setLoading(false));
  }, []);

  const create = useCallback(async (data: { title: string; startTime: string; endTime: string; color: string }) => {
    const created = await api.templates.create(data);
    setTemplates(prev => [...prev, created]);
    return created;
  }, []);

  const update = useCallback(async (id: string, data: { title: string; startTime: string; endTime: string; color: string }) => {
    const updated = await api.templates.update(id, data);
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await api.templates.delete(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  return { templates, loading, create, update, remove };
}
