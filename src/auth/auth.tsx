// Keycloak login (OIDC Authorization Code + PKCE) with oidc-client-ts.
// The backend tells us at /api/auth whether login is on and which realm/client to use, so the
// same image works with login off (local development) and on (cluster).
import { useQueryClient } from "@tanstack/react-query";
import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface AuthConfig {
  enabled: boolean;
  issuer: string;
  client_id: string;
  required_group: string;
  version: string;
}

export interface AuthState {
  ready: boolean;
  /** Login is configured on the backend. Off: everyone may change everything. */
  enabled: boolean;
  user: { username: string; name: string } | null;
  /** May change settings and watches: logged in, or login is off. */
  canEdit: boolean;
  requiredGroup: string;
  version: string;
  login: (returnTo?: string) => void;
  logout: () => void;
}

// Without a provider (unit tests) the app behaves as with login off.
export const AuthContext = createContext<AuthState>({
  ready: true,
  enabled: false,
  user: null,
  canEdit: true,
  requiredGroup: "newspaper",
  version: "",
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Module level so the API client can read the token without React.
let manager: UserManager | null = null;

export const CALLBACK_PATH = "/auth/callback";

/** The current access token, refreshed first when it is about to expire. */
export async function accessToken(): Promise<string | null> {
  if (!manager) return null;
  let user = await manager.getUser();
  if (user && user.expires_in != null && user.expires_in < 30) user = await renew();
  return user && !user.expired ? user.access_token : null;
}

/** Get a new access token with the refresh token; on failure the user is logged out locally. */
export async function renew(): Promise<User | null> {
  if (!manager) return null;
  try {
    return await manager.signinSilent();
  } catch {
    await manager.removeUser();
    return null;
  }
}

export async function forgetUser() {
  await manager?.removeUser();
}

export function completeLogin(): Promise<User> {
  if (!manager) throw new Error("Inloggning är inte aktiverad");
  return manager.signinRedirectCallback();
}

function displayName(user: User | null) {
  if (!user) return null;
  const p = user.profile;
  return { username: p.preferred_username ?? p.sub, name: p.name ?? p.preferred_username ?? "" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let cfg: AuthConfig;
      try {
        const response = await fetch("/api/auth");
        cfg = await response.json();
      } catch {
        cfg = { enabled: false, issuer: "", client_id: "", required_group: "newspaper", version: "" };
      }
      if (cancelled) return;
      setConfig(cfg);
      if (cfg.enabled && !manager) {
        const origin = window.location.origin;
        manager = new UserManager({
          authority: cfg.issuer,
          client_id: cfg.client_id,
          redirect_uri: origin + CALLBACK_PATH,
          post_logout_redirect_uri: origin + "/",
          scope: "openid profile email",
          // Keep the login across tabs and restarts; Keycloak's session limits still apply.
          userStore: new WebStorageStateStore({ store: window.localStorage }),
          automaticSilentRenew: true,
        });
      }
      if (manager) {
        const onChange = (u: User | null) => {
          setUser(u);
          // Watches and alerts depend on who is asking: refetch everything.
          queryClient.invalidateQueries();
        };
        manager.events.addUserLoaded((u) => onChange(u));
        manager.events.addUserUnloaded(() => onChange(null));
        manager.events.addSilentRenewError(() => manager?.removeUser());
        let current = await manager.getUser();
        if (current?.expired) current = await renew();
        if (!cancelled) setUser(current);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  const value = useMemo<AuthState>(() => {
    const enabled = !!config?.enabled;
    return {
      ready,
      enabled,
      user: displayName(user),
      canEdit: !enabled || !!user,
      requiredGroup: config?.required_group ?? "newspaper",
      version: config?.version ?? "",
      login: (returnTo = window.location.pathname + window.location.search) =>
        void manager?.signinRedirect({ state: { returnTo } }),
      logout: () => void manager?.signoutRedirect({ id_token_hint: user?.id_token }).catch(() => manager?.removeUser()),
    };
  }, [config, user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Shown instead of settings and edit controls to visitors who are not logged in. */
export function LoginPrompt({ text = "Logga in för att ändra inställningar och bevakningar." }: { text?: string }) {
  const auth = useAuth();
  return (
    <div className="empty login-prompt">
      <p>{text}</p>
      <button onClick={() => auth.login()}>Logga in</button>
      <p className="muted small">Kräver ett konto i gruppen “{auth.requiredGroup}”.</p>
    </div>
  );
}
