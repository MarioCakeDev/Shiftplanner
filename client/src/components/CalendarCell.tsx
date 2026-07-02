import type { Shift, ShiftTemplate } from "../lib/api";

type Props = {
  day: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  shift: Shift | null;
  isSelected: boolean;
  isPreviewing: boolean;
  isRemoving: boolean;
  isReplacing: boolean;
  showTemplatePreview: boolean;
  previewTemplate: ShiftTemplate | null;
  onMouseDown: (dateStr: string) => void;
  onMouseMove: (dateStr: string) => void;
  onMouseUp: (dateStr: string) => void;
  onTouchStart: (dateStr: string) => void;
  onTouchMove: (dateStr: string) => void;
  onTouchEnd: (dateStr: string) => void;
};

export function CalendarCell({
  day, dateStr, isCurrentMonth, isToday, shift, isSelected,
  isPreviewing, isRemoving, isReplacing, showTemplatePreview, previewTemplate,
  onMouseDown, onMouseMove, onMouseUp,
  onTouchStart, onTouchMove, onTouchEnd,
}: Props) {
  return (
    <div
      className={`relative min-h-[80px] border border-gray-200 p-1 select-none transition-colors ${
        !isCurrentMonth ? "bg-gray-50" : "bg-white"
      } ${isToday ? "ring-2 ring-blue-400 ring-inset" : ""} ${isSelected ? "bg-blue-100" : ""}`}
      style={{ touchAction: "none" }}
      onMouseDown={(e) => { e.preventDefault(); onMouseDown(dateStr); }}
      onMouseMove={() => onMouseMove(dateStr)}
      onMouseUp={() => onMouseUp(dateStr)}
      onTouchStart={() => { onTouchStart(dateStr); }}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const d = el?.closest("[data-date]")?.getAttribute("data-date");
        if (d) onTouchMove(d);
      }}
      onTouchEnd={() => { onTouchEnd(dateStr); }}
      data-date={dateStr}
    >
      <span className={`text-xs font-medium ${isCurrentMonth ? "text-gray-700" : "text-gray-300"}`}>{day}</span>
      <div className="mt-1 flex flex-col gap-0.5">
        {shift && (
          <div className={`text-xs px-1 py-0.5 rounded truncate relative ${isRemoving || isReplacing ? "ring-2 ring-red-500 ring-inset opacity-50" : ""}`}
            style={{ backgroundColor: shift.color + "30", color: shift.color }}>
            {shift.title}
            {shift.startDateTime.slice(0, 10) !== shift.endDateTime.slice(0, 10) && (
              <span className="absolute right-0.5 top-0.5 bottom-0.5 w-0.5 rounded-full" style={{ backgroundColor: shift.color }} />
            )}
          </div>
        )}
        {isPreviewing && !previewTemplate && (
          <div className="text-xs px-1 py-0.5 rounded truncate opacity-40"
            style={{
              backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 3px, #9ca3af 3px, #9ca3af 4px)",
              backgroundColor: "#e5e7eb",
            }}>
          </div>
        )}
        {showTemplatePreview && previewTemplate && (
          <div className="text-xs px-1 py-0.5 rounded truncate opacity-40"
            style={{ backgroundColor: previewTemplate.color + "30", color: previewTemplate.color }}>
            {previewTemplate.title}
          </div>
        )}
      </div>
    </div>
  );
}
