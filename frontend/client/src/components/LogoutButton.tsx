import { LogOut } from "lucide-react";

export default function LogoutButton({onLogout}: { onLogout: () => void }) {
  return (
    <button
      onClick={onLogout}
      className="flex items-center gap-2 text-red-600 hover:text-red-800 transition-colors p-2 rounded-lg hover:bg-red-100"
    >
      <LogOut className="w-5 h-5" />
    </button>
  );

}