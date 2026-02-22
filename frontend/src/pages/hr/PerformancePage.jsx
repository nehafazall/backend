import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
    TrendingUp, RefreshCw, Plus, Star, Target, Users, 
    BarChart3, Award, Calendar
} from 'lucide-react';

const PerformancePage = () => {
    const [kpis, setKpis] = useState([]);
    const [kpiScores, setKpiScores] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('kpis');
    const [showKpiModal, setShowKpiModal] = useState(false);
    const [showScoreModal, setShowScoreModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    
    const [kpiForm, setKpiForm] = useState({
        name: '', description: '', category: 'individual', department: '',
        target_value: 0, unit: 'number', weight: 1, period: 'monthly'
    });
    
    const [scoreForm, setScoreForm] = useState({
        kpi_id: '', employee_id: '', department: '',
        period_month: new Date().getMonth() + 1,
        period_year: new Date().getFullYear(),
        actual_value: 0, comments: ''
    });
    
    const [reviewForm, setReviewForm] = useState({
        employee_id: '', review_period: '', overall_rating: 3,
        strengths: '', areas_for_improvement: '', goals_next_period: '', comments: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [kpisRes, scoresRes, reviewsRes, empRes] = await Promise.all([
                api.get('/hr/kpis'),
                api.get('/hr/kpi-scores'),
                api.get('/hr/performance-reviews'),
                api.get('/hr/employees')
            ]);
            setKpis(kpisRes.data || []);
            setKpiScores(scoresRes.data || []);
            setReviews(reviewsRes.data || []);
            setEmployees(empRes.data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKpi = async () => {
        try {
            await api.post('/hr/kpis', kpiForm);
            toast.success('KPI created');
            setShowKpiModal(false);
            resetKpiForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create KPI');
        }
    };

    const handleRecordScore = async () => {
        try {
            await api.post('/hr/kpi-scores', scoreForm);
            toast.success('KPI score recorded');
            setShowScoreModal(false);
            resetScoreForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to record score');
        }
    };

    const handleCreateReview = async () => {
        try {
            await api.post('/hr/performance-reviews', reviewForm);
            toast.success('Performance review created');
            setShowReviewModal(false);
            resetReviewForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create review');
        }
    };

    const resetKpiForm = () => {
        setKpiForm({
            name: '', description: '', category: 'individual', department: '',
            target_value: 0, unit: 'number', weight: 1, period: 'monthly'
        });
    };

    const resetScoreForm = () => {
        setScoreForm({
            kpi_id: '', employee_id: '', department: '',
            period_month: new Date().getMonth() + 1,
            period_year: new Date().getFullYear(),
            actual_value: 0, comments: ''
        });
    };

    const resetReviewForm = () => {
        setReviewForm({
            employee_id: '', review_period: '', overall_rating: 3,
            strengths: '', areas_for_improvement: '', goals_next_period: '', comments: ''
        });
    };

    const getScoreColor = (achievement) => {
        if (achievement >= 100) return 'text-green-600';
        if (achievement >= 80) return 'text-amber-600';
        return 'text-red-600';
    };

    const getRatingStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star 
                key={i} 
                className={`h-4 w-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
            />
        ));
    };

    return (
        <div className="space-y-6" data-testid="performance-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Performance Management</h1>
                    <p className="text-muted-foreground">Track KPIs and performance reviews</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 mr-2" />Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                                <Target className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{kpis.length}</p>
                                <p className="text-sm text-muted-foreground">KPIs Defined</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30">
                                <BarChart3 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{kpiScores.length}</p>
                                <p className="text-sm text-muted-foreground">Scores Recorded</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                                <Award className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{reviews.length}</p>
                                <p className="text-sm text-muted-foreground">Reviews</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {kpiScores.length > 0 
                                        ? Math.round(kpiScores.reduce((s, k) => s + (k.achievement_percentage || 0), 0) / kpiScores.length)
                                        : 0}%
                                </p>
                                <p className="text-sm text-muted-foreground">Avg Achievement</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="kpis">KPI Definitions</TabsTrigger>
                    <TabsTrigger value="scores">KPI Scores</TabsTrigger>
                    <TabsTrigger value="reviews">Performance Reviews</TabsTrigger>
                </TabsList>

                <TabsContent value="kpis" className="mt-4">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>KPI Definitions</CardTitle>
                            <Button size="sm" onClick={() => setShowKpiModal(true)}>
                                <Plus className="h-4 w-4 mr-2" />Add KPI
                            </Button>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Weight</TableHead>
                                    <TableHead>Period</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {kpis.map((kpi) => (
                                    <TableRow key={kpi.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{kpi.name}</p>
                                                <p className="text-xs text-muted-foreground">{kpi.description}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="capitalize">{kpi.category}</TableCell>
                                        <TableCell>{kpi.department || 'All'}</TableCell>
                                        <TableCell className="font-medium">{kpi.target_value}</TableCell>
                                        <TableCell>{kpi.unit}</TableCell>
                                        <TableCell>{kpi.weight}x</TableCell>
                                        <TableCell className="capitalize">{kpi.period}</TableCell>
                                    </TableRow>
                                ))}
                                {kpis.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No KPIs defined. Click "Add KPI" to create one.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="scores" className="mt-4">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>KPI Scores</CardTitle>
                            <Button size="sm" onClick={() => setShowScoreModal(true)}>
                                <Plus className="h-4 w-4 mr-2" />Record Score
                            </Button>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>KPI</TableHead>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Actual</TableHead>
                                    <TableHead>Achievement</TableHead>
                                    <TableHead>Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {kpiScores.map((score) => (
                                    <TableRow key={score.id}>
                                        <TableCell className="font-medium">{score.kpi_name}</TableCell>
                                        <TableCell>{score.employee_id ? employees.find(e => e.id === score.employee_id)?.full_name || score.employee_id : score.department}</TableCell>
                                        <TableCell>{score.period_month}/{score.period_year}</TableCell>
                                        <TableCell>{score.target_value}</TableCell>
                                        <TableCell>{score.actual_value}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={Math.min(score.achievement_percentage, 100)} className="w-16 h-2" />
                                                <span className={getScoreColor(score.achievement_percentage)}>
                                                    {score.achievement_percentage}%
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{score.weighted_score}</TableCell>
                                    </TableRow>
                                ))}
                                {kpiScores.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No scores recorded yet
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="reviews" className="mt-4">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>Performance Reviews</CardTitle>
                            <Button size="sm" onClick={() => setShowReviewModal(true)}>
                                <Plus className="h-4 w-4 mr-2" />New Review
                            </Button>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Review Period</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Reviewer</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reviews.map((review) => (
                                    <TableRow key={review.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{review.employee_name}</p>
                                                <p className="text-xs text-muted-foreground">{review.employee_code}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{review.department}</TableCell>
                                        <TableCell>{review.review_period}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {getRatingStars(review.overall_rating)}
                                                <span className="ml-1 text-sm">{review.overall_rating}/5</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{review.reviewer_name}</TableCell>
                                        <TableCell>
                                            <Badge variant={review.status === 'completed' ? 'default' : 'secondary'}>
                                                {review.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(review.created_at).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                                {reviews.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No performance reviews yet
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create KPI Modal */}
            <Dialog open={showKpiModal} onOpenChange={setShowKpiModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create KPI</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={kpiForm.name} onChange={(e) => setKpiForm({...kpiForm, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={kpiForm.description} onChange={(e) => setKpiForm({...kpiForm, description: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={kpiForm.category} onValueChange={(v) => setKpiForm({...kpiForm, category: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="company">Company</SelectItem>
                                        <SelectItem value="department">Department</SelectItem>
                                        <SelectItem value="individual">Individual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Period</Label>
                                <Select value={kpiForm.period} onValueChange={(v) => setKpiForm({...kpiForm, period: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Target</Label>
                                <Input type="number" value={kpiForm.target_value} onChange={(e) => setKpiForm({...kpiForm, target_value: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Unit</Label>
                                <Select value={kpiForm.unit} onValueChange={(v) => setKpiForm({...kpiForm, unit: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="number">Number</SelectItem>
                                        <SelectItem value="percentage">Percentage</SelectItem>
                                        <SelectItem value="currency">Currency</SelectItem>
                                        <SelectItem value="rating">Rating</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Weight</Label>
                                <Input type="number" step="0.1" value={kpiForm.weight} onChange={(e) => setKpiForm({...kpiForm, weight: Number(e.target.value)})} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowKpiModal(false)}>Cancel</Button>
                        <Button onClick={handleCreateKpi}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Record Score Modal */}
            <Dialog open={showScoreModal} onOpenChange={setShowScoreModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Record KPI Score</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>KPI</Label>
                            <Select value={scoreForm.kpi_id} onValueChange={(v) => setScoreForm({...scoreForm, kpi_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Select KPI" /></SelectTrigger>
                                <SelectContent>
                                    {kpis.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Employee</Label>
                            <Select value={scoreForm.employee_id} onValueChange={(v) => setScoreForm({...scoreForm, employee_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                                <SelectContent>
                                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Month</Label>
                                <Input type="number" min={1} max={12} value={scoreForm.period_month} onChange={(e) => setScoreForm({...scoreForm, period_month: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Input type="number" value={scoreForm.period_year} onChange={(e) => setScoreForm({...scoreForm, period_year: Number(e.target.value)})} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Actual Value</Label>
                            <Input type="number" value={scoreForm.actual_value} onChange={(e) => setScoreForm({...scoreForm, actual_value: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Comments</Label>
                            <Textarea value={scoreForm.comments} onChange={(e) => setScoreForm({...scoreForm, comments: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowScoreModal(false)}>Cancel</Button>
                        <Button onClick={handleRecordScore}>Record</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Review Modal */}
            <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New Performance Review</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-2">
                            <Label>Employee</Label>
                            <Select value={reviewForm.employee_id} onValueChange={(v) => setReviewForm({...reviewForm, employee_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                                <SelectContent>
                                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Review Period</Label>
                            <Input placeholder="e.g., Q1-2026, Annual-2025" value={reviewForm.review_period} onChange={(e) => setReviewForm({...reviewForm, review_period: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Overall Rating (1-5)</Label>
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map(r => (
                                    <Button 
                                        key={r} 
                                        variant={reviewForm.overall_rating === r ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setReviewForm({...reviewForm, overall_rating: r})}
                                    >
                                        {r}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Strengths</Label>
                            <Textarea value={reviewForm.strengths} onChange={(e) => setReviewForm({...reviewForm, strengths: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Areas for Improvement</Label>
                            <Textarea value={reviewForm.areas_for_improvement} onChange={(e) => setReviewForm({...reviewForm, areas_for_improvement: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Goals for Next Period</Label>
                            <Textarea value={reviewForm.goals_next_period} onChange={(e) => setReviewForm({...reviewForm, goals_next_period: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReviewModal(false)}>Cancel</Button>
                        <Button onClick={handleCreateReview}>Create Review</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PerformancePage;
