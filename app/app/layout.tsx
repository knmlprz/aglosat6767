import { AglosatProvider } from "@/components/aglosat/stan-aglosat";

// Układ /app/*: stan AgloSat przeżywa przejścia między planistą a mieszkańcem.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AglosatProvider>{children}</AglosatProvider>;
}
