import { Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { PropertyDetail } from "./pages/PropertyDetail";
import { AnalysisView } from "./pages/AnalysisView";
import { RenovationView } from "./pages/RenovationView";
import { DesignJourney } from "./pages/DesignJourney";
import { Pricing } from "./pages/Pricing";
import { JourneyItemDetail } from "./pages/JourneyItemDetail";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/properties/:id" element={<PropertyDetail />} />
      <Route path="/analyses/:id" element={<AnalysisView />} />
      <Route
        path="/analysis-photos/:analysisPhotoId/renovations"
        element={<RenovationView />}
      />
      <Route path="/properties/:id/journey" element={<DesignJourney />} />
      <Route path="/journey/:journeyItemId" element={<JourneyItemDetail />} />
      <Route path="/pricing" element={<Pricing />} />
    </Routes>
  );
}
