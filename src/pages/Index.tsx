import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProgramCard } from "@/components/ProgramCard";
import { mockPrograms } from "@/data/mockPrograms";
import { ArrowRight, Radio, Search, GitBranch, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const featuredPrograms = mockPrograms.slice(0, 6);

const features = [
  {
    icon: Search,
    title: "Centralized Discovery",
    description: "Browse curated programs from HackerOne, Bugcrowd, Intigriti, and premier self-hosted platforms.",
    delay: "100ms"
  },
  {
    icon: Radio,
    title: "Real-Time Updates",
    description: "Instantly receive notifications when new programs launch or immediately when scope updates occur.",
    delay: "200ms"
  },
  {
    icon: ShieldCheck,
    title: "Premium Target Intelligence",
    description: "Unlock exclusive, high-value vulnerabilities and in-depth reconnaissance data in our premium tiers.",
    delay: "300ms"
  },
];

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32 lg:pt-36 lg:pb-40 border-b border-border/40">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px]" />

        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] -translate-y-1/2 -translate-x-1/2 animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[128px] translate-y-1/2 translate-x-1/2" />

        <div className="container relative text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-8 animate-fade-in shadow-[0_0_15px_rgba(var(--primary),0.1)]"
            style={{ animationDelay: "50ms" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Live Program Tracking Engine
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter max-w-5xl mx-auto leading-[1.1] animate-fade-in text-foreground" style={{ animationDelay: "150ms" }}>
            Discover and Track High-Value <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-primary/90 to-amber-500 drop-shadow-sm">Bug Bounty Programs</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in leading-relaxed" style={{ animationDelay: "250ms" }}>
            The premier platform for security researchers. Monitor new launches, track scope updates, and hunt vulnerabilities across top platforms in real-time.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "350ms" }}>
            <Link
              to="/browse"
              className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 hover:shadow-lg hover:shadow-primary/25 overflow-hidden w-full sm:w-auto"
            >
              <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative flex items-center gap-2">
                Start Hunting
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-border/50 bg-background/50 backdrop-blur-sm px-8 py-3.5 text-sm font-bold text-foreground hover:bg-secondary hover:border-border transition-all w-full sm:w-auto"
            >
              Create Free Account
            </Link>
          </div>

          {/* Social Proof Stats */}
          <div className="mt-20 pt-10 border-t border-border/50 max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-12 sm:gap-24 animate-fade-in" style={{ animationDelay: "500ms" }}>
            {[
              { value: "500+", label: "Programs Tracked" },
              { value: "5,000+", label: "Researchers" },
              { value: "$2M+", label: "Bounties Paid" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <p className="text-3xl md:text-4xl font-black text-foreground tracking-tight drop-shadow-sm">{stat.value}</p>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Programs Section */}
      <section className="relative py-24 bg-secondary/30">
        <div className="container relative">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Featured Programs</h2>
              <p className="text-base text-muted-foreground mt-2">Elite bug bounty programs actively seeking vulnerabilities.</p>
            </div>
            <Link
              to="/browse"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-full transition-colors"
            >
              Explore All <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPrograms.map((program, idx) => (
              <div
                key={program.id}
                className="animate-fade-in"
                style={{ animationDelay: `${(idx % 6) * 100}ms`, animationFillMode: 'both' }}
              >
                <ProgramCard program={program} className="h-full bg-background/50 backdrop-blur-sm" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 border-t border-border/40 relative overflow-hidden">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Built for Researchers</h2>
            <p className="mt-4 text-base text-muted-foreground">Everything you need to stay ahead of the curve and maximize your bounty hunting efficiency.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative glass-card p-8 hover:-translate-y-2 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 animate-fade-in border border-border/50 hover:border-primary/30"
                style={{ animationDelay: feature.delay, animationFillMode: 'both' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-primary/5 border-t border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px]" />
        <div className="container relative text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">Ready to find your next bounty?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">Join thousands of security researchers uncovering the web's most critical vulnerabilities.</p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 shadow-xl shadow-primary/20"
          >
            Create Your Account
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
