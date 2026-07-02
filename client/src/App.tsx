import { useState, useEffect, useCallback } from "react";
import { Calendar } from "./components/Calendar";
import { Toolbar } from "./components/Toolbar";
import { ShiftSelectorPopup } from "./components/ShiftSelectorPopup";
import { ProfileDropdown } from "./components/ProfileDropdown";
import { useTemplates } from "./hooks/useTemplates";
import { useShifts } from "./hooks/useShifts";
import { api } from "./lib/api";
import type { UserInfo, BatchRequest } from "./lib/api";

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [armedTemplateId, setArmedTemplateId] = useState<string | null>(null);
  const [selectorDates, setSelectorDates] = useState<string[] | null>(null);
  const [undoStack, setUndoStack] = useState<{ mode: "SET" | "REMOVE"; templateId: string; dates: string[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ mode: "SET" | "REMOVE"; templateId: string; dates: string[] }[]>([]);

  const { templates, create: createTemplate, update: updateTemplate, remove: removeTemplate } = useTemplates();
  const { shifts, batch, reload, remove: removeShift, update: updateShift } = useShifts(currentMonth);

  useEffect(() => {
    api.user.me().then(setUser).catch(() => setUser(null)).finally(() => setUserLoading(false));
  }, []);

  const handleBatch = useCallback(async (data: BatchRequest) => {
    const result = await batch(data);

    const existingOnDates = shifts.filter(s =>
      data.dates.some(d => s.startDateTime.startsWith(d))
    );
    const existingIds = new Set(
      existingOnDates
        .filter(s => s.templateId === data.templateId)
        .map(s => s.startDateTime.slice(0, 10))
    );

    const affectedDates = data.mode === "SET"
      ? data.dates.filter(d => !existingIds.has(d))
      : data.dates.filter(d => existingIds.has(d));

    if (affectedDates.length > 0) {
      setUndoStack(prev => {
        const next = [...prev, { mode: data.mode, templateId: data.templateId, dates: affectedDates }];
        return next.length > 100 ? next.slice(-100) : next;
      });
      setRedoStack([]);
    }

    return result;
  }, [batch, shifts]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const entry = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, entry]);
    const inverseMode = entry.mode === "SET" ? "REMOVE" : "SET";
    batch({ mode: inverseMode, templateId: entry.templateId, dates: entry.dates });
  }, [undoStack, batch]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const entry = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => {
      const next = [...prev, entry];
      return next.length > 100 ? next.slice(-100) : next;
    });
    batch({ mode: entry.mode, templateId: entry.templateId, dates: entry.dates });
  }, [redoStack, batch]);

  const handleSelectShift = useCallback((dates: string[]) => {
    setSelectorDates(dates);
  }, []);

  const handleSelectorSelect = useCallback((templateId: string) => {
    if (!selectorDates) return;
    handleBatch({ mode: "SET", templateId, dates: selectorDates });
    setArmedTemplateId(templateId);
    setSelectorDates(null);
  }, [selectorDates, handleBatch]);

  const handleSelectorCreateAndSelect = useCallback(async (data: { title: string; startTime: string; endTime: string; color: string }) => {
    return createTemplate(data);
  }, [createTemplate]);

  const handleSelectorClose = useCallback(() => {
    setSelectorDates(null);
  }, []);

  const icalUrl = user?.icalUrl
    ? (user.icalUrl.endsWith(".ics") ? user.icalUrl : `${user.icalUrl}.ics`)
    : null;

  const handleCopyIcal = useCallback(() => {
    if (!icalUrl) return;
    navigator.clipboard.writeText(icalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [icalUrl]);

  const handleDownloadIcal = useCallback(async () => {
    if (!icalUrl) return;
    const response = await fetch(icalUrl);
    const blob = await response.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "schichtplan.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, [icalUrl]);

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
        <div className="flex items-center gap-3">
          {!userLoading && !user && (
            <button
              onClick={() => (window.location.href = "/api/auth/login")}
              className="text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              Login
            </button>
          )}
          {user && <ProfileDropdown user={user} />}
        </div>
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
          onBatch={handleBatch}
          onDeleteShift={removeShift}
          onUpdateShift={updateShift}
          onSelectShift={handleSelectShift}
        />
        {(undoStack.length > 0 || redoStack.length > 0) && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="px-3 py-1.5 text-sm font-medium rounded border cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
                text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
            >
              ↶ Undo{undoStack.length > 0 ? ` (${undoStack.length})` : ""}
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="px-3 py-1.5 text-sm font-medium rounded border cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
                text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
            >
              ↷ Redo{redoStack.length > 0 ? ` (${redoStack.length})` : ""}
            </button>
          </div>
        )}
        {icalUrl && (
          <div className="mt-4 flex gap-2 justify-center">
            <button
              onClick={handleCopyIcal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
            >
              {copied ? "Copied!" : "Copy iCal URL"}
            </button>
            <button
              onClick={handleDownloadIcal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
            >
              Download
            </button>
          </div>
        )}
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
