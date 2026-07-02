import { useState, useEffect, useCallback } from "react";
import { Calendar } from "./components/Calendar";
import { Toolbar } from "./components/Toolbar";
import { ShiftSelectorPopup } from "./components/ShiftSelectorPopup";
import { useTemplates } from "./hooks/useTemplates";
import { useShifts } from "./hooks/useShifts";
import { api } from "./lib/api";
import type { UserInfo } from "./lib/api";

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [armedTemplateId, setArmedTemplateId] = useState<string | null>(null);
  const [selectorDates, setSelectorDates] = useState<string[] | null>(null);

  const { templates, create: createTemplate, update: updateTemplate, remove: removeTemplate } = useTemplates();
  const { shifts, batch, reload, remove: removeShift, update: updateShift } = useShifts(currentMonth);

  useEffect(() => {
    api.user.me().then(setUser).catch(console.error);
  }, []);

  const handleSelectShift = useCallback((dates: string[]) => {
    setSelectorDates(dates);
  }, []);

  const handleSelectorSelect = useCallback((templateId: string) => {
    if (!selectorDates) return;
    batch({ mode: "SET", templateId, dates: selectorDates });
    setArmedTemplateId(templateId);
    setSelectorDates(null);
  }, [selectorDates, batch]);

  const handleSelectorCreateAndSelect = useCallback(async (data: { title: string; startTime: string; endTime: string; color: string }) => {
    return createTemplate(data);
  }, [createTemplate]);

  const handleSelectorClose = useCallback(() => {
    setSelectorDates(null);
  }, []);

  const handleTemplateUpdated = useCallback(async (id: string, data: { title: string; startTime: string; endTime: string; color: string }) => {
    const updated = await updateTemplate(id, data);
    await reload();
    return updated;
  }, [updateTemplate, reload]);

  const handleTemplateRemoved = useCallback(async (id: string) => {
    await removeTemplate(id);
    await reload();
  }, [removeTemplate, reload]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Schichtplan</h1>
        {user && (
          <div className="text-sm text-gray-500">
            {user.name}
            <button
              onClick={() => navigator.clipboard.writeText(user.icalUrl.endsWith(".ics") ? user.icalUrl : `${user.icalUrl}.ics`)}
              className="ml-3 text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              Copy iCal URL
            </button>
            <button
              onClick={() => (window.location.href = "/api/auth/login")}
              className="ml-3 text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={() => (window.location.href = "/api/auth/logout")}
              className="ml-3 text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      <Toolbar
        templates={templates}
        armedTemplateId={armedTemplateId}
        onArm={setArmedTemplateId}
        onCreateTemplate={createTemplate}
        onUpdateTemplate={handleTemplateUpdated}
        onDeleteTemplate={handleTemplateRemoved}
      />

      <div className="flex-1 p-4">
        <Calendar
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          shifts={shifts}
          armedTemplateId={armedTemplateId}
          templates={templates}
          onBatch={batch}
          onDeleteShift={removeShift}
          onUpdateShift={updateShift}
          onSelectShift={handleSelectShift}
        />
      </div>

      {selectorDates && (
        <ShiftSelectorPopup
          templates={templates}
          onSelect={handleSelectorSelect}
          onCreateAndSelect={handleSelectorCreateAndSelect}
          onClose={handleSelectorClose}
        />
      )}
    </div>
  );
}
