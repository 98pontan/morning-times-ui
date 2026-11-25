// Keycloak sends the browser back here after login. Finish the login, check that the backend
// accepts the user (group membership), then go back to where the login started.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError, api } from "../api/client";
import { completeLogin, forgetUser, useAuth } from "../auth/auth";
import { ErrorBox, Loading } from "../components/Layout";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false); // StrictMode runs effects twice; the login code may only be used once

  useEffect(() => {
    if (!auth.ready || started.current) return;
    started.current = true;
    (async () => {
      try {
        const user = await completeLogin();
        await api.me(); // 403 when the user is not in the required group
        const returnTo = (user.state as { returnTo?: string } | undefined)?.returnTo;
        navigate(returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/", { replace: true });
      } catch (e) {
        await forgetUser();
        setError(e instanceof ApiError && e.status === 403 ? e.message : `Inloggningen misslyckades: ${e instanceof Error ? e.message : e}`);
      }
    })();
  }, [auth.ready, navigate]);

  if (error)
    return (
      <div className="empty">
        <ErrorBox error={error} />
        <button onClick={() => navigate("/", { replace: true })}>Till startsidan</button>
      </div>
    );
  return <Loading label="Loggar in…" />;
}
