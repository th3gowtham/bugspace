import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  FolderOpen, FolderPlus, FileText, FilePlus, Trash2, Edit3,
  Search, X, BookOpen, Bold, Italic, Code, Link2, List,
  Heading2, Code2, ChevronRight, Check, Save,
  Share2, Eye, Users, Bell, UserCheck, UserX,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  fetchFolders,
  fetchPages,
  fetchFolderPages,
  addFolder,
  renameFolder,
  deleteFolder,
  addPage,
  renamePage,
  savePage,
  deletePage,
  decodeContent,
  searchNotes,
} from "@/lib/notesService";
import {
  createShare, fetchSentShares, fetchReceivedShares,
  acceptShare, rejectShare, deleteShare, updateSharePermission,
} from "@/lib/notesShareService";
import type { NoteFolder, NotePage, NoteShare, SearchResult } from "@/types/notes";

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTOSAVE_MS = 10_000;

// ─── Toolbar helpers ──────────────────────────────────────────────────────────

function wrapSelection(
  ta: HTMLTextAreaElement,
  prefix: string,
  suffix = prefix,
  placeholder = "text",
): string {
  const { selectionStart: s, selectionEnd: e, value: v } = ta;
  const sel = v.slice(s, e) || placeholder;
  return v.slice(0, s) + prefix + sel + suffix + v.slice(e);
}

function insertLinePrefix(ta: HTMLTextAreaElement, prefix: string): string {
  const { selectionStart: s, value: v } = ta;
  const lineStart = v.lastIndexOf("\n", s - 1) + 1;
  const lineEnd = v.indexOf("\n", s);
  const end = lineEnd === -1 ? v.length : lineEnd;
  return v.slice(0, lineStart) + prefix + v.slice(lineStart, end) + v.slice(end);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InlineRename({
  value, onSave, onCancel, className = "",
}: { value: string; onSave: (v: string) => void; onCancel: () => void; className?: string }) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.select(); }, []);
  return (
    <input
      ref={ref}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); onSave(v); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }}
      onBlur={() => onSave(v)}
      className={`rounded border border-primary bg-background px-2 py-0.5 text-sm text-foreground focus:outline-none ${className}`}
    />
  );
}

function FmtBtn({ icon: Icon, title, onClick }: { icon: React.ElementType; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// ─── ShareModal ───────────────────────────────────────────────────────────────

function ShareModal({ folderId, folderName, ownerEmail, sentShares, onClose, onShareSent, onShareRemoved, onPermissionChanged }: {
  folderId: string; folderName: string; ownerEmail: string;
  sentShares: NoteShare[];
  onClose: () => void;
  onShareSent: (s: NoteShare) => void;
  onShareRemoved: (id: string) => void;
  onPermissionChanged: (id: string, p: "viewer" | "editor") => void;
}) {
  const [tab, setTab] = useState<"invite" | "manage">("invite");
  const [targetEmail, setTarget] = useState("");
  const [permission, setPerm] = useState<"viewer" | "editor">("viewer");
  const [sending, setSending] = useState(false);

  const folderShares = sentShares.filter((s) => s.folderId === folderId);

  async function send() {
    if (!targetEmail.trim()) return;
    if (targetEmail.trim().toLowerCase() === ownerEmail.toLowerCase()) {
      toast.error("You cannot share a folder with yourself."); return;
    }
    const alreadyShared = folderShares.some(
      (s) => s.targetEmail === targetEmail.trim().toLowerCase() && s.status !== "rejected"
    );
    if (alreadyShared) { toast.error("Already shared with this user."); return; }
    setSending(true);
    try {
      const share = await createShare(ownerEmail, targetEmail, folderId, permission, folderName);
      onShareSent(share);
      toast.success(`Invite sent to ${targetEmail}`);
      setTarget("");
    } catch { toast.error("Failed to send invite."); }
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-md p-6 space-y-5 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
        <div className="flex items-center justify-between relative z-10">
          <h3 className="font-extrabold text-foreground flex items-center gap-2 text-lg tracking-tight">
            <Share2 className="h-5 w-5 text-primary" />
            Share "{folderName}"
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-md bg-secondary p-1">
          {(["invite", "manage"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>
              {t === "invite" ? "Invite" : `Manage Access (${folderShares.length})`}
            </button>
          ))}
        </div>

        {tab === "invite" ? (
          <div className="space-y-3">
            <input type="email" value={targetEmail} onChange={(e) => setTarget(e.target.value)}
              placeholder="colleague@example.com"
              onKeyDown={(e) => e.key === "Enter" && send()}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <select value={permission} onChange={(e) => setPerm(e.target.value as "viewer" | "editor")}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none">
                <option value="viewer">Viewer – read only</option>
                <option value="editor">Editor – read &amp; write</option>
              </select>
              <button onClick={send} disabled={!targetEmail.trim() || sending}
                className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {sending ? "…" : "Send"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              The recipient will see a pending request in their &ldquo;Shared With Me&rdquo; section.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {folderShares.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No one has access yet.</p>
            ) : folderShares.map((s) => (
              <div key={s.shareId} className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2">
                <span className="flex-1 text-sm text-foreground truncate min-w-0">{s.targetEmail}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${s.status === "accepted" ? "bg-green-500/10 text-green-400" :
                    s.status === "rejected" ? "bg-red-500/10 text-red-400" :
                      "bg-amber-500/10 text-amber-400"
                  }`}>{s.status}</span>
                <select value={s.permission}
                  onChange={async (e) => {
                    const p = e.target.value as "viewer" | "editor";
                    try { await updateSharePermission(s.shareId, p); onPermissionChanged(s.shareId, p); }
                    catch { toast.error("Failed to update permission."); }
                  }}
                  className="rounded border border-input bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none shrink-0">
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button onClick={async () => {
                  try { await deleteShare(s.shareId); onShareRemoved(s.shareId); }
                  catch { toast.error("Failed to remove access."); }
                }} className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const ResearchNotes = () => {
  const { firebaseUser } = useAuth();
  const email = firebaseUser?.email ?? "";

  // ── Core data ──────────────────────────────────────────────────────────────
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [pagesByFolder, setPagesByFolder] = useState<Record<string, NotePage[]>>({});
  const [loading, setLoading] = useState(true);

  // ── Selection & sidebar mode ───────────────────────────────────────────────
  const [sidebarTab, setSidebarTab] = useState<"mine" | "shared">("mine");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  // ── Sharing data ───────────────────────────────────────────────────────────
  const [sentShares, setSentShares] = useState<NoteShare[]>([]);
  const [receivedShares, setReceivedShares] = useState<NoteShare[]>([]);
  const [sharedPagesCache, setSharedPagesCache] = useState<Record<string, NotePage[]>>({});
  const [showShareModal, setShowShareModal] = useState(false);

  // ── Editor ─────────────────────────────────────────────────────────────────
  const [editorContent, setEditorContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");

  // ── Rename UI ──────────────────────────────────────────────────────────────
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renamingPageTitle, setRenamingPageTitle] = useState("");

  // ── Create UI ──────────────────────────────────────────────────────────────
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newPageMode, setNewPageMode] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");

  // ── Search ─────────────────────────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const taRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // BUG FIX: track last loaded page so save-updates don't clobber editor content
  const loadedPageIdRef = useRef<string | null>(null);

  // ── Load own folders + shares on mount ────────────────────────────────────
  useEffect(() => {
    if (!email) return;
    setLoading(true);
    Promise.all([
      fetchFolders(email),
      fetchSentShares(email),
      fetchReceivedShares(email),
    ]).then(([f, sent, received]) => {
      setFolders(f);
      setSentShares(sent);
      setReceivedShares(received);
      setLoading(false);
    }).catch(() => { toast.error("Failed to load notes."); setLoading(false); });
  }, [email]);

  // ── Load pages when own folder selected ───────────────────────────────────
  useEffect(() => {
    if (!email || !activeFolderId || sidebarTab !== "mine") return;
    if (pagesByFolder[activeFolderId]) return;
    fetchPages(email, activeFolderId)
      .then((pages) => setPagesByFolder((p) => ({ ...p, [activeFolderId]: pages })))
      .catch(() => toast.error("Failed to load pages."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, activeFolderId, sidebarTab]);

  // ── BUG FIX: load page content only when changing pages ───────────────────
  useEffect(() => {
    if (!activePageId || !activeFolderId) return;
    if (loadedPageIdRef.current === activePageId) return; // already loaded – skip
    const cache = sidebarTab === "shared" ? sharedPagesCache : pagesByFolder;
    const page = (cache[activeFolderId] ?? []).find((p) => p.pageId === activePageId);
    if (!page) return; // cache not ready yet – retries when cache updates
    loadedPageIdRef.current = activePageId;
    const decoded = decodeContent(page.content);
    setEditorContent(decoded);
    setSavedContent(decoded);
    setSaveStatus("idle");
  }, [activePageId, activeFolderId, pagesByFolder, sharedPagesCache, sidebarTab]);

  // ── Auto-save ────────────────────────────────────────────────────────────────

  const doSave = useCallback(async (content: string, pageId: string) => {
    setSaveStatus("saving");
    try {
      await savePage(pageId, content);
      setSavedContent(content);
      setSaveStatus("saved");
      const patchCache = (prev: Record<string, NotePage[]>) => {
        const next = { ...prev };
        for (const fid of Object.keys(next)) {
          next[fid] = next[fid].map((p) => p.pageId === pageId ? { ...p, updatedAt: new Date() } : p);
        }
        return next;
      };
      setPagesByFolder(patchCache);
      setSharedPagesCache(patchCache);
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("unsaved");
    }
  }, []);

  useEffect(() => {
    if (!activePageId) return;
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    autoSaveRef.current = setInterval(() => {
      setEditorContent((cur) => {
        setSavedContent((saved) => {
          if (cur !== saved) doSave(cur, activePageId);
          return saved;
        });
        return cur;
      });
    }, AUTOSAVE_MS);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [activePageId, doSave]);

  const hasUnsaved = editorContent !== savedContent;

  // ── Search ───────────────────────────────────────────────────────────────────

  const allPages = useMemo(() => Object.values(pagesByFolder).flat(), [pagesByFolder]);

  const searchResults: SearchResult[] = useMemo(
    () => searchNotes(folders, allPages, searchQuery),
    [folders, allPages, searchQuery],
  );

  // ── Derived sharing ───────────────────────────────────────────────────────
  const pendingShares = receivedShares.filter((s) => s.status === "pending");
  const acceptedShares = receivedShares.filter((s) => s.status === "accepted" && s.folderId);
  const activeShare = sidebarTab === "shared"
    ? receivedShares.find((s) => s.folderId === activeFolderId && s.status === "accepted")
    : null;
  const isReadOnly = activeShare?.permission === "viewer";

  // ── Current page list (own or shared) ────────────────────────────────────
  const currentPages = sidebarTab === "shared"
    ? (activeFolderId ? (sharedPagesCache[activeFolderId] ?? []) : [])
    : (activeFolderId ? (pagesByFolder[activeFolderId] ?? []) : []);
  const activePage = activePageId ? currentPages.find((p) => p.pageId === activePageId) ?? null : null;
  const activeFolder = activeFolderId
    ? (sidebarTab === "shared"
      ? (() => { const s = acceptedShares.find((x) => x.folderId === activeFolderId); return s ? { folderId: activeFolderId, name: s.folderName } : null; })()
      : folders.find((f) => f.folderId === activeFolderId) ?? null)
    : null;

  // ── Folder actions ───────────────────────────────────────────────────────────

  async function handleCreateFolder(name: string) {
    if (!email || !name.trim()) { setNewFolderMode(false); return; }
    try {
      const folder = await addFolder(email, name.trim());
      setFolders((f) => [...f, folder]);
      setPagesByFolder((p) => ({ ...p, [folder.folderId]: [] }));
      setActiveFolderId(folder.folderId);
      setSidebarTab("mine");
      setActivePageId(null);
      loadedPageIdRef.current = null;
    } catch { toast.error("Failed to create folder."); }
    setNewFolderName("");
    setNewFolderMode(false);
  }

  async function handleRenameFolder(folderId: string, name: string) {
    if (!name.trim()) { setRenamingFolderId(null); return; }
    try {
      await renameFolder(folderId, name);
      setFolders((f) => f.map((x) => x.folderId === folderId ? { ...x, name: name.trim() } : x));
      setSentShares((s) => s.map((x) => x.folderId === folderId ? { ...x, folderName: name.trim() } : x));
    } catch { toast.error("Failed to rename folder."); }
    setRenamingFolderId(null);
  }

  async function handleDeleteFolder(folder: NoteFolder) {
    try {
      await deleteFolder(folder.folderId);
      setFolders((f) => f.filter((x) => x.folderId !== folder.folderId));
      setPagesByFolder((p) => { const n = { ...p }; delete n[folder.folderId]; return n; });
      if (activeFolderId === folder.folderId) { setActiveFolderId(null); setActivePageId(null); loadedPageIdRef.current = null; }
      toast.success("Folder deleted.");
    } catch { toast.error("Failed to delete folder."); }
  }

  function handleSelectMyFolder(folderId: string) {
    if (sidebarTab !== "mine" || activeFolderId !== folderId) loadedPageIdRef.current = null;
    setSidebarTab("mine");
    setActiveFolderId(folderId);
    setActivePageId(null);
  }

  async function handleSelectSharedFolder(share: NoteShare) {
    if (!share.folderId) return;
    if (sidebarTab !== "shared" || activeFolderId !== share.folderId) loadedPageIdRef.current = null;
    setSidebarTab("shared");
    setActiveFolderId(share.folderId);
    setActivePageId(null);
    if (!sharedPagesCache[share.folderId]) {
      try {
        const pages = await fetchFolderPages(share.folderId);
        setSharedPagesCache((p) => ({ ...p, [share.folderId!]: pages }));
      } catch { toast.error("Failed to load shared pages."); }
    }
  }

  async function handleAcceptShare(shareId: string) {
    try {
      await acceptShare(shareId);
      setReceivedShares((prev) => prev.map((s) => s.shareId === shareId ? { ...s, status: "accepted" } : s));
      toast.success("Share accepted!");
    } catch { toast.error("Failed to accept."); }
  }

  async function handleRejectShare(shareId: string) {
    try {
      await rejectShare(shareId);
      setReceivedShares((prev) => prev.map((s) => s.shareId === shareId ? { ...s, status: "rejected" } : s));
    } catch { toast.error("Failed to reject."); }
  }

  // ── Page actions ─────────────────────────────────────────────────────────────

  async function handleCreatePage(title: string) {
    if (!email || !activeFolderId || !title.trim()) { setNewPageMode(false); return; }
    try {
      const page = await addPage(email, activeFolderId, title.trim());
      if (sidebarTab === "shared") {
        setSharedPagesCache((p) => ({ ...p, [activeFolderId]: [...(p[activeFolderId] ?? []), page] }));
      } else {
        setPagesByFolder((p) => ({ ...p, [activeFolderId]: [...(p[activeFolderId] ?? []), page] }));
      }
      setActivePageId(page.pageId);
      loadedPageIdRef.current = null;
    } catch { toast.error("Failed to create page."); }
    setNewPageTitle("");
    setNewPageMode(false);
  }

  async function handleRenamePage(pageId: string, title: string) {
    if (!title.trim() || !activeFolderId) { setRenamingPageId(null); return; }
    try {
      await renamePage(pageId, title);
      const patch = (arr: NotePage[]) => arr.map((x) => x.pageId === pageId ? { ...x, title: title.trim() } : x);
      if (sidebarTab === "shared") {
        setSharedPagesCache((p) => ({ ...p, [activeFolderId]: patch(p[activeFolderId] ?? []) }));
      } else {
        setPagesByFolder((p) => ({ ...p, [activeFolderId]: patch(p[activeFolderId] ?? []) }));
      }
    } catch { toast.error("Failed to rename page."); }
    setRenamingPageId(null);
  }

  async function handleDeletePage(page: NotePage) {
    try {
      await deletePage(page.pageId);
      if (sidebarTab === "shared") {
        setSharedPagesCache((p) => ({ ...p, [page.folderId]: (p[page.folderId] ?? []).filter((x) => x.pageId !== page.pageId) }));
      } else {
        setPagesByFolder((p) => ({ ...p, [page.folderId]: (p[page.folderId] ?? []).filter((x) => x.pageId !== page.pageId) }));
      }
      if (activePageId === page.pageId) { setActivePageId(null); setEditorContent(""); setSavedContent(""); loadedPageIdRef.current = null; }
      toast.success("Page deleted.");
    } catch { toast.error("Failed to delete page."); }
  }

  // ── Format toolbar ───────────────────────────────────────────────────────────

  function applyFormat(action: string) {
    const ta = taRef.current;
    if (!ta) return;
    let val = editorContent;
    switch (action) {
      case "bold": val = wrapSelection(ta, "**", "**", "bold text"); break;
      case "italic": val = wrapSelection(ta, "_", "_", "italic text"); break;
      case "code": val = wrapSelection(ta, "`", "`", "code"); break;
      case "codeblock": val = wrapSelection(ta, "```\n", "\n```", "code block"); break;
      case "link": val = wrapSelection(ta, "[", "](url)", "link text"); break;
      case "heading": val = insertLinePrefix(ta, "## "); break;
      case "list": val = insertLinePrefix(ta, "- "); break;
    }
    setEditorContent(val);
    ta.focus();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px] pointer-events-none" />
      <div className="absolute top-[20%] left-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none opacity-40" />

      <Navbar />

      <div className="flex-1 container py-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shadow-inner">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Research Notes</h1>
              <p className="text-sm text-muted-foreground font-medium">Capture, organize, and share intel securely.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Save indicator */}
            {activePageId && (
              <span className={`text-xs transition-colors ${saveStatus === "saving" ? "text-muted-foreground" :
                  saveStatus === "saved" ? "text-green-400" :
                    saveStatus === "unsaved" ? "text-red-400" :
                      hasUnsaved ? "text-amber-400" : "text-muted-foreground/40"
                }`}>
                {saveStatus === "saving" ? "Saving…" :
                  saveStatus === "saved" ? <span className="flex items-center gap-1"><Check className="h-3 w-3" />All changes saved</span> :
                    saveStatus === "unsaved" ? "Save failed" :
                      hasUnsaved ? (
                        <span
                          className="flex items-center gap-1 cursor-pointer hover:text-amber-300"
                          onClick={() => activePageId && doSave(editorContent, activePageId)}
                        >
                          <Save className="h-3 w-3" />Unsaved · click to save
                        </span>
                      ) : null}
              </span>
            )}
            <button
              onClick={() => setShowSearch((v) => !v)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all shadow-sm ${showSearch
                  ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-foreground/20"
                }`}
            >
              <Search className="h-4 w-4" />
              {showSearch ? "Close search" : "Search intel"}
            </button>
          </div>
        </div>

        {/* Search panel */}
        {showSearch && (
          <div className="glass-card p-4 mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search folders, page titles and content…"
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-1 py-2">No results found.</p>
                ) : searchResults.map((r) => (
                  <button
                    key={r.pageId}
                    onClick={() => {
                      handleSelectMyFolder(r.folderId);
                      setActivePageId(r.pageId);
                      loadedPageIdRef.current = null;
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                    className="w-full text-left rounded-md px-3 py-2 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                      <FolderOpen className="h-3 w-3" />{r.folderName}
                      <ChevronRight className="h-3 w-3" />
                      <FileText className="h-3 w-3" />{r.pageTitle}
                    </div>
                    <p className="text-xs text-muted-foreground/70 line-clamp-2">{r.snippet}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3-panel layout */}
        {loading ? (
          <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3 animate-pulse">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="font-bold">Loading intel…</span>
          </div>
        ) : (
          <div className="glass-card grid grid-cols-1 md:grid-cols-[260px_260px_1fr] overflow-hidden min-h-[70vh] shadow-xl relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

            {/* ═══ LEFT – Folder sidebar ══════════════════════════════════ */}
            <div className="border-r border-border/40 bg-muted/10 flex flex-col relative z-10 backdrop-blur-sm">

              {/* Tab switcher */}
              <div className="flex border-b border-border/40 bg-background/50 backdrop-blur-md">
                {(["mine", "shared"] as const).map((t) => (
                  <button key={t}
                    onClick={() => { setSidebarTab(t); setActiveFolderId(null); setActivePageId(null); loadedPageIdRef.current = null; }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-extrabold uppercase tracking-wider transition-all ${sidebarTab === t ? "bg-primary/5 text-primary border-b-2 border-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}>
                    {t === "mine" ? (
                      <><FolderOpen className="h-3.5 w-3.5" />My Notes</>
                    ) : (
                      <>
                        <Users className="h-3 w-3" />Shared
                        {pendingShares.length > 0 && (
                          <span className="ml-0.5 h-4 min-w-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center px-1">
                            {pendingShares.length}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                ))}
              </div>

              {/* ── MY NOTES ─────────────────────────────────────────────── */}
              {sidebarTab === "mine" && (
                <>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Folders</span>
                    <button
                      onClick={() => { setNewFolderMode(true); setNewFolderName(""); }}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="New folder"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto py-1">
                    {folders.length === 0 && !newFolderMode && (
                      <div className="px-3 py-4 text-center">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Create your first research folder to start organizing recon notes.
                        </p>
                        <button
                          onClick={() => { setNewFolderMode(true); setNewFolderName(""); }}
                          className="mt-2 text-xs text-primary hover:underline"
                        >
                          + New Folder
                        </button>
                      </div>
                    )}
                    {newFolderMode && (
                      <div className="px-2 py-1">
                        <InlineRename
                          value={newFolderName}
                          onSave={(v) => handleCreateFolder(v)}
                          onCancel={() => setNewFolderMode(false)}
                          className="w-full"
                        />
                      </div>
                    )}
                    {folders.map((folder) => (
                      <div
                        key={folder.folderId}
                        onClick={() => handleSelectMyFolder(folder.folderId)}
                        className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${activeFolderId === folder.folderId && sidebarTab === "mine"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                      >
                        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                        {renamingFolderId === folder.folderId ? (
                          <InlineRename
                            value={folder.name}
                            onSave={(v) => handleRenameFolder(folder.folderId, v)}
                            onCancel={() => setRenamingFolderId(null)}
                            className="flex-1 min-w-0"
                          />
                        ) : (
                          <span className="flex-1 text-sm truncate">{folder.name}</span>
                        )}
                        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setRenamingFolderId(folder.folderId); }}
                            className="p-0.5 rounded hover:bg-background/50" title="Rename"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                            className="p-0.5 rounded hover:bg-red-500/10 hover:text-red-400" title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── SHARED WITH ME ───────────────────────────────────────── */}
              {sidebarTab === "shared" && (
                <div className="flex-1 overflow-y-auto">
                  {/* Pending requests */}
                  {pendingShares.length > 0 && (
                    <div className="border-b border-border">
                      <p className="px-3 py-2 text-xs font-semibold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                        <Bell className="h-3 w-3" />{pendingShares.length} Pending
                      </p>
                      {pendingShares.map((s) => (
                        <div key={s.shareId} className="px-3 py-2 space-y-1.5 border-b border-border/50 last:border-0">
                          <p className="text-xs font-medium text-foreground truncate">{s.folderName || "Folder"}</p>
                          <p className="text-xs text-muted-foreground truncate">from {s.ownerEmail}</p>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleAcceptShare(s.shareId)}
                              className="flex-1 flex items-center justify-center gap-1 rounded bg-primary/20 text-primary text-xs py-1 hover:bg-primary/30 transition-colors">
                              <UserCheck className="h-3 w-3" />Accept
                            </button>
                            <button onClick={() => handleRejectShare(s.shareId)}
                              className="flex-1 flex items-center justify-center gap-1 rounded bg-secondary text-muted-foreground text-xs py-1 hover:text-foreground transition-colors">
                              <UserX className="h-3 w-3" />Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {acceptedShares.length === 0 && pendingShares.length === 0 && (
                    <div className="px-3 py-6 text-center">
                      <Share2 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No shared folders yet.</p>
                    </div>
                  )}

                  <div className="py-1">
                    {acceptedShares.map((s) => (
                      <div
                        key={s.shareId}
                        onClick={() => handleSelectSharedFolder(s)}
                        className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${activeFolderId === s.folderId && sidebarTab === "shared"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                      >
                        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{s.folderName}</p>
                          <p className="text-xs text-muted-foreground/60 truncate">{s.ownerEmail}</p>
                        </div>
                        <span className={`text-xs px-1 py-0.5 rounded shrink-0 ${s.permission === "editor" ? "bg-blue-500/10 text-blue-400" : "bg-muted/50 text-muted-foreground"
                          }`}>{s.permission === "editor" ? "Edit" : "View"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ═══ MIDDLE – Pages ════════════════════════════════════════════ */}
            <div className="border-r border-border/40 bg-muted/5 flex flex-col relative z-10 backdrop-blur-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/50">
                <span className="text-xs font-extrabold text-foreground uppercase tracking-widest truncate">
                  {activeFolder ? activeFolder.name : "Pages"}
                </span>
                {activeFolderId && !isReadOnly && (
                  <button
                    onClick={() => { setNewPageMode(true); setNewPageTitle(""); }}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
                    title="New page"
                  >
                    <FilePlus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto py-1">
                {!activeFolderId ? (
                  <p className="px-3 py-4 text-xs text-muted-foreground text-center">Select a folder first.</p>
                ) : currentPages.length === 0 && !newPageMode ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-muted-foreground">No pages yet.</p>
                    {!isReadOnly && (
                      <button
                        onClick={() => { setNewPageMode(true); setNewPageTitle(""); }}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        + New Page
                      </button>
                    )}
                  </div>
                ) : null}
                {newPageMode && activeFolderId && !isReadOnly && (
                  <div className="px-2 py-1">
                    <InlineRename
                      value={newPageTitle}
                      onSave={(v) => handleCreatePage(v)}
                      onCancel={() => setNewPageMode(false)}
                      className="w-full"
                    />
                  </div>
                )}
                {currentPages.map((page) => (
                  <div
                    key={page.pageId}
                    onClick={() => setActivePageId(page.pageId)}
                    className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${activePageId === page.pageId
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    {renamingPageId === page.pageId ? (
                      <InlineRename
                        value={renamingPageTitle}
                        onSave={(v) => handleRenamePage(page.pageId, v)}
                        onCancel={() => setRenamingPageId(null)}
                        className="flex-1 min-w-0"
                      />
                    ) : (
                      <span className="flex-1 text-sm truncate">{page.title}</span>
                    )}
                    {!isReadOnly && (
                      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setRenamingPageId(page.pageId); setRenamingPageTitle(page.title); }}
                          className="p-0.5 rounded hover:bg-background/50" title="Rename"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePage(page); }}
                          className="p-0.5 rounded hover:bg-red-500/10 hover:text-red-400" title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ RIGHT – Editor ════════════════════════════════════════════ */}
            <div className="flex flex-col bg-background/40 relative z-10 backdrop-blur-sm">
              {!activePage ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm font-medium text-foreground">
                      {!activeFolderId ? "Select a folder to get started" : "Select or create a page"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {!activeFolderId
                        ? "Organize your recon notes with folders and pages."
                        : "Click a page from the list to start editing."}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Page header */}
                  <div className="px-5 py-3 border-b border-border flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-semibold text-foreground">{activePage.title}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeFolder?.name} · Last edited {activePage.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                    {isReadOnly && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded shrink-0">
                        <Eye className="h-3 w-3" />Read only
                      </span>
                    )}
                    {sidebarTab === "mine" && activeFolderId && (
                      <button
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
                      >
                        <Share2 className="h-3.5 w-3.5" />Share
                      </button>
                    )}
                  </div>

                  {/* Formatting toolbar */}
                  <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border bg-secondary/20 flex-wrap">
                    {!isReadOnly && (
                      <>
                        <FmtBtn icon={Heading2} title="Heading (## )" onClick={() => applyFormat("heading")} />
                        <FmtBtn icon={Bold} title="Bold (**text**)" onClick={() => applyFormat("bold")} />
                        <FmtBtn icon={Italic} title="Italic (_text_)" onClick={() => applyFormat("italic")} />
                        <FmtBtn icon={Code} title="Inline code (`code`)" onClick={() => applyFormat("code")} />
                        <FmtBtn icon={Code2} title="Code block" onClick={() => applyFormat("codeblock")} />
                        <FmtBtn icon={Link2} title="Link [text](url)" onClick={() => applyFormat("link")} />
                        <FmtBtn icon={List} title="List item (- )" onClick={() => applyFormat("list")} />
                      </>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground/50">Markdown</span>
                  </div>

                  {/* Textarea editor */}
                  <textarea
                    ref={taRef}
                    value={editorContent}
                    readOnly={isReadOnly}
                    onChange={(e) => !isReadOnly && setEditorContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (isReadOnly) return;
                      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                        e.preventDefault();
                        if (activePageId && hasUnsaved) doSave(editorContent, activePageId);
                      }
                      if (e.key === "Tab") {
                        e.preventDefault();
                        const ta = e.currentTarget;
                        const s = ta.selectionStart;
                        const end = ta.selectionEnd;
                        setEditorContent(editorContent.slice(0, s) + "  " + editorContent.slice(end));
                        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
                      }
                    }}
                    placeholder={isReadOnly ? "" : [
                      "Start writing your notes here…",
                      "",
                      "Markdown is supported:",
                      "  ## Heading    **bold**    _italic_",
                      "  `code`    - list item    [link](url)",
                      "",
                      "Ctrl+S to save · auto-saves every 10 seconds",
                    ].join("\n")}
                    className={`flex-1 w-full resize-none px-8 py-6 bg-transparent text-sm text-foreground font-mono leading-relaxed placeholder:text-muted-foreground/30 focus:outline-none${isReadOnly ? " cursor-default" : ""}`}
                    spellCheck={!isReadOnly}
                  />
                </>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Share modal */}
      {showShareModal && activeFolderId && sidebarTab === "mine" && (
        <ShareModal
          folderId={activeFolderId}
          folderName={activeFolder?.name ?? ""}
          ownerEmail={email}
          sentShares={sentShares}
          onClose={() => setShowShareModal(false)}
          onShareSent={(s) => setSentShares((prev) => [s, ...prev])}
          onShareRemoved={(id) => setSentShares((prev) => prev.filter((s) => s.shareId !== id))}
          onPermissionChanged={(id, p) => setSentShares((prev) => prev.map((s) => s.shareId === id ? { ...s, permission: p } : s))}
        />
      )}

      <Footer />
    </div>
  );
};

export default ResearchNotes;
