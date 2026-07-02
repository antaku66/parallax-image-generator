import { useState } from "react";
import { StudioShell } from "./components/shell/StudioShell";
import { EmptyState } from "./components/states/EmptyState";
import { LoadingState } from "./components/states/LoadingState";
import { ViewerState } from "./components/states/ViewerState";
import { ErrorState } from "./components/states/ErrorState";
import { InfoModal } from "./components/modals/InfoModal";
import { resetApp, useAppStore } from "./store/store";

export default function App() {
  const appState = useAppStore((s) => s.appState);
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <StudioShell onInfo={() => setInfoOpen(true)} onNew={resetApp}>
        {appState === "empty" && <EmptyState />}
        {appState === "loading" && <LoadingState />}
        {appState === "viewer" && <ViewerState />}
        {appState === "error" && <ErrorState />}
      </StudioShell>
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );
}
