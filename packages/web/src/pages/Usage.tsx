import { Link } from "react-router-dom";
import { UsageDashboard } from "../components/usage/UsageDashboard";

export function Usage() {
  return (
    <div>
      <Link
        to="/"
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        &larr; Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mt-3 mb-6">
        AI Usage & Costs
      </h1>

      <UsageDashboard />
    </div>
  );
}
