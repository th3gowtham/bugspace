import { Shield } from "lucide-react";
import { Link } from "react-router-dom";
import logoImg from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/80 backdrop-blur-md relative z-10">
      <div className="container py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-3 text-sm text-muted-foreground group">
            <Link to="/" className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors block">
              <img src={logoImg} alt="BugSpace Logo" className="h-7 w-auto object-contain group-hover:scale-110 transition-transform dark:invert" />
            </Link>
            <span className="opacity-60 hidden sm:inline">· Security Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/browse" className="hover:text-foreground hover:-translate-y-0.5 transition-all">Programs</Link>
            <a href="#" className="hover:text-foreground hover:-translate-y-0.5 transition-all">Privacy</a>
            <a href="#" className="hover:text-foreground hover:-translate-y-0.5 transition-all">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
