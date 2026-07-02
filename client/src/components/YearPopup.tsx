import { useState } from "react";

type Props = {
  currentYear: number;
  currentMonth: number;
  onSelect: (year: number, month: number) => void;
  onClose: () => void;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function YearPopup({ currentYear, currentMonth, onSelect, onClose }: Props) {
  const [year, setYear] = useState(currentYear);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setYear(year - 1)}
            className="px-2 py-1 text-gray-600 hover:text-gray-900 text-lg cursor-pointer"
          >
            ‹
          </button>
          <span className="text-lg font-semibold">{year}</span>
          <button
            onClick={() => setYear(year + 1)}
            className="px-2 py-1 text-gray-600 hover:text-gray-900 text-lg cursor-pointer"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {MONTHS.map((name, idx) => (
            <button
              key={name}
              onClick={() => {
                onSelect(year, idx + 1);
                onClose();
              }}
              className={`px-3 py-2 rounded text-sm font-medium cursor-pointer ${
                year === currentYear && idx + 1 === currentMonth
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
