import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, apiClient } from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen, Upload, FileText, File, Trash2, Download,
  Search, FolderOpen, Video, FileSpreadsheet, Plus
} from "lucide-react";

const CATEGORIES = [
  { id: "sop", label: "SOPs", icon: FileText, color: "text-blue-500 bg-blue-50" },
  { id: "policy", label: "Policies", icon: BookOpen, color: "text-emerald-500 bg-emerald-50" },
  { id: "training", label: "Training Materials", icon: FolderOpen, color: "text-purple-500 bg-purple-50" },
  { id: "training_video", label: "Training Videos", icon: Video, color: "text-red-500 bg-red-50" },
  { id: "general", label: "General", icon: File, color: "text-slate-500 bg-slate-50" },
];

const FILE_ICONS = {
  ".pdf": { icon: FileText, color: "text-red-500" },
  ".docx": { icon: FileText, color: "text-blue-500" },
  ".doc": { icon: FileText, color: "text-blue-500" },
  ".xlsx": { icon: FileSpreadsheet, color: "text-emerald-500" },
  ".xls": { icon: FileSpreadsheet, color: "text-emerald-500" },
  ".txt": { icon: File, color: "text-slate-500" },
  ".mp4": { icon: Video, color: "text-purple-500" },
  ".mov": { icon: Video, color: "text-purple-500" },
};

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploading, setUploading] = useState(false);

  const canUpload = ["super_admin", "admin", "hr", "coo"].includes(user?.role);

  useEffect(() => { fetchDocs(); }, [filterCategory]);

  const fetchDocs = async () => {
    try {
      const res = await apiClient.get(`/claret/knowledge-base?category=${filterCategory}`);
      setDocuments(res.data.documents || []);
      setCategories(res.data.categories || []);
    } catch { toast.error("Failed to load documents"); }
    finally { setLoading(false); }
  };

  const handleUpload = async () => {
    if (!uploadFile) return toast.error("Select a file");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle || uploadFile.name);
      formData.append("description", uploadDesc);
      formData.append("category", uploadCategory);
      await apiClient.post("/claret/knowledge-base/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Document uploaded!");
      setShowUpload(false);
      setUploadFile(null);
      setUploadTitle("");
      setUploadDesc("");
      fetchDocs();
    } catch (e) { toast.error(e.response?.data?.detail || "Upload failed"); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await apiClient.delete(`/claret/knowledge-base/${id}`);
      toast.success("Deleted");
      fetchDocs();
    } catch { toast.error("Delete failed"); }
  };

  const handleDownload = (id, filename) => {
    window.open(`${apiClient.defaults.baseURL}/claret/knowledge-base/${id}/download`, "_blank");
  };

  const filteredDocs = documents.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.title?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q);
  });

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" data-testid="knowledge-base-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-500" />
            Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground">SOPs, Policies, Training Materials & Company Documents</p>
        </div>
        {canUpload && (
          <Button onClick={() => setShowUpload(!showUpload)} data-testid="kb-upload-btn">
            <Plus className="w-4 h-4 mr-1" /> Upload Document
          </Button>
        )}
      </div>

      {/* Upload Form */}
      {showUpload && (
        <Card className="border-indigo-500/30 bg-indigo-500/5">
          <CardContent className="pt-5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">File</label>
                <Input
                  type="file"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md,.mp4,.mov,.avi"
                  onChange={e => setUploadFile(e.target.files[0])}
                  data-testid="kb-file-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input placeholder="Document Title" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} data-testid="kb-title-input" />
            <Input placeholder="Description (optional)" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={uploading || !uploadFile} data-testid="kb-submit-upload">
                <Upload className="w-4 h-4 mr-1" /> {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Button variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" data-testid="kb-search" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterCategory === "all" ? "bg-foreground text-background" : "bg-muted hover:bg-muted/80"}`}
          >
            All ({documents.length})
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${filterCategory === c.id ? "bg-foreground text-background" : "bg-muted hover:bg-muted/80"}`}
            >
              <c.icon className="w-3 h-3" /> {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No documents found</p>
          {canUpload && <p className="text-sm mt-1">Upload your first document to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDocs.map(doc => {
            const fi = FILE_ICONS[doc.file_ext] || { icon: File, color: "text-slate-400" };
            const cat = CATEGORIES.find(c => c.id === doc.category) || CATEGORIES[4];
            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow group" data-testid={`kb-doc-${doc.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg ${cat.color} shrink-0`}>
                      <fi.icon className={`w-5 h-5 ${fi.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{doc.title}</p>
                      {doc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{doc.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]">{cat.label}</Badge>
                        <span className="text-[10px] text-muted-foreground">{formatSize(doc.file_size)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {doc.uploaded_by_name && `by ${doc.uploaded_by_name} · `}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-3 pt-2 border-t">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => handleDownload(doc.id, doc.filename)}>
                      <Download className="w-3 h-3 mr-1" /> Download
                    </Button>
                    {canUpload && (
                      <Button size="sm" variant="ghost" className="text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(doc.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
