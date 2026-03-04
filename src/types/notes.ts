export interface NoteFolder {
  folderId: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface NotePage {
  pageId: string;
  folderId: string;
  email: string;
  title: string;
  content: string; // base64 encoded
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResult {
  pageId: string;
  folderId: string;
  folderName: string;
  pageTitle: string;
  snippet: string;
}

export interface NoteShare {
  shareId: string;
  ownerEmail: string;
  targetEmail: string;
  folderId: string | null;
  permission: "viewer" | "editor";
  status: "pending" | "accepted" | "rejected";
  folderName: string;
  createdAt: Date;
}
