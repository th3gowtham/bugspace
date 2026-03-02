import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { StatusBadge } from "@/components/Badges";
import { Plus, FileText, Edit3, ClipboardList, Star, Trash2, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  addProgram,
  fetchEmployerPrograms,
  validateProgramForm,
  getProgram,
  updateProgram,
  deleteProgram,
} from "@/lib/programService";
import type { ProgramData } from "@/components/ProgramCard";
import { toast } from "sonner";

const steps = ["Program Info", "Scope & Rules", "Preview"];

// ─── Empty form state ─────────────────────────────────────────────────────────
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
  const [formStep, setFormStep] = useState(0);
  const [editingProgram, setEditingProgram] = useState<string | null>(null);   // display name
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null); // Firestore doc ID

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);
  const setField = (key: keyof typeof EMPTY_FORM, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // Programs list
  const [myPrograms, setMyPrograms]         = useState<ProgramData[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programFilter, setProgramFilter]   = useState<"all" | "public" | "premium">("all");
  const [programSearch, setProgramSearch]   = useState("");

  // Deletion state
  const [deletingId, setDeletingId]         = useState<string | null>(null);
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
          programName:     raw.programName,
          companyName:     raw.companyName,
          platformType:    raw.platformType,
          bountyRange:     raw.bountyRange ?? "",
          programUrl:      raw.programUrl ?? "",
          scopeRaw:        Array.isArray(raw.scope) ? raw.scope.join("\n") : "",
          programRules:    raw.programRules,
          disclosureEmail: raw.disclosureEmail,
          status:          raw.status ?? "active",
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
      if (!form.platformType)       { toast.error("Platform type is required."); return; }
    }
    if (formStep === 1) {
      const scope = form.scopeRaw.split("\n").map((s) => s.trim()).filter(Boolean);
      const err = validateProgramForm({
        programName: form.programName,
        companyName: form.companyName,
        platformType: form.platformType,
        programUrl:  form.programUrl,
        scope,
        programRules: form.programRules,
        disclosureEmail: form.disclosureEmail,
      });
      if (err) { toast.error(err); return; }
    }
    setFormStep(formStep + 1);
  };

  const handleSubmit = async () => {
    if (!firebaseUser)        { toast.error("You must be logged in."); return; }
    if (!firebaseUser.email)  { toast.error("Your account has no email address."); return; }
    const scope = form.scopeRaw.split("\n").map((s) => s.trim()).filter(Boolean);
    const payload = {
      programName:     form.programName,
      companyName:     form.companyName,
      platformType:    form.platformType,
      bountyRange:     form.bountyRange,
      programUrl:      form.programUrl,
      scope,
      programRules:    form.programRules,
      disclosureEmail: form.disclosureEmail,
      isPremium:       isPremiumProgram,
      status:          form.status,
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
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container flex-1 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Employer Dashboard</h1>

        <div className="flex gap-8">
          <aside className="hidden md:block w-56 shrink-0 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { item.id === "add" ? handleAddNew() : setActiveTab(item.id); }}
                className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </aside>

          <div className="flex-1 min-w-0">
            {activeTab === "programs" && (
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search your programs…"
                    value={programSearch}
                    onChange={(e) => setProgramSearch(e.target.value)}
                    className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Sub-filter tabs */}
                <div className="flex gap-2 mb-4">
                  {(["all", "public", "premium"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setProgramFilter(f)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        programFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {f === "premium" && <Star className="h-3 w-3" />}
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
                    if (programFilter === "public")  return !p.isPremium;
                    if (programFilter === "premium") return !!p.isPremium;
                    return true;
                  })
                  .filter((p) => {
                    if (!programSearch.trim()) return true;
                    const q = programSearch.toLowerCase();
                    return p.name.toLowerCase().includes(q) || p.company.toLowerCase().includes(q);
                  })
                  .map((prog) => (
                  <div key={prog.id} className="glass-card p-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{prog.name}</p>
                        <StatusBadge status={prog.status} />
                        {prog.isPremium && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500">
                            <Star className="h-2.5 w-2.5" />
                            Premium
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {prog.updatedDaysAgo === 0
                          ? "Submitted today"
                          : `Submitted ${prog.updatedDaysAgo}d ago`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium ${
                        i <= formStep ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>
                        {i + 1}
                      </div>
                      <span className={`text-sm ${i <= formStep ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
                      {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
                    </div>
                  ))}
                </div>

                <div className="glass-card p-6 space-y-4">
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
                        <label className="block text-sm font-medium text-foreground mb-1.5">Platform Type</label>
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
                        label="Bounty Range"
                        placeholder="e.g. $500 – $10,000"
                        value={form.bountyRange}
                        onChange={(v) => setField("bountyRange", v)}
                      />
                      <FormField
                        label="Program URL"
                        placeholder="https://company.com/security"
                        value={form.programUrl}
                        onChange={(v) => setField("programUrl", v)}
                      />
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
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
                        <label className="block text-sm font-medium text-foreground mb-1.5">Scope</label>
                        <textarea
                          rows={4}
                          placeholder="List in-scope domains, one per line..."
                          value={form.scopeRaw}
                          onChange={(e) => setField("scopeRaw", e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Rules Summary</label>
                        <textarea
                          rows={3}
                          placeholder="Brief rules and guidelines..."
                          value={form.programRules}
                          onChange={(e) => setField("programRules", e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>
                      <FormField
                        label="Disclosure Email"
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
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                            isPremiumProgram ? "bg-amber-500" : "bg-secondary"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              isPremiumProgram ? "translate-x-5" : "translate-x-0"
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

                  <div className="flex justify-between pt-2">
                    <button
                      onClick={() => setFormStep(Math.max(0, formStep - 1))}
                      className={`rounded-md border border-border px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary transition-colors ${formStep === 0 ? "invisible" : ""}`}
                    >
                      Back
                    </button>
                    {formStep < 2 ? (
                      <button
                        onClick={handleContinue}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Continue
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {submitting ? "Submitting…" : "Submit for Approval"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
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
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

export default EmployerDashboard;
