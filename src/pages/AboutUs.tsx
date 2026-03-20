import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Shield,
  Search,
  BookOpen,
  Bookmark,
  GraduationCap,
  Target,
  ArrowRight,
  Users,
  Lightbulb,
  Zap,
  CheckCircle2,
  Globe,
} from "lucide-react";

// ── SEO helpers ────────────────────────────────────────────────────────────────
function setMeta(name: string, content: string, property = false) {
  const attr = property ? "property" : "name";
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// ── Data ───────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: Search,
    title: "Bug Bounty Discovery",
    description:
      "Find programs from HackerOne, Bugcrowd, Intigriti, and self-hosted platforms in one centralised hub.",
  },
  {
    icon: BookOpen,
    title: "Exclusive Vulnerability Reports",
    description:
      "Deep-dive write-ups and real-world bug reports curated for serious researchers.",
  },
  {
    icon: Target,
    title: "Research Tracking Tools",
    description:
      "Track scope changes, manage submissions, and monitor bounty payouts with precision.",
  },
  {
    icon: Bookmark,
    title: "Bookmarking System",
    description:
      "Save programs, reports, and notes for later so nothing falls through the cracks.",
  },
  {
    icon: GraduationCap,
    title: "Learning Resources",
    description:
      "Structured resources to sharpen your skills — from recon to complex chain exploits.",
  },
];

const whyPoints = [
  {
    icon: Zap,
    title: "Fast Program Discovery",
    description:
      "Real-time updates mean you never miss a newly launched or updated program.",
  },
  {
    icon: Lightbulb,
    title: "Learn from Real Bugs",
    description:
      "Exclusive reports written by researchers, for researchers — theory meets practice.",
  },
  {
    icon: CheckCircle2,
    title: "Workflow Management",
    description:
      "Everything from bookmarks to notes lives in one place, keeping your research organised.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
const AboutUs = () => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title =
      "About BugSpace - Bug Bounty Platform for Security Researchers";

    setMeta(
      "description",
      "BugSpace is a bug bounty platform for ethical hackers to discover programs, learn vulnerabilities, and track reports efficiently."
    );
    setMeta(
      "keywords",
      "bug bounty platform, ethical hacking, cybersecurity tools, bug bounty programs, security researcher platform, vulnerability learning"
    );

    // Open Graph
    setMeta("og:title", "About BugSpace - Bug Bounty Platform for Security Researchers", true);
    setMeta(
      "og:description",
      "BugSpace is a bug bounty platform for ethical hackers to discover programs, learn vulnerabilities, and track reports efficiently.",
      true
    );
    setMeta("og:type", "website", true);
    setMeta("og:url", window.location.href, true);

    // Twitter card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", "About BugSpace - Bug Bounty Platform for Security Researchers");
    setMeta(
      "twitter:description",
      "BugSpace is a bug bounty platform for ethical hackers to discover programs, learn vulnerabilities, and track reports efficiently."
    );

    return () => {
      document.title = prevTitle;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden section-depth">
        {/* Animated background blobs */}
        <div className="hero-blob w-[550px] h-[550px] -top-32 -left-24 bg-primary/20 animate-pulse-glow" />
        <div
          className="hero-blob w-[450px] h-[450px] -top-16 -right-20 bg-violet-500/15 animate-float"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="hero-blob w-[380px] h-[380px] bottom-0 left-1/2 -translate-x-1/2 bg-primary/10" />

        <div className="container relative py-28 md:py-36 text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6 animate-fade-in"
            style={{ animationDelay: "0s" }}
          >
            <Shield className="h-3.5 w-3.5" />
            Cybersecurity · Built for Researchers
          </div>

          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.08] animate-fade-in"
            style={{ animationDelay: "0.05s" }}
          >
            About{" "}
            <span className="text-gradient">BugSpace</span>
          </h1>

          <p
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in"
            style={{ animationDelay: "0.12s" }}
          >
            A modern bug bounty platform for ethical hackers and security
            researchers — built to simplify discovery, learning, and tracking.
          </p>

          {/* Stats */}
          <div
            className="mt-14 flex flex-wrap items-center justify-center gap-10 text-center animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            {[
              { value: "500+", label: "Programs Tracked" },
              { value: "5,000+", label: "Researchers" },
              { value: "11", label: "Team Members" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ───────────────────────────────────────────────────────── */}
      <section className="container py-24">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Icon column */}
          <div className="flex justify-center md:justify-end">
            <div className="relative">
              <div className="h-40 w-40 rounded-3xl bg-primary/10 flex items-center justify-center glow-primary">
                <Shield className="h-20 w-20 text-primary" />
              </div>
              {/* Orbiting dots */}
              <span className="absolute -top-3 -right-3 h-5 w-5 rounded-full bg-violet-500/70 blur-sm animate-pulse" />
              <span className="absolute -bottom-3 -left-3 h-4 w-4 rounded-full bg-primary/60 blur-sm animate-pulse" style={{ animationDelay: "1s" }} />
            </div>
          </div>

          {/* Text column */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Our Mission
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-5">
              Simplifying Bug Bounty Hunting
            </h2>
            <p className="text-muted-foreground leading-relaxed text-base">
              At BugSpace, we believe every security researcher deserves powerful
              tools without the clutter. Our mission is to simplify bug bounty
              hunting by providing a unified platform to{" "}
              <span className="text-foreground font-medium">discover</span>,{" "}
              <span className="text-foreground font-medium">learn</span>, and{" "}
              <span className="text-foreground font-medium">track</span>{" "}
              vulnerabilities — so you can focus on what you do best: finding bugs.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="border-t border-border section-depth">
        <div className="container py-24">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
              Platform Capabilities
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Everything You Need to Hunt
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-sm">
              Five focused tools designed around the actual workflow of a
              security researcher.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="glass-card p-6 animate-fade-in"
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary mb-5">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why BugSpace ──────────────────────────────────────────────────── */}
      <section className="container py-24">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
            Why Choose Us
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Built Around Your Workflow
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-sm">
            BugSpace helps researchers discover programs, learn from real
            vulnerability reports, and manage their research workflow efficiently.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {whyPoints.map((point, i) => (
            <div
              key={point.title}
              className="glass-card p-8 text-center animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-5 mx-auto">
                <point.icon className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-3">
                {point.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Founder ───────────────────────────────────────────────────────── */}
      <section className="border-t border-border section-depth">
        <div className="container py-24">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
              The Founder
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              The Person Behind BugSpace
            </h2>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="glass-card p-8 text-center animate-fade-in">
              {/* Avatar */}
              <div className="relative inline-block mb-6">
                <div className="h-24 w-24 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-white btn-gradient">
                  GB
                </div>
                <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-success border-2 border-card" />
              </div>

              <h3 className="text-xl font-bold text-foreground">GowthamBalaji</h3>
              <p className="text-sm text-primary font-medium mt-1 mb-4">
                Founder · BugSpace &amp; hackthedisk
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                GowthamBalaji is the creator of BugSpace and hackthedisk, with a
                deep focus on building practical tools for the cybersecurity
                researcher community. His mission is to lower the barrier to entry
                for bug bounty hunting and make world-class security tooling
                accessible to everyone.
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <a
                  href="https://hackthedisk.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  hackthedisk.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Team ──────────────────────────────────────────────────────────── */}
      <section className="container py-24">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
            The Team
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Powered by 11 Passionate People
          </h2>

          <div className="glass-card p-10 animate-fade-in">
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 text-primary">
                <Users className="h-8 w-8" />
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed text-base max-w-xl mx-auto">
              BugSpace is powered by a dedicated team of{" "}
              <span className="text-foreground font-semibold">11 members</span>{" "}
              — researchers, developers, and designers — united by a shared
              passion for building tools that matter for the global cybersecurity
              ecosystem.
            </p>

            {/* Avatars row */}
            <div className="mt-8 flex items-center justify-center">
              {Array.from({ length: 11 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-9 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-xs font-bold text-primary"
                  style={{ marginLeft: i === 0 ? 0 : "-10px", zIndex: 11 - i }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="border-t border-border section-depth">
        <div className="container py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Start Hunting?
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto mb-10">
            Join thousands of ethical hackers already using BugSpace to discover
            programs, learn from real reports, and manage their research.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              id="about-cta-get-started"
              className="btn-gradient inline-flex items-center gap-2 rounded-lg px-8 py-3.5 text-sm font-semibold shadow-lg"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/browse"
              id="about-cta-browse"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-8 py-3.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              Browse Programs
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUs;
