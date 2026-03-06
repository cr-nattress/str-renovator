import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import { AppShell } from "./components/layout/AppShell";
import { AppRoutes } from "./router";

export function App() {
  return (
    <>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <SignIn />
        </div>
      </SignedOut>
      <SignedIn>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </SignedIn>
    </>
  );
}
