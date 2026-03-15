import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden selection:bg-primary/20">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none opacity-50" />

      <div className="w-full max-w-md relative z-10 text-center animate-in fade-in zoom-in-95 duration-700">

        <div className="inline-flex items-center justify-center p-6 rounded-full bg-secondary/50 border border-border/60 shadow-inner mb-8">
          <ShieldAlert className="h-16 w-16 text-muted-foreground/60" />
        </div>

        <div className="space-y-3 mb-10">
          <h1 className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-foreground to-muted-foreground tracking-tighter drop-shadow-sm">
            404
          </h1>
          <p className="text-xl font-bold text-foreground">Mission Aborted.</p>
          <p className="text-base text-muted-foreground max-w-xs mx-auto leading-relaxed">
            The intel you requested cannot be located. It might have been classified or deleted.
          </p>
        </div>

        <Link
          to="/"
          className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-8 py-3.5 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all w-fit mx-auto"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Return to Base (Home)
        </Link>

      </div>
    </div>
  );
};

export default NotFound;
