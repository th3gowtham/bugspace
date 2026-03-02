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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="container relative py-24 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl mx-auto leading-[1.1] animate-fade-in">
            Discover and Track Bug Bounty Programs in{" "}
            <span className="text-gradient">Real-Time</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Monitor new launches, scope updates, and opportunities across platforms and self-hosted programs.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Browse Programs
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-6 py-3 text-sm font-medium text-secondary-foreground hover:bg-muted transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Programs */}
      <section className="container py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Featured Programs</h2>
            <p className="text-sm text-muted-foreground mt-1">Top bug bounty programs actively seeking researchers</p>
          </div>
          <Link to="/browse" className="text-sm font-medium text-primary hover:underline hidden sm:inline-flex items-center gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredPrograms.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border">
        <div className="container py-16">
          <h2 className="text-2xl font-semibold text-foreground text-center mb-12">Platform Features</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="text-center md:text-left">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary mb-4">
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
