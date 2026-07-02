import { useState } from "react";
import type { ShiftTemplate } from "../lib/api";

type Props = {
  templates: ShiftTemplate[];
  armedTemplateId: string | null;
  onArm: (id: string | null) => void;
  onCreateTemplate: (data: { title: string; startTime: string; endTime: string; color: string }) => Promise<ShiftTemplate>;
  onUpdateTemplate: (id: string, data: { title: string; startTime: string; endTime: string; color: string }) => Promise<ShiftTemplate>;
  onDeleteTemplate: (id: string) => Promise<void>;
};

export function Toolbar({ templates, armedTemplateId, onArm, onCreateTemplate, onUpdateTemplate, onDeleteTemplate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [color, setColor] = useState("#3b82f6");

  const editingTemplate = editingTemplateId ? templates.find((t) => t.id === editingTemplateId) ?? null : null;

  const beginEdit = (t: ShiftTemplate) => {
    setEditingTemplateId(t.id);
    setTitle(t.title);
    setStartTime(t.startTime);
    setEndTime(t.endTime);
    setColor(t.color);
    setShowForm(true);
  };

  const beginCreate = () => {
    setEditingTemplateId(null);
    resetForm();
    setShowForm(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      await onUpdateTemplate(editingTemplate.id, { title, startTime, endTime, color });
    } else {
      await onCreateTemplate({ title, startTime, endTime, color });
    }
    setTitle("");
    setStartTime("08:00");
    setEndTime("16:00");
    setColor("#3b82f6");
    setShowForm(false);
    setEditingTemplateId(null);
  };

  const resetForm = () => {
    setTitle("");
    setStartTime("08:00");
    setEndTime("16:00");
    setColor("#3b82f6");
    setEditingTemplateId(null);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        {templates.map((t) => (
          <div key={t.id} className="relative group">
            <button
              onClick={() => {
                onArm(armedTemplateId === t.id ? null : t.id);
                if (armedTemplateId !== t.id) beginEdit(t);
              }}
              className={`px-3 py-1.5 rounded text-sm font-medium border-2 transition-all cursor-pointer ${
                armedTemplateId === t.id ? "border-gray-900 ring-2 ring-gray-900" : "border-transparent hover:border-gray-300"
              }`}
              style={{ backgroundColor: t.color + "20", color: t.color }}
            >
              {t.title}
              <span className="ml-1.5 text-xs opacity-60">{t.startTime}-{t.endTime}</span>
            </button>
          </div>
        ))}

        <button
          onClick={() => {
            if (showForm && !editingTemplate) {
              setShowForm(false);
              resetForm();
            } else {
              beginCreate();
              onArm(null);
            }
          }}
          className="px-3 py-1.5 rounded text-sm font-medium text-gray-500 border border-dashed border-gray-300 hover:border-gray-400 hover:text-gray-700 cursor-pointer"
        >
          + Add Shift
        </button>

        {armedTemplateId && (
          <span className="text-xs text-gray-400 ml-2">Click day cells or drag to apply. Click armed shift again to disarm.</span>
        )}
        {!armedTemplateId && templates.length > 0 && (
          <span className="text-xs text-gray-400 ml-2">Select a shift type above, then click or drag on the calendar.</span>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-2 flex items-center gap-2 flex-wrap pb-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Shift name" required
            className="px-2 py-1 border border-gray-300 rounded text-sm" />
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required
            className="px-2 py-1 border border-gray-300 rounded text-sm" />
          <span className="text-xs text-gray-400">to</span>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required
            className="px-2 py-1 border border-gray-300 rounded text-sm" />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 p-0 border border-gray-300 rounded cursor-pointer" />
          <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 cursor-pointer">Save</button>
          <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
            className="px-3 py-1 text-gray-500 text-sm hover:text-gray-700 cursor-pointer">Cancel</button>
          {editingTemplate && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete ${editingTemplate.title}? This will remove all shifts using this configuration.`)) {
                  onDeleteTemplate(editingTemplate.id);
                  setShowForm(false);
                  resetForm();
                  onArm(null);
                }
              }}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 cursor-pointer"
            >
              Delete
            </button>
          )}
        </form>
      )}
    </div>
  );
}
