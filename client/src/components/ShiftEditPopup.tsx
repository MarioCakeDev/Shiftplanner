import { useState } from "react";
import type { Shift } from "../lib/api";

type Props = {
  shift: Shift;
  onSave: (data: Partial<Pick<Shift, "title" | "color" | "startDateTime" | "endDateTime">>) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
};

export function ShiftEditPopup({ shift, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(shift.title);
  const [color, setColor] = useState(shift.color);
  const [startDateTime, setStartDateTime] = useState(shift.startDateTime.slice(0, 16));
  const [endDateTime, setEndDateTime] = useState(shift.endDateTime.slice(0, 16));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ title, color, startDateTime: startDateTime + ":00", endDateTime: endDateTime + ":00" });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-5 w-96" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Edit Shift</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Start</label>
              <input type="datetime-local" value={startDateTime} onChange={(e) => setStartDateTime(e.target.value)} required
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">End</label>
              <input type="datetime-local" value={endDateTime} onChange={(e) => setEndDateTime(e.target.value)} required
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Color</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 p-0 border border-gray-300 rounded cursor-pointer" />
          </div>
          <div className="flex justify-between pt-2">
            <button type="button" onClick={onDelete}
              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 cursor-pointer">Delete</button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="px-3 py-1.5 text-gray-600 text-sm hover:text-gray-800 cursor-pointer">Cancel</button>
              <button type="submit"
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 cursor-pointer">Save</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
