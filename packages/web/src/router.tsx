import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Dashboard } from "./pages/Dashboard";
import { PropertyDetail } from "./pages/PropertyDetail";
import { AnalysisView } from "./pages/AnalysisView";
import { RenovationView } from "./pages/RenovationView";
import { DesignJourney } from "./pages/DesignJourney";
import { Pricing } from "./pages/Pricing";
import { JourneyItemDetail } from "./pages/JourneyItemDetail";
import { Usage } from "./pages/Usage";

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

export function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
        <Route path="/properties/:id" element={<AnimatedPage><PropertyDetail /></AnimatedPage>} />
        <Route path="/analyses/:id" element={<AnimatedPage><AnalysisView /></AnimatedPage>} />
        <Route
          path="/analysis-photos/:analysisPhotoId/renovations"
          element={<AnimatedPage><RenovationView /></AnimatedPage>}
        />
        <Route path="/properties/:id/journey" element={<AnimatedPage><DesignJourney /></AnimatedPage>} />
        <Route path="/journey/:journeyItemId" element={<AnimatedPage><JourneyItemDetail /></AnimatedPage>} />
        <Route path="/pricing" element={<AnimatedPage><Pricing /></AnimatedPage>} />
        <Route path="/usage" element={<AnimatedPage><Usage /></AnimatedPage>} />
      </Routes>
    </AnimatePresence>
  );
}
