import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import {
  CalendarDays, Plus, Trash2, Clock, Sun, Moon,
  Settings, Edit, AlertTriangle, Shield
} from "lucide-react";

export default function AttendanceSettingsPage() {
  const [holidays, setHolidays] = useState([]);
  const [rules, setRules] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [editingPeriod, setEditingPeriod] = useState(null);

  // Forms
  const [holidayForm, setHolidayForm] = useState({ name: "", start_date: "", end_date: "", holiday_type: "public" });
  const [periodForm, setPeriodForm] = useState({ name: "", start_date: "", end_date: "", reduced_hours: 6, shift_start: "", shift_end: "", description: "" });
  const [shiftForm, setShiftForm] = useState({ name: "", start: "", end: "", grace_minutes: 30, location: "" });
  const [rulesForm, setRulesForm] = useState({ grace_period_minutes: 30, full_day_hours_min: 6, half_day_hours_min: 3, friday_off: true, saturday_off: true });

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [holRes, rulesRes, shiftsRes] = await Promise.all([
        apiClient.get(`/hr/holidays?year=${selectedYear}`),
        apiClient.get("/hr/settings/attendance-rules"),
        apiClient.get("/hr/shifts"),
      ]);
      setHolidays(Array.isArray(holRes.data) ? holRes.data : []);
      setRules(rulesRes.data);
      if (rulesRes.data) {
        setRulesForm({
          grace_period_minutes: rulesRes.data.grace_period_minutes || 30,
          full_day_hours_min: rulesRes.data.full_day_hours_min || 6,
          half_day_hours_min: rulesRes.data.half_day_hours_min || 3,
          friday_off: rulesRes.data.friday_off !== false,
          saturday_off: rulesRes.data.saturday_off !== false,
        });
      }
      setShifts(Array.isArray(shiftsRes.data) ? shiftsRes.data : []);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Holiday Handlers ──────────────────────────
  const handleCreateHoliday = async () => {
    if (!holidayForm.name || !holidayForm.start_date) {
      toast.error("Name and start date are required");
      return;
    }
    try {
      const res = await apiClient.post("/hr/holidays", {
        ...holidayForm,
        end_date: holidayForm.end_date || holidayForm.start_date,
      });
      toast.success(res.data.message);
      setShowHolidayModal(false);
      setHolidayForm({ name: "", start_date: "", end_date: "", holiday_type: "public" });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create holiday");
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm("Delete this holiday?")) return;
    try {
      await apiClient.delete(`/hr/holidays/${id}`);
      toast.success("Holiday deleted");
      fetchAll();
    } catch { toast.error("Failed to delete"); }
  };

  // ─── Special Period Handlers ──────────────────────────
  const handleSavePeriod = async () => {
    if (!periodForm.name || !periodForm.start_date || !periodForm.end_date) {
      toast.error("Name and date range are required");
      return;
    }
    try {
      const currentPeriods = rules?.special_periods || [];
      let updatedPeriods;
      if (editingPeriod !== null) {
        updatedPeriods = currentPeriods.map((p, i) => i === editingPeriod ? periodForm : p);
      } else {
        updatedPeriods = [...currentPeriods, periodForm];
      }
      await apiClient.put("/hr/settings/attendance-rules", {
        ...rulesForm,
        special_periods: updatedPeriods,
      });
      toast.success(editingPeriod !== null ? "Period updated" : "Period created");
      setShowPeriodModal(false);
      setEditingPeriod(null);
      setPeriodForm({ name: "", start_date: "", end_date: "", reduced_hours: 6, shift_start: "", shift_end: "", description: "" });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    }
  };

  const handleDeletePeriod = async (index) => {
    if (!window.confirm("Delete this special period?")) return;
    try {
      const currentPeriods = rules?.special_periods || [];
      const updatedPeriods = currentPeriods.filter((_, i) => i !== index);
      await apiClient.put("/hr/settings/attendance-rules", {
        ...rulesForm,
        special_periods: updatedPeriods,
      });
      toast.success("Period deleted");
      fetchAll();
    } catch { toast.error("Failed to delete"); }
  };

  const openEditPeriod = (period, index) => {
    setEditingPeriod(index);
    setPeriodForm({ ...period });
    setShowPeriodModal(true);
  };

  // ─── Shift Handlers ──────────────────────────
  const handleSaveShift = async () => {
    if (!shiftForm.name || !shiftForm.start || !shiftForm.end) {
      toast.error("Name, start, and end times are required");
      return;
    }
    try {
      if (editingShift) {
        await apiClient.put(`/hr/shifts/${editingShift.id}`, shiftForm);
        toast.success("Shift updated");
      } else {
        await apiClient.post("/hr/shifts", {
          id: shiftForm.name.toLowerCase().replace(/\s+/g, '_'),
          ...shiftForm,
        });
        toast.success("Shift created");
      }
      setShowShiftModal(false);
      setEditingShift(null);
      setShiftForm({ name: "", start: "", end: "", grace_minutes: 30, location: "" });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    }
  };

  const handleDeleteShift = async (id) => {
    if (!window.confirm("Delete this shift?")) return;
    try {
      await apiClient.delete(`/hr/shifts/${id}`);
      toast.success("Shift deleted");
      fetchAll();
    } catch { toast.error("Failed to delete"); }
  };

  // ─── General Rules ──────────────────────────
  const handleSaveRules = async () => {
    try {
      await apiClient.put("/hr/settings/attendance-rules", {
        ...rulesForm,
        special_periods: rules?.special_periods || [],
      });
      toast.success("Attendance rules updated");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const specialPeriods = rules?.special_periods || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="attendance-settings-page">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" /> Attendance Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage holidays, special periods, shifts, and attendance rules</p>
      </div>

      <Tabs defaultValue="holidays">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="holidays" data-testid="tab-holidays"><CalendarDays className="w-4 h-4 mr-1.5" />Holidays</TabsTrigger>
          <TabsTrigger value="periods" data-testid="tab-periods"><Moon className="w-4 h-4 mr-1.5" />Special Periods</TabsTrigger>
          <TabsTrigger value="shifts" data-testid="tab-shifts"><Clock className="w-4 h-4 mr-1.5" />Shifts</TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules"><Shield className="w-4 h-4 mr-1.5" />General Rules</TabsTrigger>
        </TabsList>

        {/* ═══ HOLIDAYS TAB ═══ */}
        <TabsContent value="holidays" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Year:</Label>
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="px-2 py-1 rounded border bg-background text-sm">
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <Badge variant="secondary">{holidays.length} holidays</Badge>
            </div>
            <Button onClick={() => { setHolidayForm({ name: "", start_date: "", end_date: "", holiday_type: "public" }); setShowHolidayModal(true); }} data-testid="add-holiday-btn">
              <Plus className="w-4 h-4 mr-1" />Add Holiday
            </Button>
          </div>

          {holidays.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No holidays defined for {selectedYear}. Add company holidays to exempt them from payroll deductions.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {holidays.map(h => (
                <Card key={h.id} data-testid={`holiday-${h.id}`}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <CalendarDays className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{h.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{h.holiday_type}</Badge>
                      <Button size="sm" variant="ghost" className="text-red-500 h-8" onClick={() => handleDeleteHoliday(h.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="py-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">How holidays affect payroll</p>
                <p className="text-xs text-muted-foreground">Days marked as company holidays are automatically excluded from working days calculation. Employees will not receive deductions for these days, even if no attendance record exists.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ SPECIAL PERIODS TAB ═══ */}
        <TabsContent value="periods" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{specialPeriods.length} period(s)</Badge>
            <Button onClick={() => { setEditingPeriod(null); setPeriodForm({ name: "", start_date: "", end_date: "", reduced_hours: 6, shift_start: "", shift_end: "", description: "" }); setShowPeriodModal(true); }} data-testid="add-period-btn">
              <Plus className="w-4 h-4 mr-1" />Add Special Period
            </Button>
          </div>

          {specialPeriods.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Moon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No special periods defined. Use this for Ramadan, summer hours, etc.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {specialPeriods.map((sp, idx) => (
                <Card key={idx} data-testid={`period-${idx}`}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Moon className="w-4 h-4 text-purple-500" />
                          <p className="text-sm font-semibold">{sp.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{sp.description || "No description"}</p>
                        <div className="flex flex-wrap gap-3 text-xs">
                          <span><span className="text-muted-foreground">Dates:</span> {sp.start_date} to {sp.end_date}</span>
                          <span><span className="text-muted-foreground">Full day =</span> <span className="font-bold text-primary">{sp.reduced_hours}h</span></span>
                          {sp.shift_start && <span><span className="text-muted-foreground">Shift:</span> {sp.shift_start} - {sp.shift_end}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => openEditPeriod(sp, idx)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 text-red-500" onClick={() => handleDeletePeriod(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="bg-purple-500/5 border-purple-500/20">
            <CardContent className="py-3 flex items-start gap-3">
              <Moon className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">How special periods work</p>
                <p className="text-xs text-muted-foreground">During a special period (e.g., Ramadan), the minimum hours for a "full day" is reduced. Example: Setting 6 hours means anyone working 6+ hours counts as Present instead of Half Day. You can also override shift start/end times.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ SHIFTS TAB ═══ */}
        <TabsContent value="shifts" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{shifts.length} shift(s)</Badge>
            <Button onClick={() => { setEditingShift(null); setShiftForm({ name: "", start: "", end: "", grace_minutes: 30, location: "" }); setShowShiftModal(true); }} data-testid="add-shift-btn">
              <Plus className="w-4 h-4 mr-1" />Add Shift
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map(s => (
              <Card key={s.id} data-testid={`shift-${s.id}`}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Sun className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{s.name}</p>
                      {s.location && <p className="text-xs text-muted-foreground">{s.location}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm mb-2">
                    <div><span className="text-muted-foreground text-xs">Start:</span> <span className="font-mono font-medium">{s.start}</span></div>
                    <div><span className="text-muted-foreground text-xs">End:</span> <span className="font-mono font-medium">{s.end}</span></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Grace: {s.grace_minutes || 0} minutes</p>
                  <div className="flex gap-1.5 mt-3 pt-2 border-t">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingShift(s); setShiftForm({ name: s.name, start: s.start, end: s.end, grace_minutes: s.grace_minutes || 30, location: s.location || "" }); setShowShiftModal(true); }}>
                      <Edit className="w-3 h-3 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => handleDeleteShift(s.id)}>
                      <Trash2 className="w-3 h-3 mr-1" />Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ═══ GENERAL RULES TAB ═══ */}
        <TabsContent value="rules" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance Calculation Rules</CardTitle>
              <CardDescription>These rules determine how attendance is processed for all employees</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Grace Period (minutes)</Label>
                  <Input type="number" value={rulesForm.grace_period_minutes} onChange={e => setRulesForm(p => ({ ...p, grace_period_minutes: parseInt(e.target.value) || 0 }))} data-testid="grace-period-input" />
                  <p className="text-xs text-muted-foreground mt-1">Minutes after shift start before marking as "Late"</p>
                </div>
                <div>
                  <Label>Full Day (minimum hours)</Label>
                  <Input type="number" step="0.5" value={rulesForm.full_day_hours_min} onChange={e => setRulesForm(p => ({ ...p, full_day_hours_min: parseFloat(e.target.value) || 0 }))} data-testid="full-day-hours-input" />
                  <p className="text-xs text-muted-foreground mt-1">Minimum hours to count as a full working day</p>
                </div>
                <div>
                  <Label>Half Day (minimum hours)</Label>
                  <Input type="number" step="0.5" value={rulesForm.half_day_hours_min} onChange={e => setRulesForm(p => ({ ...p, half_day_hours_min: parseFloat(e.target.value) || 0 }))} />
                  <p className="text-xs text-muted-foreground mt-1">Below this = absent, above = half day</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rulesForm.friday_off} onChange={e => setRulesForm(p => ({ ...p, friday_off: e.target.checked }))} className="rounded" />
                  <span className="text-sm">Friday is a day off</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rulesForm.saturday_off} onChange={e => setRulesForm(p => ({ ...p, saturday_off: e.target.checked }))} className="rounded" />
                  <span className="text-sm">Saturday is a day off</span>
                </label>
              </div>
              <Button onClick={handleSaveRules} data-testid="save-rules-btn">Save Rules</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ HOLIDAY MODAL ═══ */}
      <Dialog open={showHolidayModal} onOpenChange={setShowHolidayModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Company Holiday</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Holiday Name *</Label><Input value={holidayForm.name} onChange={e => setHolidayForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Eid Al Fitr" data-testid="holiday-name-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date *</Label><Input type="date" value={holidayForm.start_date} onChange={e => setHolidayForm(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={holidayForm.end_date} onChange={e => setHolidayForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={holidayForm.holiday_type} onValueChange={v => setHolidayForm(p => ({ ...p, holiday_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public Holiday</SelectItem>
                  <SelectItem value="religious">Religious Holiday</SelectItem>
                  <SelectItem value="company">Company Holiday</SelectItem>
                  <SelectItem value="national">National Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHolidayModal(false)}>Cancel</Button>
            <Button onClick={handleCreateHoliday} data-testid="save-holiday-btn">Create Holiday</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ SPECIAL PERIOD MODAL ═══ */}
      <Dialog open={showPeriodModal} onOpenChange={setShowPeriodModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPeriod !== null ? "Edit" : "Add"} Special Period</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Period Name *</Label><Input value={periodForm.name} onChange={e => setPeriodForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Ramadan 2026" data-testid="period-name-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date *</Label><Input type="date" value={periodForm.start_date} onChange={e => setPeriodForm(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div><Label>End Date *</Label><Input type="date" value={periodForm.end_date} onChange={e => setPeriodForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Full Day = minimum hours</Label>
              <Input type="number" step="0.5" value={periodForm.reduced_hours} onChange={e => setPeriodForm(p => ({ ...p, reduced_hours: parseFloat(e.target.value) || 0 }))} data-testid="reduced-hours-input" />
              <p className="text-xs text-muted-foreground mt-1">Employees working this many hours or more are marked as "Present" (full day)</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Override Shift Start</Label><Input type="time" value={periodForm.shift_start} onChange={e => setPeriodForm(p => ({ ...p, shift_start: e.target.value }))} /><p className="text-xs text-muted-foreground mt-1">Leave empty to keep default shift</p></div>
              <div><Label>Override Shift End</Label><Input type="time" value={periodForm.shift_end} onChange={e => setPeriodForm(p => ({ ...p, shift_end: e.target.value }))} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={periodForm.description} onChange={e => setPeriodForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="e.g. Ramadan working hours reduced to 6 hours" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPeriodModal(false)}>Cancel</Button>
            <Button onClick={handleSavePeriod} data-testid="save-period-btn">{editingPeriod !== null ? "Update" : "Create"} Period</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ SHIFT MODAL ═══ */}
      <Dialog open={showShiftModal} onOpenChange={setShowShiftModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingShift ? "Edit" : "Add"} Shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Shift Name *</Label><Input value={shiftForm.name} onChange={e => setShiftForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Morning Shift" data-testid="shift-name-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time *</Label><Input type="time" value={shiftForm.start} onChange={e => setShiftForm(p => ({ ...p, start: e.target.value }))} /></div>
              <div><Label>End Time *</Label><Input type="time" value={shiftForm.end} onChange={e => setShiftForm(p => ({ ...p, end: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Grace Period (mins)</Label><Input type="number" value={shiftForm.grace_minutes} onChange={e => setShiftForm(p => ({ ...p, grace_minutes: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Location</Label><Input value={shiftForm.location} onChange={e => setShiftForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. UAE, India" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShiftModal(false)}>Cancel</Button>
            <Button onClick={handleSaveShift} data-testid="save-shift-btn">{editingShift ? "Update" : "Create"} Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
