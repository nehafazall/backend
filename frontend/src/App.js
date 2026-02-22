import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, ThemeProvider, useAuth } from "@/lib/api";

// Pages
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import SalesCRMPage from "@/pages/SalesCRMPage";
import SalesDashboard from "@/pages/SalesDashboard";
import CustomerServicePage from "@/pages/CustomerServicePage";
import MentorCRMPage from "@/pages/MentorCRMPage";
import UsersPage from "@/pages/UsersPage";
import DepartmentsPage from "@/pages/DepartmentsPage";
import CoursesPage from "@/pages/CoursesPage";
import CommissionEnginePage from "@/pages/CommissionEnginePage";
import AccessControlPage from "@/pages/AccessControlPage";
import CSDashboard from "@/pages/CSDashboard";
import LeadsPoolPage from "@/pages/LeadsPoolPage";
import CustomerMasterPage from "@/pages/CustomerMasterPage";
import FollowupsPage from "@/pages/FollowupsPage";
import MentorDashboardPage from "@/pages/MentorDashboardPage";
import SettingsPage from "@/pages/SettingsPage";
import WelcomePage from "@/pages/WelcomePage";
import QCDashboardPage from "@/pages/QCDashboardPage";
import AuditLogPage from "@/pages/AuditLogPage";
import PasswordResetPage from "@/pages/PasswordResetPage";
import RolesPage from "@/pages/RolesPage";
import TeamsPage from "@/pages/TeamsPage";

// Finance Module
import FinanceEntitySelector from "@/pages/FinanceEntitySelector";
import FinanceLayout from "@/pages/FinanceLayout";
import FinanceDashboard from "@/pages/finance/FinanceDashboard";
import JournalPage from "@/pages/finance/JournalPage";
import SettlementsPage from "@/pages/finance/SettlementsPage";
import ExpensesPage from "@/pages/finance/ExpensesPage";
import TransfersPage from "@/pages/finance/TransfersPage";
import AccountsPage from "@/pages/finance/AccountsPage";
import FinanceCommissionEnginePage from "@/pages/finance/CommissionEnginePage";
import CommissionSettlementsPage from "@/pages/finance/CommissionSettlementsPage";
import Layout from "@/components/Layout";

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, loading, isAuthenticated } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
        return <Navigate to="/dashboard" replace />;
    }
    
    return children;
};

// Public Route (redirect to welcome if just logged in, or home if already authenticated)
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading, justLoggedIn } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    if (isAuthenticated) {
        // If user just logged in, redirect to welcome animation
        if (justLoggedIn) {
            return <Navigate to="/welcome" replace />;
        }
        // Otherwise, redirect to home
        return <Navigate to="/home" replace />;
    }
    
    return children;
};

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
                <PublicRoute>
                    <LoginPage />
                </PublicRoute>
            } />
            
            {/* Welcome Animation - Shows after login */}
            <Route path="/welcome" element={
                <ProtectedRoute>
                    <WelcomePage />
                </ProtectedRoute>
            } />
            
            {/* Protected Routes with Layout */}
            <Route path="/" element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/home" replace />} />
                <Route path="home" element={<div />} />
                <Route path="dashboard" element={<DashboardPage />} />
                
                {/* Today's Follow-ups */}
                <Route path="followups" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive', 'cs_head', 'cs_agent', 'mentor', 'academic_master']}>
                        <FollowupsPage />
                    </ProtectedRoute>
                } />
                
                {/* Sales CRM */}
                <Route path="sales" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive']}>
                        <SalesCRMPage />
                    </ProtectedRoute>
                } />
                <Route path="sales/dashboard" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive']}>
                        <SalesDashboard />
                    </ProtectedRoute>
                } />
                
                {/* Leads Pool */}
                <Route path="leads/pool" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'sales_manager', 'team_leader']}>
                        <LeadsPoolPage />
                    </ProtectedRoute>
                } />
                
                {/* Customer Master */}
                <Route path="customers" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'sales_manager', 'cs_head', 'finance']}>
                        <CustomerMasterPage />
                    </ProtectedRoute>
                } />
                
                {/* Customer Service */}
                <Route path="cs" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'cs_head', 'cs_agent']}>
                        <CustomerServicePage />
                    </ProtectedRoute>
                } />
                <Route path="cs/dashboard" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'cs_head', 'cs_agent']}>
                        <CSDashboard />
                    </ProtectedRoute>
                } />
                
                {/* Mentor CRM */}
                <Route path="mentor" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'mentor', 'academic_master']}>
                        <MentorCRMPage />
                    </ProtectedRoute>
                } />
                <Route path="mentor/dashboard" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'mentor', 'academic_master']}>
                        <MentorDashboardPage />
                    </ProtectedRoute>
                } />
                
                {/* Finance - Entity Selection */}
                <Route path="finance" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'finance']}>
                        <FinanceEntitySelector />
                    </ProtectedRoute>
                } />
                
                {/* Finance - Entity Layout with Sub-routes */}
                <Route path="finance/:entity" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'finance']}>
                        <FinanceLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<FinanceDashboard />} />
                    <Route path="journal" element={<JournalPage />} />
                    <Route path="settlements" element={<SettlementsPage />} />
                    <Route path="expenses" element={<ExpensesPage />} />
                    <Route path="transfers" element={<TransfersPage />} />
                    <Route path="accounts" element={<AccountsPage />} />
                    <Route path="commission-engine" element={<FinanceCommissionEnginePage />} />
                    <Route path="commission-settlements" element={<CommissionSettlementsPage />} />
                </Route>
                
                {/* User Management */}
                <Route path="users" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'hr']}>
                        <UsersPage />
                    </ProtectedRoute>
                } />
                
                {/* Department Management */}
                <Route path="departments" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'hr']}>
                        <DepartmentsPage />
                    </ProtectedRoute>
                } />
                
                {/* Course Management */}
                <Route path="courses" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                        <CoursesPage />
                    </ProtectedRoute>
                } />
                
                {/* Commission Engine */}
                <Route path="commissions" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'finance']}>
                        <CommissionEnginePage />
                    </ProtectedRoute>
                } />
                
                {/* Access Control */}
                <Route path="access-control" element={
                    <ProtectedRoute allowedRoles={['super_admin']}>
                        <AccessControlPage />
                    </ProtectedRoute>
                } />
                
                {/* Role Management */}
                <Route path="roles" element={
                    <ProtectedRoute allowedRoles={['super_admin']}>
                        <RolesPage />
                    </ProtectedRoute>
                } />
                
                {/* QC Dashboard */}
                <Route path="qc-dashboard" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'cs_head', 'sales_manager']}>
                        <QCDashboardPage />
                    </ProtectedRoute>
                } />
                
                {/* Audit Log */}
                <Route path="audit-log" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                        <AuditLogPage />
                    </ProtectedRoute>
                } />
                
                {/* Password Reset Requests */}
                <Route path="password-resets" element={
                    <ProtectedRoute allowedRoles={['super_admin']}>
                        <PasswordResetPage />
                    </ProtectedRoute>
                } />
                
                {/* Settings */}
                <Route path="settings" element={<SettingsPage />} />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <AppRoutes />
                    <Toaster position="top-right" richColors />
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
