import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, ThemeProvider, useAuth } from "@/lib/api";

// Pages
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import SalesCRMPage from "@/pages/SalesCRMPage";
import CustomerServicePage from "@/pages/CustomerServicePage";
import MentorCRMPage from "@/pages/MentorCRMPage";
import FinancePage from "@/pages/FinancePage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
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

// Public Route (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
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
            
            {/* Protected Routes with Layout */}
            <Route path="/" element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                
                {/* Sales CRM */}
                <Route path="sales/*" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive']}>
                        <SalesCRMPage />
                    </ProtectedRoute>
                } />
                
                {/* Customer Service */}
                <Route path="cs/*" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'cs_head', 'cs_agent']}>
                        <CustomerServicePage />
                    </ProtectedRoute>
                } />
                
                {/* Mentor CRM */}
                <Route path="mentor/*" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'mentor']}>
                        <MentorCRMPage />
                    </ProtectedRoute>
                } />
                
                {/* Finance */}
                <Route path="finance/*" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'finance']}>
                        <FinancePage />
                    </ProtectedRoute>
                } />
                
                {/* User Management */}
                <Route path="users" element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                        <UsersPage />
                    </ProtectedRoute>
                } />
                
                {/* Settings */}
                <Route path="settings" element={<SettingsPage />} />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
