import { redirect } from "next/navigation";

// La landing pública llegará más adelante; por ahora la raíz lleva al panel
// (proxy.ts redirige a /login si no hay sesión).
export default function Home() {
  redirect("/dashboard");
}
