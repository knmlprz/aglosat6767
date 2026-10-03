import { redirect } from "next/navigation";

// /app prowadzi do widoku głównego: planisty.
export default function AppIndex() {
  redirect("/app/planista");
}
