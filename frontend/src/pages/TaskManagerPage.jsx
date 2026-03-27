import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useAuth, apiClient } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus, Search, ListTodo, Clock, AlertTriangle,
  CheckCircle, Trash2, Edit, Users, Filter
} from "lucide-react";

const PRIORITY_COLORS = {
  low: "bg-slate-400 text-white",
  medium: "bg-blue-500 text-white",
  high: "bg-orange-500 text-white",
  urgent: "bg-red-500 text-white",
};

const STATUS_COLORS = {
  open: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
};

export default function TaskManagerPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({
    title: "", description: "", category: "", priority: "medium",
    assigned_to: [], due_date: "", recurring: false,
  });

  const isManager = ["super_admin", "coo", "admin", "hr", "team_leader", "master_of_academics", "cs_head"].includes(user?.role);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, empRes, catRes] = await Promise.all([
        apiClient.get("/hr/tasks"),
        apiClient.get("/hr/employees/sync-options").catch(() => ({ data: { managers: [] } })),
        apiClient.get("/hr/task-categories").catch(() => ({ data: [] })),
      ]);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      setEmployees(empRes.data?.managers || []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const openNew = () => {
    setEditingTask(null);
    setForm({ title: "", description: "", category: "", priority: "medium", assigned_to: [], due_date: "", recurring: false });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title || "",
      description: task.description || "",
      category: task.category || "",
      priority: task.priority || "medium",
      assigned_to: task.assigned_to || [],
      due_date: task.due_date || "",
      recurring: task.recurring || false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error("Title is required"); return; }
    try {
      if (editingTask) {
        await apiClient.put(`/hr/tasks/${editingTask.id}`, form);
        toast.success("Task updated");
      } else {
        await apiClient.post("/hr/tasks", form);
        toast.success("Task created");
      }
      setShowModal(false);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await apiClient.put(`/hr/tasks/${taskId}`, { status });
      toast.success("Status updated");
      fetchTasks();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await apiClient.delete(`/hr/tasks/${id}`);
      toast.success("Task deleted");
      fetchTasks();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleAssignee = (empId) => {
    setForm(prev => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(empId)
        ? prev.assigned_to.filter(id => id !== empId)
        : [...prev.assigned_to, empId]
    }));
  };

  const filtered = tasks.filter(t => {
    if (search && !`${t.title} ${t.description} ${t.assigned_to_names?.join(" ")}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    open: tasks.filter(t => t.status === "open").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  return (
    <div className="space-y-6" data-testid="task-manager-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-primary" /> Task Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Assign and track team tasks</p>
        </div>
        {isManager && (
          <Button onClick={openNew} data-testid="create-task-btn">
            <Plus className="w-4 h-4 mr-1" />Assign Task
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: ListTodo, color: "text-foreground" },
          { label: "Open", value: stats.open, icon: AlertTriangle, color: "text-amber-500" },
          { label: "In Progress", value: stats.in_progress, icon: Clock, color: "text-blue-500" },
          { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-emerald-500" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color} opacity-70`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="task-search" />
        </div>
        <Select value={statusFilter || "all"} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36"><Filter className="w-4 h-4 mr-1" /><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{isManager ? 'No tasks yet. Click "Assign Task" to create one.' : 'No tasks assigned to you.'}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <Card key={task.id} className="hover:shadow-sm transition-shadow" data-testid={`task-row-${task.id}`}>
              <CardContent className="py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{task.title}</span>
                    <Badge className={PRIORITY_COLORS[task.priority]} data-testid="task-priority">{task.priority}</Badge>
                    {task.category && <Badge variant="outline" className="text-[10px]">{task.category}</Badge>}
                    {task.recurring && <Badge variant="secondary" className="text-[10px]">Recurring</Badge>}
                  </div>
                  {task.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {task.assigned_to_names?.length > 0 && (
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{task.assigned_to_names.join(", ")}</span>
                    )}
                    {task.due_date && <span>Due: {task.due_date}</span>}
                    <span>By: {task.created_by_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className={`text-xs px-2 py-1.5 rounded-md border font-medium ${STATUS_COLORS[task.status] || ""}`}
                    data-testid="task-status-select"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  {isManager && (
                    <>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => openEdit(task)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 text-red-500" onClick={() => handleDelete(task.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit" : "Assign"} Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Edit promotional video" data-testid="task-title-input" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Detailed task instructions..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.recurring} onChange={e => setForm(p => ({ ...p, recurring: e.target.checked }))} id="recurring" className="rounded" />
              <Label htmlFor="recurring" className="cursor-pointer text-sm">Recurring task (repeats daily/weekly)</Label>
            </div>
            {/* Assignees */}
            <div>
              <Label>Assign To</Label>
              <div className="max-h-[150px] overflow-y-auto border rounded-md p-2 mt-1 space-y-1">
                {employees.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No employees found</p>
                ) : employees.map(emp => (
                  <label key={emp.id} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted/50 text-sm ${form.assigned_to.includes(emp.id) ? 'bg-primary/10' : ''}`}>
                    <input type="checkbox" checked={form.assigned_to.includes(emp.id)} onChange={() => toggleAssignee(emp.id)} className="rounded" />
                    {emp.full_name}
                  </label>
                ))}
              </div>
              {form.assigned_to.length > 0 && <p className="text-xs text-muted-foreground mt-1">{form.assigned_to.length} selected</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="save-task-btn">{editingTask ? "Update" : "Create"} Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
