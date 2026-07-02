import type { ShiftTemplate, Shift, BatchRequest, BatchResponse, UserInfo, CreateTemplateInput, UpdateShiftInput } from "../../../shared/types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "request failed");
  }
  return res.json();
}

export const api = {
  templates: {
    list: () => request<ShiftTemplate[]>("/api/templates"),
    create: (data: CreateTemplateInput) =>
      request<ShiftTemplate>("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    update: (id: string, data: CreateTemplateInput) =>
      request<ShiftTemplate>(`/api/templates/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/templates/${id}`, { method: "DELETE" }),
  },
  shifts: {
    list: (month?: string) => request<Shift[]>(`/api/shifts${month ? `?month=${month}` : ""}`),
    batch: (data: BatchRequest) =>
      request<BatchResponse>("/api/shifts/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    update: (id: string, data: UpdateShiftInput) =>
      request<Shift>(`/api/shifts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/shifts/${id}`, { method: "DELETE" }),
  },
  user: {
    me: () => request<UserInfo>("/api/user/me"),
    regenerateIcalToken: () => request<{ icalUrl: string }>("/api/user/regenerate-ical-token", { method: "POST" }),
  },
};

export type { ShiftTemplate, Shift, BatchRequest, BatchResponse, UserInfo };
