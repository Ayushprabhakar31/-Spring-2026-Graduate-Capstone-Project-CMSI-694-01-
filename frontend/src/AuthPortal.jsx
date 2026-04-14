import { useMemo, useState } from "react";
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:9000";

const ROLE_OPTIONS = [
  "Platform Operator",
  "Incident Commander",
  "Security Analyst",
  "Executive Viewer",
];

const INITIAL_LOGIN = {
  email: "demo@pulseops.ai",
  password: "pulseops-demo",
};

const INITIAL_SIGNUP = {
  name: "",
  email: "",
  organization: "",
  role: ROLE_OPTIONS[0],
  password: "",
};

export default function AuthPortal({ onAuthenticate }) {
  const [mode, setMode] = useState("signin");
  const [login, setLogin] = useState(INITIAL_LOGIN);
  const [signup, setSignup] = useState(INITIAL_SIGNUP);
  const [authState, setAuthState] = useState({ loading: false, error: "" });

  const capabilityRows = useMemo(
    () => [
      "Live AI incident analysis and natural-language prompt workflows",
      "Threat intelligence, war room exports, and executive reporting",
      "Multi-page command center with scenario-driven demonstrations",
    ],
    [],
  );

  async function submitSignIn(event) {
    event.preventDefault();
    setAuthState({ loading: true, error: "" });
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(login),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign in");
      onAuthenticate({ ...data.user, token: data.token });
    } catch (error) {
      setAuthState({ loading: false, error: error.message });
      return;
    }
    setAuthState({ loading: false, error: "" });
  }

  async function submitCreateAccount(event) {
    event.preventDefault();
    setAuthState({ loading: true, error: "" });
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create account");
      onAuthenticate({ ...data.user, token: data.token });
    } catch (error) {
      setAuthState({ loading: false, error: error.message });
      return;
    }
    setAuthState({ loading: false, error: "" });
  }

  function continueAsDemo() {
    onAuthenticate({
      name: "Demo Operator",
      email: "demo@pulseops.ai",
      organization: "Capstone Control Room",
      role: "Incident Commander",
    });
  }

  return (
    <main className="auth-shell">
      <section className="auth-layout">
        <article className="auth-hero">
          <div className="auth-hero__badge">PulseOps Identity</div>
          <h1>Enter the AI operations suite.</h1>
          <p>
            Sign in to the command center, launch guided incident workflows, and present your capstone as a real platform product.
          </p>

          <div className="auth-feature-list">
            {capabilityRows.map((item) => (
              <div key={item} className="auth-feature-row">
                <span className="auth-feature-row__dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="auth-hero__cards">
            <div className="auth-mini-card">
              <span>Workspace state</span>
              <strong>Secure access enabled</strong>
            </div>
            <div className="auth-mini-card">
              <span>Demo mode</span>
              <strong>Ready for presentation</strong>
            </div>
          </div>
        </article>

        <article className="auth-panel">
          <div className="auth-panel__top">
            <div>
              <p className="eyebrow">Access Control</p>
              <h2>{mode === "signin" ? "Sign in" : "Create account"}</h2>
            </div>
            <div className="auth-tabs">
              <button className={`auth-tab ${mode === "signin" ? "is-active" : ""}`} onClick={() => setMode("signin")} type="button">
                Login
              </button>
              <button className={`auth-tab ${mode === "signup" ? "is-active" : ""}`} onClick={() => setMode("signup")} type="button">
                Create Account
              </button>
            </div>
          </div>

          {mode === "signin" ? (
            <form className="auth-form" onSubmit={submitSignIn}>
              <label className="field">
                <span>Email</span>
                <input value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={login.password}
                  onChange={(event) => setLogin({ ...login, password: event.target.value })}
                />
              </label>
              <button className="copilot-submit auth-submit" type="submit">{authState.loading ? "Signing in..." : "Access Workspace"}</button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={submitCreateAccount}>
              <label className="field">
                <span>Full name</span>
                <input value={signup.name} onChange={(event) => setSignup({ ...signup, name: event.target.value })} />
              </label>
              <label className="field">
                <span>Email</span>
                <input value={signup.email} onChange={(event) => setSignup({ ...signup, email: event.target.value })} />
              </label>
              <label className="field">
                <span>Organization</span>
                <input
                  value={signup.organization}
                  onChange={(event) => setSignup({ ...signup, organization: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Role</span>
                <select value={signup.role} onChange={(event) => setSignup({ ...signup, role: event.target.value })}>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field--full">
                <span>Password</span>
                <input
                  type="password"
                  value={signup.password}
                  onChange={(event) => setSignup({ ...signup, password: event.target.value })}
                />
              </label>
              <button className="copilot-submit auth-submit" type="submit">{authState.loading ? "Creating account..." : "Create Workspace Account"}</button>
            </form>
          )}

          <div className="auth-divider">
            <span>or</span>
          </div>

          {authState.error ? <p className="auth-hint">{authState.error}</p> : null}

          <button className="auth-demo" onClick={continueAsDemo} type="button">
            Continue in Demo Mode
          </button>
          <p className="auth-hint">Use demo mode for presentations and quick walkthroughs without setup.</p>
        </article>
      </section>
    </main>
  );
}
