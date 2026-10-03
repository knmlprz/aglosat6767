import { redirect } from "next/navigation";

export default function PrzystankiRedirect() {
  redirect("/app/mapa?warstwa=przystanki");
}
