import { redirect } from "next/navigation";

export default function DestynacjeRedirect() {
  redirect("/app/mapa?warstwa=destynacje");
}
