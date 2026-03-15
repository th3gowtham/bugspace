import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { StatusBadge } from "@/components/Badges";
import { Plus, FileText, Edit3, ClipboardList, Star, Trash2, Search, Bug, Tag, ChevronDown, X, PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  addProgram,
  fetchEmployerPrograms,
  validateProgramForm,
  getProgram,
  updateProgram,
  deleteProgram,
} from "@/lib/programService";
import {
  fetchEmployerBugs,
  fetchCategories,
  addExclusiveBug,
  updateExclusiveBug,
  deleteExclusiveBug,
  addCategory,
  deleteCategory,
  type ExclusiveBug,
  type ExclusiveBugInput,
  type ExclusiveBugCategory,
  type BugCurrency,
} from "@/lib/exclusiveBugService";
import type { ProgramData } from "@/components/ProgramCard";
import { toast } from "sonner";

const steps = ["Program Info", "Scope & Rules", "Preview"];

// ─── Empty form state ─────────────────────────────────────────────────────────
// ─── Exclusive Bugs helpers ──────────────────────────────────────────────────

const BUG_CURRENCIES: BugCurrency[] = ["USD", "INR", "EUR", "GBP", "AUD"];

function blankBugForm(): ExclusiveBugInput {
  return {
    title: "", summary: "", stepsToReproduce: "",
    pocLink: "", referenceLink: "",
    bountyAmount: 0, currency: "USD",
    categoryId: "", categoryName: "",
    accessType: "premium",
  };
}

// ─── Empty program form state ─────────────────────────────────────────────────

const EMPTY_FORM = {
  programName: "",
  companyName: "",
  platformType: "self-hosted",
  bountyRange: "",
  programUrl: "",
  scopeRaw: "",       // raw textarea – split on newlines before submit
  programRules: "",
  disclosureEmail: "",
  status: "active",
};

const EmployerDashboard = () => {
  const { firebaseUser } = useAuth();

  const [activeTab, setActiveTab] = useState("programs");

  // ── Exclusive Bugs state ────────────────────────────────────────────────────
  const [myBugs, setMyBugs] = useState<ExclusiveBug[]>([]);
  const [categories, setCategories] = useState<ExclusiveBugCategory[]>([]);
  const [bugsLoading, setBugsLoading] = useState(false);
  const [bugForm, setBugForm] = useState<ExclusiveBugInput>(blankBugForm());
  const [editingBug, setEditingBug] = useState<ExclusiveBug | null>(null);
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [deleteBugTarget, setDeleteBugTarget] = useState<ExclusiveBug | null>(null);
  const [bugSearch, setBugSearch] = useState("");
  const [filterBugCat, setFilterBugCat] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [formStep, setFormStep] = useState(0);
  const [editingProgram, setEditingProgram] = useState<string | null>(null);   // display name
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null); // Firestore doc ID

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);
  const setField = (key: keyof typeof EMPTY_FORM, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // Programs list
  const [myPrograms, setMyPrograms] = useState<ProgramData[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programFilter, setProgramFilter] = useState<"all" | "public" | "premium">("all");
  const [programSearch, setProgramSearch] = useState("");

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isPremiumProgram, setIsPremiumProgram] = useState(false);

  // Fetch employer's programs whenever submitted changes
  useEffect(() => {
    if (!firebaseUser) return;
    setProgramsLoading(true);
    fetchEmployerPrograms(firebaseUser.uid)
      .then(setMyPrograms)
      .catch(() => toast.error("Failed to load your programs."))
      .finally(() => setProgramsLoading(false));
  }, [firebaseUser, submitted]);

  // ── Load exclusive bugs + categories ─────────────────────────────────────
  const loadBugsData = useCallback(async () => {
    if (!firebaseUser) return;
    setBugsLoading(true);
    try {
      const [bugData, catData] = await Promise.all([
        fetchEmployerBugs(firebaseUser.uid),
        fetchCategories(),
      ]);
      setMyBugs(bugData);
      setCategories(catData);
    } catch {
      toast.error("Failed to load exclusive bugs.");
    } finally {
      setBugsLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (activeTab === "exclusive-bugs") loadBugsData();
  }, [activeTab, loadBugsData]);

  // ── Exclusive bug handlers ────────────────────────────────────────────────
  function openAddBug() {
    setEditingBug(null);
    setBugForm(blankBugForm());
    setShowBugModal(true);
  }

  function openEditBug(bug: ExclusiveBug) {
    setEditingBug(bug);
    setBugForm({
      title: bug.title, summary: bug.summary,
      stepsToReproduce: bug.stepsToReproduce,
      pocLink: bug.pocLink, referenceLink: bug.referenceLink,
      bountyAmount: bug.bountyAmount, currency: bug.currency,
      categoryId: bug.categoryId, categoryName: bug.categoryName,
      accessType: bug.accessType ?? "premium",
    });
    setShowBugModal(true);
  }

  async function handleBugSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!firebaseUser) return;
    if (!bugForm.title.trim() || !bugForm.summary.trim()) {
      toast.error("Title and summary are required."); return;
    }
    if (!bugForm.categoryId) {
      toast.error("Please select a category."); return;
    }
    setBugSubmitting(true);
    try {
      if (editingBug) {
        await updateExclusiveBug(editingBug.bugId, bugForm);
        toast.success("Bug updated.");
      } else {
        await addExclusiveBug(bugForm, firebaseUser.uid);
        toast.success("Bug published.");
      }
      setShowBugModal(false);
      setEditingBug(null);
      await loadBugsData();
    } catch {
      toast.error("Failed to save bug.");
    } finally {
      setBugSubmitting(false);
    }
  }

  async function handleDeleteBug() {
    if (!deleteBugTarget) return;
    try {
      await deleteExclusiveBug(deleteBugTarget.bugId);
      toast.success("Bug deleted.");
      setDeleteBugTarget(null);
      await loadBugsData();
    } catch {
      toast.error("Failed to delete bug.");
    }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setCatSubmitting(true);
    try {
      const cat = await addCategory(newCatName);
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCatName("");
      setAddingCat(false);
      toast.success("Category created.");
    } catch {
      toast.error("Failed to create category.");
    } finally {
      setCatSubmitting(false);
    }
  }

  async function handleDeleteCategory(cat: ExclusiveBugCategory) {
    try {
      await deleteCategory(cat.categoryId);
      setCategories((prev) => prev.filter((c) => c.categoryId !== cat.categoryId));
      toast.success("Category deleted.");
    } catch {
      toast.error("Failed to delete category.");
    }
  }

  // filtered bugs
  const filteredBugs = myBugs.filter((b) => {
    if (filterBugCat && b.categoryId !== filterBugCat) return false;
    if (bugSearch.trim()) {
      const q = bugSearch.toLowerCase();
      return b.title.toLowerCase().includes(q) || b.summary.toLowerCase().includes(q);
    }
    return true;
  });

  const handleEdit = async (progId: string, progName: string) => {
    setEditingProgram(progName);
    setEditingProgramId(progId);
    setActiveTab("add");
    setFormStep(0);
    // Pre-fill form from Firestore
    try {
      const raw = await getProgram(progId);
      if (raw) {
        setForm({
          programName: raw.programName,
          companyName: raw.companyName,
          platformType: raw.platformType,
          bountyRange: raw.bountyRange ?? "",
          programUrl: raw.programUrl ?? "",
          scopeRaw: Array.isArray(raw.scope) ? raw.scope.join("\n") : "",
          programRules: raw.programRules,
          disclosureEmail: raw.disclosureEmail,
          status: raw.status ?? "active",
        });
        setIsPremiumProgram(raw.isPremium ?? false);
      }
    } catch {
      toast.error("Failed to load program data.");
    }
  };

  const handleAddNew = () => {
    setEditingProgram(null);
    setEditingProgramId(null);
    setForm(EMPTY_FORM);
    setIsPremiumProgram(false);
    setConfirmDeleteId(null);
    setSubmitted(false);
    setActiveTab("add");
    setFormStep(0);
  };

  const handleDelete = async (progId: string) => {
    if (!firebaseUser) return;
    setDeletingId(progId);
    try {
      await deleteProgram(progId, firebaseUser.uid);
      toast.success("Program deleted.");
      setConfirmDeleteId(null);
      setSubmitted((prev) => !prev);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete program.");
    } finally {
      setDeletingId(null);
    }
  };

  // Step validation before advancing
  const handleContinue = () => {
    if (formStep === 0) {
      if (!form.programName.trim()) { toast.error("Program name is required."); return; }
      if (!form.companyName.trim()) { toast.error("Company name is required."); return; }
    }
    if (formStep === 1) {
      // Validate email format if provided
      if (form.disclosureEmail.trim()) {
        const err = validateProgramForm({ programName: form.programName, companyName: form.companyName, disclosureEmail: form.disclosureEmail });
        if (err) { toast.error(err); return; }
      }
    }
    setFormStep(formStep + 1);
  };

  const handleSubmit = async () => {
    if (!firebaseUser) { toast.error("You must be logged in."); return; }
    if (!firebaseUser.email) { toast.error("Your account has no email address."); return; }
    const scope = form.scopeRaw.split("\n").map((s) => s.trim()).filter(Boolean);
    const payload = {
      programName: form.programName,
      companyName: form.companyName,
      platformType: form.platformType,
      bountyRange: form.bountyRange,
      programUrl: form.programUrl,
      scope,
      programRules: form.programRules,
      disclosureEmail: form.disclosureEmail,
      isPremium: isPremiumProgram,
      status: form.status,
    };
    const err = validateProgramForm(payload);
    if (err) { toast.error(err); return; }

    setSubmitting(true);
    try {
      if (editingProgramId) {
        // Update existing program
        await updateProgram(editingProgramId, firebaseUser.uid, payload);
        toast.success("Program updated successfully!");
      } else {
        // Create new program
        await addProgram(payload, firebaseUser.uid, firebaseUser.email);
        toast.success("Program published successfully!");
      }
      setForm(EMPTY_FORM);
      setFormStep(0);
      setIsPremiumProgram(false);
      setEditingProgramId(null);
      setEditingProgram(null);
      setConfirmDeleteId(null);
      setSubmitted((prev) => !prev);
      setActiveTab("programs");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit program.");
    } finally {
      setSubmitting(false);
    }
  };

  const sidebarItems = [
    { id: "programs", label: "My Programs", icon: FileText },
    { id: "add", label: "Add Program", icon: Plus },
    { id: "exclusive-bugs", label: "Exclusive Bugs Manager", icon: Bug },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px] pointer-events-none" />
      <div className="absolute top-1/4 left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none opacity-40" />

      <Navbar />
      <div className="container flex-1 py-10 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <h1 className="text-3xl font-extrabold text-foreground mb-8 tracking-tight">Employer Dashboard</h1>

        <div className="flex gap-8">
          <aside className="hidden md:block w-56 shrink-0 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { item.id === "add" ? handleAddNew() : setActiveTab(item.id); }}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${activeTab === item.id ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </aside>

          <div className="flex-1 min-w-0">
            {activeTab === "programs" && (
              <div className="space-y-3">
                {/* Search */}
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search your programs…"
                    value={programSearch}
                    onChange={(e) => setProgramSearch(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/50 py-3 pl-11 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                  />
                </div>

                {/* Sub-filter tabs */}
                <div className="flex gap-2 mb-6">
                  {(["all", "public", "premium"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setProgramFilter(f)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm ${programFilter === f
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border/60 bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                    >
                      {f === "premium" && <Star className="h-4 w-4" />}
                      {f === "all" ? "All Programs" : f === "public" ? "Public" : "Premium"}
                    </button>
                  ))}
                </div>

                {programsLoading && (
                  <p className="text-sm text-muted-foreground">Loading your programs…</p>
                )}

                {!programsLoading && myPrograms.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">You haven't submitted any programs yet.</p>
                  </div>
                )}

                {myPrograms
                  .filter((p) => {
                    if (programFilter === "public") return !p.isPremium;
                    if (programFilter === "premium") return !!p.isPremium;
                    return true;
                  })
                  .filter((p) => {
                    if (!programSearch.trim()) return true;
                    const q = programSearch.toLowerCase();
                    return p.name.toLowerCase().includes(q) || p.company.toLowerCase().includes(q);
                  })
                  .map((prog) => (
                    <div key={prog.id} className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl -mr-12 -mt-12 pointer-events-none" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-foreground text-lg tracking-tight">{prog.name}</p>
                          <StatusBadge status={prog.status} />
                          {prog.isPremium && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-500">
                              <Star className="h-3 w-3" />
                              Premium
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mt-1.5">
                          {prog.updatedDaysAgo === 0
                            ? "Submitted today"
                            : `Submitted ${prog.updatedDaysAgo}d ago`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 relative z-10">
                        <button
                          onClick={() => handleEdit(prog.id, prog.name)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        {confirmDeleteId === prog.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Delete?</span>
                            <button
                              onClick={() => handleDelete(prog.id)}
                              disabled={deletingId === prog.id}
                              className="text-xs font-medium text-destructive hover:underline disabled:opacity-60"
                            >
                              {deletingId === prog.id ? "Deleting…" : "Yes"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs font-medium text-muted-foreground hover:underline"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(prog.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    Want to add another program?{" "}
                    <button onClick={handleAddNew} className="text-primary hover:underline font-medium">
                      Add Program
                    </button>
                  </p>
                </div>
              </div>
            )}

            {activeTab === "exclusive-bugs" && (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Exclusive Bugs Manager</h2>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setShowCatManager((v) => !v)}
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <Tag className="h-4 w-4" />
                      Manage Categories
                    </button>
                    <button
                      onClick={openAddBug}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Create Bug
                    </button>
                  </div>
                </div>

                {/* Category manager panel */}
                {showCatManager && (
                  <div className="glass-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Categories</p>
                      <button
                        onClick={() => setAddingCat((v) => !v)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add New
                      </button>
                    </div>
                    {addingCat && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          placeholder="Category name"
                          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                        />
                        <button
                          onClick={handleAddCategory}
                          disabled={catSubmitting || !newCatName.trim()}
                          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                        >
                          {catSubmitting ? "…" : "Create"}
                        </button>
                        <button onClick={() => { setAddingCat(false); setNewCatName(""); }} className="text-muted-foreground hover:text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {categories.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No categories yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                          <div key={cat.categoryId} className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs">
                            <span className="text-foreground">{cat.name}</span>
                            <button
                              onClick={() => handleDeleteCategory(cat)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete category"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search bugs…"
                      value={bugSearch}
                      onChange={(e) => setBugSearch(e.target.value)}
                      className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="relative min-w-[150px]">
                    <select
                      value={filterBugCat}
                      onChange={(e) => setFilterBugCat(e.target.value)}
                      className="appearance-none w-full rounded-md border border-input bg-background px-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">All categories</option>
                      {categories.map((c) => (
                        <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>

                {/* Table */}
                <div className="glass-card overflow-hidden">
                  {bugsLoading ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
                  ) : filteredBugs.length === 0 ? (
                    <div className="py-12 text-center">
                      <Bug className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {myBugs.length === 0 ? "No bugs published yet. Create your first one!" : "No bugs match your filters."}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/60 bg-secondary/30">
                            <th className="px-5 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Bug Title</th>
                            <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Category</th>
                            <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-right">Bounty</th>
                            <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Created</th>
                            <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredBugs.map((bug) => (
                            <tr key={bug.bugId} className="hover:bg-secondary/30 transition-colors">
                              <td className="px-5 py-3.5">
                                <p className="font-medium text-foreground truncate max-w-[220px]" title={bug.title}>{bug.title}</p>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                  {bug.categoryName}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right font-semibold text-green-400 text-xs">
                                {bug.currency} {bug.bountyAmount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3.5 text-muted-foreground text-xs">{bug.createdAt.toLocaleDateString()}</td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openEditBug(bug)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                    title="Edit"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteBugTarget(bug)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "add" && (
              <div className="max-w-lg">
                {editingProgram && (
                  <div className="mb-4 flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Editing: {editingProgram}</span>
                  </div>
                )}
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-8">
                  {steps.map((step, i) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium ${i <= formStep ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        }`}>
                        {i + 1}
                      </div>
                      <span className={`text-sm ${i <= formStep ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
                      {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
                    </div>
                  ))}
                </div>

                <div className="glass-card p-6 md:p-8 space-y-6 relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

                  <div className="relative z-10 space-y-5">
                    {formStep === 0 && (
                      <>
                        <FormField
                          label="Program Name"
                          placeholder="e.g. Acme Security"
                          value={form.programName}
                          onChange={(v) => setField("programName", v)}
                        />
                        <FormField
                          label="Company Name"
                          placeholder="e.g. Acme Inc."
                          value={form.companyName}
                          onChange={(v) => setField("companyName", v)}
                        />
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">Platform Type <span className="text-muted-foreground font-normal">(optional)</span></label>
                          <select
                            value={form.platformType}
                            onChange={(e) => setField("platformType", e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="self-hosted">Self-Hosted</option>
                            <option value="hackerone">HackerOne</option>
                            <option value="bugcrowd">Bugcrowd</option>
                            <option value="intigriti">Intigriti</option>
                          </select>
                        </div>
                        <FormField
                          label="Bounty Range (optional)"
                          placeholder="e.g. $500 – $10,000"
                          value={form.bountyRange}
                          onChange={(v) => setField("bountyRange", v)}
                        />
                        <FormField
                          label="Program URL (optional)"
                          placeholder="https://company.com/security"
                          value={form.programUrl}
                          onChange={(v) => setField("programUrl", v)}
                        />
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">Status <span className="text-muted-foreground font-normal">(optional)</span></label>
                          <select
                            value={form.status}
                            onChange={(e) => setField("status", e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="closed">Closed</option>
                            <option value="inactive">Inactive (hidden from researchers)</option>
                          </select>
                        </div>
                      </>
                    )}

                    {formStep === 1 && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">Scope <span className="text-muted-foreground font-normal">(optional)</span></label>
                          <textarea
                            rows={4}
                            placeholder="List in-scope domains, one per line..."
                            value={form.scopeRaw}
                            onChange={(e) => setField("scopeRaw", e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">Rules Summary <span className="text-muted-foreground font-normal">(optional)</span></label>
                          <textarea
                            rows={3}
                            placeholder="Brief rules and guidelines..."
                            value={form.programRules}
                            onChange={(e) => setField("programRules", e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                        </div>
                        <FormField
                          label="Disclosure Email (optional)"
                          placeholder="security@company.com"
                          type="email"
                          value={form.disclosureEmail}
                          onChange={(v) => setField("disclosureEmail", v)}
                        />
                      </>
                    )}

                    {formStep === 2 && (
                      <div className="space-y-5">
                        {/* Premium toggle */}
                        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">Premium Program</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Visible to paid subscribers only</p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isPremiumProgram}
                            onClick={() => setIsPremiumProgram((v) => !v)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${isPremiumProgram ? "bg-amber-500" : "bg-secondary"
                              }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${isPremiumProgram ? "translate-x-5" : "translate-x-0"
                                }`}
                            />
                          </button>
                        </div>

                        <div className="text-center py-6 space-y-3">
                          <ClipboardList className="h-10 w-10 text-primary mx-auto" />
                          <h3 className="text-lg font-semibold text-foreground">Ready to Submit</h3>
                          <p className="text-sm text-muted-foreground">Review your program details and submit for admin approval.</p>
                        </div>

                        {/* Delete button (edit mode only) */}
                        {editingProgramId && (
                          <div className="border-t border-border pt-4">
                            {confirmDeleteId === editingProgramId ? (
                              <div className="flex items-center gap-3">
                                <p className="text-sm text-muted-foreground flex-1">Are you sure you want to permanently delete this program?</p>
                                <button
                                  onClick={() => handleDelete(editingProgramId)}
                                  disabled={!!deletingId}
                                  className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-60"
                                >
                                  {deletingId ? "Deleting…" : "Yes, Delete"}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(editingProgramId)}
                                className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Program
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between pt-4 relative z-10">
                      <button
                        onClick={() => setFormStep(Math.max(0, formStep - 1))}
                        className={`rounded-xl border border-border/60 bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:bg-secondary hover:border-foreground/20 transition-all shadow-sm ${formStep === 0 ? "invisible" : ""}`}
                      >
                        Back
                      </button>
                      {formStep < 2 ? (
                        <button
                          onClick={handleContinue}
                          className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        >
                          Continue
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? "Submitting…" : "Submit for Approval"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />

      {/* ── Create / Edit Bug Modal ───────────────────────────────────────── */}
      {showBugModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border/50 glass-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/40 relative z-10">
              <h2 className="text-base font-semibold text-foreground">
                {editingBug ? "Edit Exclusive Bug" : "Create Exclusive Bug"}
              </h2>
              <button onClick={() => { setShowBugModal(false); setEditingBug(null); }} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleBugSubmit} className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Bug Title *</label>
                <input required value={bugForm.title} onChange={(e) => setBugForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Stored XSS via profile bio"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              {/* Summary */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Summary *</label>
                <textarea required rows={3} value={bugForm.summary} onChange={(e) => setBugForm((p) => ({ ...p, summary: e.target.value }))}
                  placeholder="Brief description of the vulnerability…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              {/* Steps to Reproduce */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Steps to Reproduce</label>
                <textarea rows={4} value={bugForm.stepsToReproduce} onChange={(e) => setBugForm((p) => ({ ...p, stepsToReproduce: e.target.value }))}
                  placeholder="1. Navigate to...&#10;2. Insert payload...&#10;3. Observe..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              {/* PoC + Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">PoC Link</label>
                  <input type="url" value={bugForm.pocLink} onChange={(e) => setBugForm((p) => ({ ...p, pocLink: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Reference Blog Link</label>
                  <input type="url" value={bugForm.referenceLink} onChange={(e) => setBugForm((p) => ({ ...p, referenceLink: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              {/* Amount + Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Bounty Amount Earned</label>
                  <input type="number" min={0} step={0.01}
                    value={bugForm.bountyAmount || ""} onChange={(e) => setBugForm((p) => ({ ...p, bountyAmount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Currency</label>
                  <div className="relative">
                    <select value={bugForm.currency} onChange={(e) => setBugForm((p) => ({ ...p, currency: e.target.value as BugCurrency }))}
                      className="appearance-none w-full rounded-md border border-input bg-background px-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      {BUG_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </div>
              {/* Category selector */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Category *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCatDropdownOpen((v) => !v)}
                    className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <span className={bugForm.categoryId ? "text-foreground" : "text-muted-foreground"}>
                      {bugForm.categoryId ? bugForm.categoryName : "Select category…"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                  {catDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setCatDropdownOpen(false)} />
                      <div className="absolute left-0 top-full mt-1 z-20 w-full rounded-md border border-border bg-card shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-border">
                          <input
                            autoFocus
                            type="text"
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            placeholder="Search categories…"
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {categories
                            .filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                            .map((cat) => (
                              <button
                                key={cat.categoryId}
                                type="button"
                                onClick={() => { setBugForm((p) => ({ ...p, categoryId: cat.categoryId, categoryName: cat.name })); setCatDropdownOpen(false); setCategorySearch(""); }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors ${bugForm.categoryId === cat.categoryId ? "font-medium text-primary" : "text-foreground"
                                  }`}
                              >
                                {cat.name}
                              </button>
                            ))}
                          {categories.filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                            <p className="px-3 py-2 text-sm text-muted-foreground">No categories match.</p>
                          )}
                        </div>
                        <div className="border-t border-border p-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newCatName}
                              onChange={(e) => setNewCatName(e.target.value)}
                              placeholder="New category name"
                              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                            />
                            <button
                              type="button"
                              onClick={handleAddCategory}
                              disabled={catSubmitting || !newCatName.trim()}
                              className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
                            >
                              {catSubmitting ? "…" : "Add"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Free / Premium toggle */}
              <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Access Type</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bugForm.accessType === "premium" ? "Premium only — requires active subscription" : "Free — accessible to all logged-in users"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium ${bugForm.accessType === "free" ? "text-green-400" : "text-muted-foreground"}`}>Free</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={bugForm.accessType === "premium"}
                    onClick={() => setBugForm((p) => ({ ...p, accessType: p.accessType === "premium" ? "free" : "premium" }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${bugForm.accessType === "premium" ? "bg-amber-500" : "bg-green-500"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${bugForm.accessType === "premium" ? "translate-x-5" : "translate-x-0"
                        }`}
                    />
                  </button>
                  <span className={`text-xs font-medium ${bugForm.accessType === "premium" ? "text-amber-400" : "text-muted-foreground"}`}>Premium</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setShowBugModal(false); setEditingBug(null); }}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={bugSubmitting}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {bugSubmitting ? "Saving…" : editingBug ? "Update Bug" : "Publish Bug"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Bug Confirm ────────────────────────────────────────────── */}
      {deleteBugTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-red-500/10 p-2.5"><Trash2 className="h-5 w-5 text-red-400" /></div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Delete Bug</h2>
                <p className="text-xs text-muted-foreground">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Delete <span className="font-medium text-foreground">{deleteBugTarget.title}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteBugTarget(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteBug}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function FormField({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-foreground mb-2">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
      />
    </div>
  );
}

export default EmployerDashboard;
