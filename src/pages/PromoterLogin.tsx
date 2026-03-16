import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, Megaphone, Shield } from "lucide-react";
import { getPromoterSession, loginPromoter } from "@/lib/promoterService";
import logoImg from "@/assets/logo.png";

const PromoterLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getPromoterSession();
    if (session) {
      navigate("/promoter/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await loginPromoter(identifier, password);
      if (!result.success) {
        setError(result.error ?? "Unable to sign in.");
        return;
      }
      const nextPath = (location.state as { from?: string } | null)?.from;
      navigate(nextPath || "/promoter/dashboard", { replace: true });
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 selection:bg-primary/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center p-4 rounded-3xl bg-background border border-border/50 shadow-sm group hover:shadow-md transition-all">
            <img src={logoImg} alt="BugSpace Logo" className="h-14 w-auto object-contain transition-transform group-hover:scale-105 dark:invert" />
          </Link>
          <p className="mt-4 text-sm font-medium text-muted-foreground">Promoter portal sign in</p>
        </div>

        <div className="glass-card p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

          <div className="inline-flex items-center justify-center w-full gap-2 rounded-xl border border-border/50 bg-secondary/30 px-4 py-2 text-xs font-semibold text-muted-foreground relative z-10">
            <Megaphone className="h-4 w-4 text-primary" />
            Promoter accounts are created by admins only
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form className="space-y-4 relative z-10" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Username or email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="promoter@example.com"
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-background/80"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-background/80"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in as promoter"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Looking for researcher login? <Link to="/login" className="text-primary hover:underline">Sign in here</Link>
        </p>
      </div>
    </div>
  );
};

export default PromoterLogin;
