import { useState } from "react";
import type { ShiftTemplate } from "../lib/api";

type Props = {
  templates: ShiftTemplate[];
  onSelect: (templateId: string) => void;
  onCreateAndSelect: (data: { title: string; startTime: string; endTime: string; color: string }) => Promise<ShiftTemplate>;
  onClose: () => void;
};

export function ShiftSelectorPopup({ templates, onSelect, onCreateAndSelect, onClose }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [color, setColor] = useState("#3b82f6");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await onCreateAndSelect({ title, startTime, endTime, color });
    onSelect(created.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-5 w-96" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Select a Shift</h2>

        {!showForm && (
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className="flex items-center gap-3 px-3 py-2 rounded text-sm font-medium text-left hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-gray-900">{t.title}</span>
                <span className="text-xs text-gray-400 ml-auto">{t.startTime}–{t.endTime}</span>
              </button>
            ))}

            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-3 px-3 py-2 rounded text-sm font-medium text-gray-500 border border-dashed border-gray-300 hover:border-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
            >
              + Create New
            </button>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Shift name" required
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Start</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">End</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 p-0 border border-gray-300 rounded cursor-pointer" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-gray-600 text-sm hover:text-gray-800 cursor-pointer">Back</button>
              <button type="submit"
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 cursor-pointer">Create & Apply</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
