import { useState, useRef, useEffect } from "react";
import type { UserInfo } from "../lib/api";

type Props = {
  user: UserInfo;
};

export function ProfileDropdown({ user }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 focus:outline-none cursor-pointer"
        aria-label="Profile menu"
      >
        {user.picture ? (
          <img src={user.picture} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
            {initials || "?"}
          </div>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-4 py-2 text-sm text-gray-900 font-medium">{user.name}</div>
          {user.email && <div className="px-4 pb-2 text-xs text-gray-500">{user.email}</div>}
          {user.authEnabled && <hr className="mx-2 border-gray-200" />}
          {user.authEnabled && (
            <button
              onClick={() => (window.location.href = "/api/auth/logout")}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </div>
  );
}
