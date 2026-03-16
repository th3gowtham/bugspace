import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Mail, AlertCircle, Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import logoImg from "@/assets/logo.png";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden selection:bg-primary/20">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none opacity-60" />

        <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center justify-center p-4 rounded-3xl bg-background border border-border/50 shadow-sm mb-6 group hover:shadow-md transition-all overflow-hidden relative">
              <img src={logoImg} alt="BugSpace Logo" className="h-14 w-auto object-contain group-hover:scale-105 transition-transform relative z-10 dark:invert" />
            </Link>
          </div>

          <div className="glass-card p-10 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-inner relative z-10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground mb-3 relative z-10 tracking-tight">Check your email</h2>
            <p className="text-base text-muted-foreground mb-6 relative z-10">
              We've sent a secure password reset link to <br /><span className="text-foreground font-bold mt-1 inline-block">{email}</span>
            </p>
            <p className="text-sm text-primary/80 font-medium mb-8 relative z-10 bg-primary/5 py-3 rounded-lg border border-primary/10">
              Click the link in the email to reset your password.
            </p>
            <Link
              to="/login"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm relative z-10 hover:shadow-md hover:-translate-y-0.5"
            >
              Back to Sign In
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden selection:bg-primary/20">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none opacity-60" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">

        {/* Logo Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center p-4 rounded-3xl bg-background border border-border/50 shadow-sm mb-6 group hover:shadow-md transition-all overflow-hidden relative">
            <img src={logoImg} alt="BugSpace Logo" className="h-14 w-auto object-contain group-hover:scale-105 transition-transform relative z-10 dark:invert" />
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">Password Reset</h1>
          <p className="text-base text-muted-foreground font-medium">Reclaim access to your account</p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8 md:p-10 space-y-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

          <p className="text-sm font-medium text-muted-foreground/90 leading-relaxed text-center pb-2 relative z-10">
            Enter your registered email address below and we'll send you secure instructions to reset your password.
          </p>

          <div className="relative z-10">
            {error && (
              <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium text-destructive leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-foreground ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-input bg-background/50 pl-11 pr-4 py-3.5 text-sm font-medium text-foreground placeholder:-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-background/80"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 mt-2"
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                {!loading && "Send Secure Reset Link"}
                {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <p className="text-sm font-medium text-muted-foreground">
            Remember your password?{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 hover:underline font-bold transition-colors">Sign In securely</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
