import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProgramCard } from "@/components/ProgramCard";
import { mockPrograms } from "@/data/mockPrograms";
import { ArrowRight, Radio, Search, GitBranch } from "lucide-react";

const featuredPrograms = mockPrograms.slice(0, 6);

const features = [
  {
    icon: Radio,
    title: "Real-Time Program Updates",
    description: "Get instant notifications when programs launch, update scope, or change bounty ranges.",
  },
  {
    icon: Search,
    title: "Centralized Discovery",
    description: "Browse programs from HackerOne, Bugcrowd, Intigriti, and self-hosted programs in one place.",
  },
  {
    icon: GitBranch,
    title: "Track Scope Changes",
    description: "Monitor scope additions and removals with a detailed changelog for every program.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden section-depth">
        {/* Animated background blobs */}
        <div className="hero-blob w-[600px] h-[600px] -top-40 -left-32 bg-primary/20 animate-pulse-glow" />
        <div className="hero-blob w-[500px] h-[500px] -top-20 -right-24 bg-violet-500/15 animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="hero-blob w-[400px] h-[400px] bottom-0 left-1/2 -translate-x-1/2 bg-primary/10" />

        <div className="container relative py-28 md:py-36 text-center">
          {/* Badge pill */}
          <div
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6 animate-fade-in"
            style={{ animationDelay: "0s" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Live program tracking — updated in real time
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.08] animate-fade-in" style={{ animationDelay: "0.05s" }}>
            Discover and Track Bug Bounty Programs in{" "}
            <span className="text-gradient">Real-Time</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.12s" }}>
            Monitor new launches, scope updates, and opportunities across platforms and self-hosted programs — all in one place.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <Link
              to="/browse"
              className="btn-gradient inline-flex items-center gap-2 rounded-lg px-7 py-3 text-sm font-semibold shadow-lg"
            >
              Browse Programs
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-7 py-3 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          {/* Social proof numbers */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-8 text-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
            {[
              { value: "500+", label: "Programs Tracked" },
              { value: "5,000+", label: "Researchers" },
              { value: "$2M+", label: "Bounties Discovered" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Programs */}
      <section className="container py-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Featured Programs</h2>
            <p className="text-sm text-muted-foreground mt-1">Top bug bounty programs actively seeking researchers</p>
          </div>
          <Link to="/browse" className="text-sm font-medium text-primary hover:underline hidden sm:inline-flex items-center gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredPrograms.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border section-depth">
        <div className="container py-20">
          <h2 className="text-2xl font-bold text-foreground text-center mb-14">Platform Features</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card p-6 text-center md:text-left"
              >
                <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10 text-primary mb-4">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
