import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import {
    WorkforceCards,
    AttendanceCard,
    ApprovalsCard,
    DocumentAlertsCard,
    DepartmentBreakdown,
    UpcomingConfirmations,
    GenderRatioCard,
    LeaveSummaryCard
} from './HRDashboardCards';
import { SalaryEstimationWidget } from '@/components/hr/SalaryEstimationWidget';

const HRDashboard = () => {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const response = await api.get('/hr/dashboard');
            setDashboard(response.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !dashboard) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="hr-dashboard">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">HR Dashboard</h1>
                    <p className="text-muted-foreground">Real-time workforce insights</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchDashboard}>
                    <RefreshCw className="h-4 w-4 mr-2" />Refresh
                </Button>
            </div>

            <SalaryEstimationWidget />

            <WorkforceCards workforce={dashboard.workforce} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AttendanceCard 
                    attendance={dashboard.attendance} 
                    totalEmployees={dashboard.workforce.total_employees} 
                />
                <ApprovalsCard approvals={dashboard.approvals} />
                <DocumentAlertsCard alerts={dashboard.document_alerts} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DepartmentBreakdown 
                    departments={dashboard.workforce.by_department} 
                    totalEmployees={dashboard.workforce.total_employees}
                />
                <UpcomingConfirmations confirmations={dashboard.upcoming_confirmations} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GenderRatioCard genderRatio={dashboard.workforce.gender_ratio} />
                <LeaveSummaryCard leaveSummary={dashboard.leave_summary} />
            </div>
        </div>
    );
};

export default HRDashboard;
