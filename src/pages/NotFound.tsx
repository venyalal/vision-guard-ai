import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-mono font-semibold text-[#1F2937]">404</p>
        <p className="mt-3 text-sm text-[#6B7280]">Page not found</p>
        <Link
          to="/dashboard"
          className="mt-5 inline-block text-xs text-[#0EA5E9] hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
