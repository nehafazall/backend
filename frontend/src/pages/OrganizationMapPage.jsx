import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth, apiClient } from "@/lib/api";
import { toast } from "sonner";
import {
  Crown, Users, UserCircle, ChevronDown, ChevronRight,
  Building2, Search, Shield, ArrowRight, Network,
  Briefcase, ChevronUp, GripVertical
} from "lucide-react";

const ROLE_COLORS = {
  super_admin: "bg-amber-500 text-white",
  admin: "bg-purple-500 text-white",
  cs_head: "bg-emerald-500 text-white",
  hr: "bg-rose-500 text-white",
  finance: "bg-cyan-500 text-white",
  finance_manager: "bg-cyan-600 text-white",
  master_of_academics: "bg-orange-500 text-white",
  "master_of_academics_": "bg-orange-500 text-white",
  team_leader: "bg-blue-500 text-white",
  sales_executive: "bg-indigo-400 text-white",
  cs_agent: "bg-teal-400 text-white",
  mentor: "bg-amber-400 text-white",
  business_development: "bg-pink-400 text-white",
  business_development_manager: "bg-pink-500 text-white",
  "business_development_manager_": "bg-pink-500 text-white",
  quality_control: "bg-slate-500 text-white",
  staff: "bg-slate-400 text-white",
};

const ROLE_LABELS = {
  super_admin: "CEO",
  admin: "Admin",
  cs_head: "CS Head",
  hr: "HR Manager",
  finance: "Finance",
  finance_manager: "Finance Manager",
  master_of_academics: "Master of Academics",
  "master_of_academics_": "Master of Academics",
  team_leader: "Team Leader",
  sales_executive: "Sales Executive",
  cs_agent: "CS Agent",
  mentor: "Mentor",
  business_development: "BD Executive",
  business_development_manager: "BD Manager",
  "business_development_manager_": "BD Manager",
  quality_control: "Quality Control",
  staff: "Staff",
};

function PersonCard({ person, size = "md", highlight = false, draggable: isDraggable = false }) {
  const colorClass = ROLE_COLORS[person.role] || "bg-slate-400 text-white";
  const initials = person.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const isSm = size === "sm";

  const handleDragStart = (e) => {
    if (!isDraggable) return;
    e.dataTransfer.setData("application/json", JSON.stringify({ userId: person.id, name: person.name }));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all duration-200 hover:shadow-md ${highlight ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 bg-card hover:border-border"} ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      data-testid={`person-card-${person.id}`}
      draggable={isDraggable}
      onDragStart={handleDragStart}
    >
      {isDraggable && <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
      <div className={`${isSm ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"} rounded-full ${colorClass} flex items-center justify-center font-bold shrink-0`}>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`${isSm ? "text-xs" : "text-sm"} font-semibold text-foreground truncate leading-tight`}>{person.name}</p>
        <p className={`${isSm ? "text-[10px]" : "text-xs"} text-muted-foreground truncate`}>
          {person.designation || ROLE_LABELS[person.role] || person.role}
        </p>
        {person.team_name && !isSm && (
          <p className="text-[10px] text-muted-foreground/60 truncate">{person.team_name}</p>
        )}
      </div>
    </div>
  );
}

function TeamBlock({ team, expanded, onToggle }) {
  const memberCount = team.members?.length || 0;
  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card/50" data-testid={`team-block-${team.leader.id}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {team.leader.name?.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold truncate">{team.leader.name}</p>
            <p className="text-xs text-muted-foreground">{team.leader.team_name || "Team Leader"} &middot; {memberCount} members</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {expanded && memberCount > 0 && (
        <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 border-t border-border/30 pt-2">
          {team.members.map(m => (
            <PersonCard key={m.id} person={m} size="sm" draggable={canEdit} />
          ))}
        </div>
      )}
      {expanded && memberCount === 0 && (
        <p className="px-3 pb-3 text-xs text-muted-foreground/60 italic border-t border-border/30 pt-2">No direct reports assigned</p>
      )}
    </div>
  );
}

function DepartmentSection({ dept, searchQuery, canEdit, onMoveUser }) {
  const [open, setOpen] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState({});
  const [isDragOver, setIsDragOver] = useState(false);

  const toggleTeam = (id) => setExpandedTeams(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDragOver = (e) => {
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canEdit) return;
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      onMoveUser(data.userId, data.name, dept.name);
    } catch {}
  };

  const matchesSearch = (p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.designation?.toLowerCase().includes(q) || p.role?.toLowerCase().includes(q);
  };

  const filteredTeams = dept.teams?.map(t => ({
    ...t,
    members: t.members?.filter(matchesSearch) || [],
  })).filter(t => matchesSearch(t.leader) || t.members.length > 0) || [];

  const filteredDirect = dept.direct_members?.filter(matchesSearch) || [];
  const headMatches = dept.head ? matchesSearch(dept.head) : false;

  if (searchQuery && !headMatches && filteredTeams.length === 0 && filteredDirect.length === 0) return null;

  const DEPT_COLORS = {
    "Sales": "from-blue-500/10 to-blue-600/5 border-blue-500/20",
    "Customer Service": "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
    "Mentors/Academics": "from-orange-500/10 to-orange-600/5 border-orange-500/20",
    "Mentorship": "from-amber-500/10 to-amber-600/5 border-amber-500/20",
    "Marketing": "from-pink-500/10 to-pink-600/5 border-pink-500/20",
    "Operations": "from-purple-500/10 to-purple-600/5 border-purple-500/20",
    "HR": "from-rose-500/10 to-rose-600/5 border-rose-500/20",
    "Finance": "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20",
    "Management": "from-amber-500/10 to-amber-600/5 border-amber-500/20",
    "Quality Control": "from-slate-500/10 to-slate-600/5 border-slate-500/20",
    "Business Development": "from-pink-500/10 to-pink-600/5 border-pink-500/20",
  };

  const gradient = DEPT_COLORS[dept.name] || "from-slate-500/10 to-slate-600/5 border-slate-500/20";

  return (
    <Card
      className={`bg-gradient-to-br ${gradient} overflow-hidden ${isDragOver ? "ring-2 ring-primary ring-offset-2" : ""}`}
      data-testid={`dept-section-${dept.name}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <div className="text-left">
            <h3 className="text-base font-bold">{dept.name}</h3>
            <p className="text-xs text-muted-foreground">{dept.count} members &middot; {dept.teams?.length || 0} teams</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{dept.count}</Badge>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <CardContent className="pt-0 pb-4 space-y-3">
          {dept.head && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-1.5">Department Head</p>
              <PersonCard person={dept.head} highlight />
            </div>
          )}
          {filteredTeams.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-1.5">Teams</p>
              <div className="space-y-2">
                {filteredTeams.map(t => (
                  <TeamBlock key={t.leader.id} team={t} expanded={!!expandedTeams[t.leader.id] || !!searchQuery} onToggle={() => toggleTeam(t.leader.id)} />
                ))}
              </div>
            </div>
          )}
          {filteredDirect.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold mb-1.5">Direct Members</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {filteredDirect.map(m => (
                  <PersonCard key={m.id} person={m} size="sm" draggable={canEdit} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function OrganizationMapPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("chart");

  useEffect(() => {
    apiClient.get("/organization/map")
      .then(r => setData(r.data))
      .catch(() => toast.error("Failed to load organization map"))
      .finally(() => setLoading(false));
  }, []);

  const sortedDepts = useMemo(() => {
    if (!data) return [];
    const priority = ["Management", "Sales", "Customer Service", "Mentors/Academics", "Mentorship", "Operations", "Marketing", "HR", "Finance", "Quality Control", "Business Development"];
    return [...data.departments].sort((a, b) => {
      const ai = priority.indexOf(a.name);
      const bi = priority.indexOf(b.name);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [data]);

  const canEdit = ["super_admin", "admin", "hr", "coo"].includes(user?.role);

  const handleMoveUser = useCallback(async (userId, userName, newDepartment) => {
    if (!window.confirm(`Move ${userName} to ${newDepartment}?`)) return;
    try {
      await apiClient.put("/organization/move-user", { user_id: userId, department: newDepartment });
      toast.success(`${userName} moved to ${newDepartment}`);
      fetchData();
    } catch (e) {
      toast.error("Failed to move user");
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="org-map-loading">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-center text-muted-foreground py-20">No data available</p>;

  const tabs = [
    { id: "chart", label: "Org Chart", icon: Network },
    { id: "approvals", label: "Approval Matrix", icon: Shield },
    { id: "stats", label: "Statistics", icon: Users },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto" data-testid="organization-map-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="w-6 h-6 text-primary" />
            Organization Map
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.stats.total_employees} employees across {data.stats.total_departments} departments
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="org-search-input"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit" data-testid="org-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`org-tab-${t.id}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Org Chart */}
      {activeTab === "chart" && (
        <div className="space-y-4">
          {/* CEO Card */}
          {data.ceo && (
            <Card className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border-amber-500/30" data-testid="ceo-card">
              <CardContent className="py-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-amber-500 text-white flex items-center justify-center text-lg font-bold shadow-lg">
                  <Crown className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-lg font-bold">{data.ceo.name}</p>
                  <p className="text-sm text-muted-foreground">{data.ceo.designation || "Chief Executive Officer"}</p>
                  <Badge className="mt-1 bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">CEO &middot; Super Admin</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connector line */}
          <div className="flex justify-center">
            <div className="w-px h-6 bg-border" />
          </div>

          {/* Departments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedDepts.filter(d => d.name !== "Management").map(dept => (
              <DepartmentSection key={dept.name} dept={dept} searchQuery={searchQuery} canEdit={canEdit} onMoveUser={handleMoveUser} />
            ))}
          </div>
        </div>
      )}

      {/* Tab: Approval Matrix */}
      {activeTab === "approvals" && (
        <div className="space-y-4" data-testid="approval-matrix">
          <p className="text-sm text-muted-foreground">Defines who approves what across the organization.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.approval_matrix.map((item, idx) => (
              <Card key={idx} className="hover:shadow-md transition-shadow" data-testid={`approval-item-${idx}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    {item.type}
                  </CardTitle>
                  <CardDescription className="text-xs">{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.flow.map((step, si) => (
                      <React.Fragment key={si}>
                        <Badge variant="outline" className="text-xs py-1 px-2.5 font-medium bg-muted/50">{step}</Badge>
                        {si < item.flow.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50" />}
                      </React.Fragment>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Statistics */}
      {activeTab === "stats" && (
        <div className="space-y-4" data-testid="org-stats">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Employees</p>
                <p className="text-3xl font-bold mt-1">{data.stats.total_employees}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Departments</p>
                <p className="text-3xl font-bold mt-1">{data.stats.total_departments}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Teams</p>
                <p className="text-3xl font-bold mt-1">{data.stats.total_teams}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Roles</p>
                <p className="text-3xl font-bold mt-1">{Object.keys(data.stats.role_distribution).length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Role Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Role Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(data.stats.role_distribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([role, count]) => {
                    const pct = Math.round((count / data.stats.total_employees) * 100);
                    const colorClass = ROLE_COLORS[role]?.split(" ")[0] || "bg-slate-400";
                    return (
                      <div key={role} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-36 truncate">{ROLE_LABELS[role] || role}</span>
                        <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
                          <div className={`h-full ${colorClass} rounded-full transition-all duration-500`} style={{ width: `${Math.max(pct, 3)}%` }} />
                        </div>
                        <span className="text-xs font-mono font-semibold w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Dept Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Department Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(data.stats.department_distribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([dept, count]) => (
                    <div key={dept} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                      <span className="text-xs font-medium truncate">{dept}</span>
                      <Badge variant="secondary" className="text-xs ml-2">{count}</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
