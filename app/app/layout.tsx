import { AglosatProvider, KluczDemo } from "@/components/aglosat/stan-aglosat";
import { TrybDemo } from "@/components/aglosat/tryb-demo";

// Układ /app/*: stan AgloSat przeżywa przejścia między planistą a mieszkańcem; tu działa też tryb demo.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AglosatProvider>
      <KluczDemo>{children}</KluczDemo>
      <TrybDemo />
    </AglosatProvider>
  );
}
