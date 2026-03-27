import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, apiClient } from "@/lib/api";
import { toast } from "sonner";
import {
  Monitor, Plus, Search, Laptop, Server, Wifi, Smartphone,
  HardDrive, Printer, Trash2, Edit, Package
} from "lucide-react";

const ASSET_TYPES = [
  { value: "laptop", label: "Laptop", icon: Laptop },
  { value: "desktop", label: "Desktop", icon: Monitor },
  { value: "monitor", label: "Monitor", icon: Monitor },
  { value: "phone", label: "Phone", icon: Smartphone },
  { value: "printer", label: "Printer", icon: Printer },
  { value: "server", label: "Server", icon: Server },
  { value: "networking", label: "Networking", icon: Wifi },
  { value: "storage", label: "Storage Device", icon: HardDrive },
  { value: "software", label: "Software License", icon: Package },
  { value: "other", label: "Other", icon: Package },
];

const STATUS_COLORS = {
  active: "bg-emerald-500",
  in_use: "bg-blue-500",
  maintenance: "bg-amber-500",
  retired: "bg-slate-400",
  available: "bg-green-400",
};

export default function ITAssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [form, setForm] = useState({
    asset_type: "", name: "", brand: "", model: "", serial_number: "",
    assigned_to: "", status: "available", purchase_date: "", warranty_expiry: "",
    notes: "",
  });

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const [assetsRes, empRes] = await Promise.all([
        apiClient.get("/it/assets"),
        apiClient.get("/hr/employees/sync-options").catch(() => ({ data: { managers: [] } })),
      ]);
      setAssets(Array.isArray(assetsRes.data) ? assetsRes.data : []);
      setEmployees(empRes.data?.managers || []);
    } catch {
      toast.error("Failed to load IT assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, []);

  const openNew = () => {
    setEditingAsset(null);
    setForm({ asset_type: "", name: "", brand: "", model: "", serial_number: "", assigned_to: "", status: "available", purchase_date: "", warranty_expiry: "", notes: "" });
    setShowModal(true);
  };

  const openEdit = (asset) => {
    setEditingAsset(asset);
    setForm({
      asset_type: asset.asset_type || "",
      name: asset.name || "",
      brand: asset.brand || "",
      model: asset.model || "",
      serial_number: asset.serial_number || "",
      assigned_to: asset.assigned_to || "",
      status: asset.status || "available",
      purchase_date: asset.purchase_date || "",
      warranty_expiry: asset.warranty_expiry || "",
      notes: asset.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.asset_type) {
      toast.error("Name and type are required");
      return;
    }
    try {
      if (editingAsset) {
        await apiClient.put(`/it/assets/${editingAsset.id}`, form);
        toast.success("Asset updated");
      } else {
        await apiClient.post("/it/assets", form);
        toast.success("Asset created");
      }
      setShowModal(false);
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this asset?")) return;
    try {
      await apiClient.delete(`/it/assets/${id}`);
      toast.success("Asset deleted");
      fetchAssets();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filtered = assets.filter(a => {
    if (search && !`${a.name} ${a.brand} ${a.model} ${a.serial_number} ${a.assigned_to_name}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && a.asset_type !== typeFilter) return false;
    return true;
  });

  const stats = {
    total: assets.length,
    in_use: assets.filter(a => a.status === "in_use" || a.assigned_to).length,
    available: assets.filter(a => a.status === "available" && !a.assigned_to).length,
    maintenance: assets.filter(a => a.status === "maintenance").length,
  };

  return (
    <div className="space-y-6" data-testid="it-assets-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="w-6 h-6 text-primary" /> IT & Asset Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track company hardware, software, and equipment</p>
        </div>
        <Button onClick={openNew} data-testid="add-asset-btn"><Plus className="w-4 h-4 mr-1" />Add Asset</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Assets", value: stats.total, color: "text-foreground" },
          { label: "In Use", value: stats.in_use, color: "text-blue-500" },
          { label: "Available", value: stats.available, color: "text-emerald-500" },
          { label: "Maintenance", value: stats.maintenance, color: "text-amber-500" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="asset-search" />
        </div>
        <Select value={typeFilter} onValueChange={v => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Assets Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No assets found. Click "Add Asset" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(asset => {
            const TypeIcon = ASSET_TYPES.find(t => t.value === asset.asset_type)?.icon || Package;
            return (
              <Card key={asset.id} className="hover:shadow-md transition-shadow" data-testid={`asset-card-${asset.id}`}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                        <TypeIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">{asset.brand} {asset.model}</p>
                      </div>
                    </div>
                    <Badge className={`${STATUS_COLORS[asset.status] || "bg-slate-400"} text-white text-[10px]`}>
                      {asset.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {asset.serial_number && (
                    <p className="text-xs text-muted-foreground font-mono mb-1">SN: {asset.serial_number}</p>
                  )}
                  {asset.assigned_to_name && (
                    <p className="text-xs mb-1">
                      <span className="text-muted-foreground">Assigned to: </span>
                      <span className="font-medium">{asset.assigned_to_name}</span>
                    </p>
                  )}
                  {asset.warranty_expiry && (
                    <p className="text-xs text-muted-foreground">Warranty: {asset.warranty_expiry}</p>
                  )}
                  <div className="flex gap-1.5 mt-3 pt-2 border-t">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(asset)}>
                      <Edit className="w-3 h-3 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => handleDelete(asset.id)}>
                      <Trash2 className="w-3 h-3 mr-1" />Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAsset ? "Edit" : "Add"} IT Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Asset Type *</Label>
                <Select value={form.asset_type} onValueChange={v => setForm(p => ({ ...p, asset_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. MacBook Pro 16" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Brand</Label><Input value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} placeholder="e.g. Apple" /></div>
              <div><Label>Model</Label><Input value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} placeholder="e.g. M3 Pro" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Serial Number</Label><Input value={form.serial_number} onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assigned To</Label>
                <Select value={form.assigned_to} onValueChange={v => setForm(p => ({ ...p, assigned_to: v }))}>
                  <SelectTrigger><SelectValue placeholder="Not assigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not Assigned</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} /></div>
            </div>
            <div><Label>Warranty Expiry</Label><Input type="date" value={form.warranty_expiry} onChange={e => setForm(p => ({ ...p, warranty_expiry: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="save-asset-btn">{editingAsset ? "Update" : "Create"} Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
