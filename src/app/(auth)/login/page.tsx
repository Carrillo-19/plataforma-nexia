import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = getSafeRedirectPath(params.next);
  const linkError = params.error === "link";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Bienvenido de nuevo</CardTitle>
        <CardDescription>Ingresa a tu panel para gestionar tu asistente de IA.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={next} linkError={linkError} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        ¿Aún no tienes cuenta?&nbsp;
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          Regístrate
        </Link>
      </CardFooter>
    </Card>
  );
}
