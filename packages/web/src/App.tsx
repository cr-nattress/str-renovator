import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { AppShell } from "./components/layout/AppShell";
import { AppRoutes } from "./router";
import { Landing } from "./pages/Landing";

export function App() {
  return (
    <>
      <SignedOut>
        <Landing />
      </SignedOut>
      <SignedIn>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </SignedIn>
    </>
  );
}
