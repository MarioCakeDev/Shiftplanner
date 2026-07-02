import { useState, useCallback, useRef } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from "date-fns";
import { CalendarCell } from "./CalendarCell";
import { YearPopup } from "./YearPopup";
import { ShiftEditPopup } from "./ShiftEditPopup";
import type { Shift, ShiftTemplate, BatchRequest } from "../lib/api";

type Props = {
  month: string;
  onMonthChange: (month: string) => void;
  shifts: Shift[];
  armedTemplateId: string | null;
  templates: ShiftTemplate[];
  onBatch: (data: BatchRequest) => Promise<unknown>;
  onDeleteShift: (id: string) => Promise<void>;
  onUpdateShift: (id: string, data: Partial<Pick<Shift, "title" | "color" | "startDateTime" | "endDateTime">>) => Promise<void>;
  onSelectShift: (dates: string[]) => void;
};

type DragPreview = {
  dates: Set<string>;
  template: ShiftTemplate | null;
  mode: "SET" | "REMOVE";
};

export function Calendar({ month, onMonthChange, shifts, armedTemplateId, templates, onBatch, onDeleteShift, onUpdateShift, onSelectShift }: Props) {
  const [year, mon] = month.split("-").map(Number);
  const currentDate = new Date(year, mon - 1);
  const [showYearPopup, setShowYearPopup] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [selDates, setSelDates] = useState<Set<string>>(new Set());
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [touchAnchor, setTouchAnchor] = useState<string | null>(null);
  const dragStartRef = useRef<string | null>(null);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
  });

  const getShiftForDate = useCallback((dateStr: string) =>
    shifts.find((s) => s.startDateTime.startsWith(dateStr)) ?? null, [shifts]);

  const getArmedTemplate = useCallback(() =>
    armedTemplateId ? templates.find((t) => t.id === armedTemplateId) || null : null,
    [armedTemplateId, templates]);

  const applyBatch = useCallback(async (dates: string[]) => {
    const template = getArmedTemplate();
    if (!template) return;

    const firstShift = getShiftForDate(dates[0]);
    const mode = firstShift ? (firstShift.templateId === armedTemplateId ? "REMOVE" as const : "SET" as const) : "SET" as const;
    await onBatch({ mode, templateId: template.id, dates });
  }, [getArmedTemplate, getShiftForDate, armedTemplateId, onBatch]);

  const handleMouseDown = useCallback((dateStr: string) => {
    dragStartRef.current = dateStr;
    setSelDates(new Set([dateStr]));
    const template = getArmedTemplate();
    const existingShift = getShiftForDate(dateStr);
    const mode = existingShift?.templateId === armedTemplateId ? "REMOVE" : "SET";
    setDragPreview({ dates: new Set([dateStr]), template, mode });
  }, [getArmedTemplate, getShiftForDate, armedTemplateId]);

  const handleMouseUp = useCallback((dateStr: string) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    setSelDates(new Set());
    setDragPreview(null);

    if (!start) return;

    if (start === dateStr) {
      const template = getArmedTemplate();
      const existingShift = getShiftForDate(dateStr);

      if (template) {
        if (existingShift) {
          onBatch({ mode: existingShift.templateId === template.id ? "REMOVE" : "SET", templateId: template.id, dates: [dateStr] });
        } else {
          onBatch({ mode: "SET", templateId: template.id, dates: [dateStr] });
        }
      } else if (existingShift) {
        setEditingShift(existingShift);
      } else {
        onSelectShift([dateStr]);
      }
    } else {
      const [dStart, dEnd] = start < dateStr ? [start, dateStr] : [dateStr, start];
      const dates = eachDayOfInterval({ start: parseISO(dStart), end: parseISO(dEnd) }).map((d) => format(d, "yyyy-MM-dd"));

      if (getArmedTemplate()) {
        applyBatch(dates);
      } else {
        onSelectShift(dates);
      }
    }
  }, [getArmedTemplate, getShiftForDate, onBatch, applyBatch, onSelectShift]);

  const updateSelection = useCallback((dateStr: string) => {
    const start = dragStartRef.current;
    if (!start) return;
    const [dStart, dEnd] = start < dateStr ? [start, dateStr] : [dateStr, start];
    const newDates = new Set(eachDayOfInterval({ start: parseISO(dStart), end: parseISO(dEnd) }).map((d) => format(d, "yyyy-MM-dd")));
    setSelDates(newDates);
    setDragPreview(prev => prev ? { ...prev, dates: newDates } : null);
  }, []);

  const handleMouseMove = useCallback((dateStr: string) => {
    updateSelection(dateStr);
  }, [updateSelection]);

  const handleTouchStart = useCallback((dateStr: string) => {
    setTouchAnchor(dateStr);
    dragStartRef.current = dateStr;
    const template = getArmedTemplate();
    const existingShift = getShiftForDate(dateStr);
    const mode = existingShift?.templateId === armedTemplateId ? "REMOVE" : "SET";
    setDragPreview({ dates: new Set([dateStr]), template, mode });
  }, [getArmedTemplate, getShiftForDate, armedTemplateId]);

  const handleTouchMove = useCallback((dateStr: string) => {
    if (!touchAnchor || !dragStartRef.current) return;
    setSelDates(prev => {
      const start = dragStartRef.current!;
      const [dStart, dEnd] = start < dateStr ? [start, dateStr] : [dateStr, start];
      const newDates = new Set(eachDayOfInterval({ start: parseISO(dStart), end: parseISO(dEnd) }).map((d) => format(d, "yyyy-MM-dd")));
      setDragPreview(p => p ? { ...p, dates: newDates } : null);
      return newDates;
    });
  }, [touchAnchor]);

  const handleTouchEnd = useCallback(async (dateStr: string) => {
    const start = touchAnchor;
    setTouchAnchor(null);
    setDragPreview(null);
    if (!start) return;

    if (start === dateStr) {
      handleMouseUp(dateStr);
    } else {
      const [dStart, dEnd] = start < dateStr ? [start, dateStr] : [dateStr, start];
      const dates = eachDayOfInterval({ start: parseISO(dStart), end: parseISO(dEnd) }).map((d) => format(d, "yyyy-MM-dd"));

      if (getArmedTemplate()) {
        await applyBatch(dates);
      } else {
        onSelectShift(dates);
      }
    }
    setTouchAnchor(null);
    dragStartRef.current = null;
    setSelDates(new Set());
  }, [touchAnchor, applyBatch, handleMouseUp, getArmedTemplate, onSelectShift]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMonthChange(format(subMonths(currentDate, 1), "yyyy-MM"))}
          className="px-3 py-1 text-gray-600 hover:text-gray-900 text-xl cursor-pointer">‹</button>
        <button onClick={() => setShowYearPopup(true)}
          className="text-xl font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
          {format(currentDate, "MMMM yyyy")}
        </button>
        <button onClick={() => onMonthChange(format(addMonths(currentDate, 1), "yyyy-MM"))}
          className="px-3 py-1 text-gray-600 hover:text-gray-900 text-xl cursor-pointer">›</button>
      </div>

      <div className="grid grid-cols-7"
        onMouseUp={(e) => {
          const el = (e.target as HTMLElement).closest("[data-date]");
          if (el) { const d = el.getAttribute("data-date"); if (d) handleMouseUp(d); }
          else if (dragStartRef.current) { dragStartRef.current = null; setSelDates(new Set()); setDragPreview(null); }
        }}
        onMouseLeave={() => { setSelDates(new Set()); setDragPreview(null); }}
        onTouchCancel={() => { setTouchAnchor(null); dragStartRef.current = null; setSelDates(new Set()); setDragPreview(null); }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2 border-b border-gray-200">{d}</div>
        ))}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isPreviewing = dragPreview?.dates.has(dateStr) ?? false;
          const existingShift = getShiftForDate(dateStr);
          const isRemoving = isPreviewing && dragPreview?.template !== null && existingShift?.templateId === dragPreview?.template?.id;
          const isReplacing = isPreviewing && dragPreview?.mode === "SET" && !!existingShift;
          const showTemplatePreview = isPreviewing && dragPreview?.mode === "SET";
          return (
            <CalendarCell key={dateStr} day={day.getDate()} dateStr={dateStr}
              isCurrentMonth={isSameMonth(day, currentDate)} isToday={isSameDay(day, new Date())}
              shift={existingShift} isSelected={selDates.has(dateStr)}
              isPreviewing={isPreviewing} isRemoving={isRemoving}
              isReplacing={isReplacing}
              showTemplatePreview={showTemplatePreview} previewTemplate={dragPreview?.template ?? null}
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} />
          );
        })}
      </div>

      {showYearPopup && (
        <YearPopup currentYear={year} currentMonth={mon}
          onSelect={(y, m) => onMonthChange(`${y}-${String(m).padStart(2, "0")}`)}
          onClose={() => setShowYearPopup(false)} />
      )}

      {editingShift && (
        <ShiftEditPopup shift={editingShift}
          onSave={(data) => onUpdateShift(editingShift.id, data)}
          onDelete={() => onDeleteShift(editingShift.id).then(() => setEditingShift(null))}
          onClose={() => setEditingShift(null)} />
      )}
    </div>
  );
}
