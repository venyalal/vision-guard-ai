import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-mono font-semibold text-[#E2E8F0]">404</p>
        <p className="mt-3 text-sm text-[#64748B]">Page not found</p>
        <Link to="/dashboard" className="mt-5 inline-block text-xs text-[#2563EB] hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
