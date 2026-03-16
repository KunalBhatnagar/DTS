import { DarkModeProvider } from "./context/DarkModeContext";
import { ToastProvider } from "./components/ToastProvider";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <DarkModeProvider>
      <ToastProvider>
        <Dashboard />
      </ToastProvider>
    </DarkModeProvider>
  );
}
