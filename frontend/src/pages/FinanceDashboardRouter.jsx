import React from 'react';
import { useParams } from 'react-router-dom';

// Import all dashboards
import CltFinanceDashboard from './finance/CltFinanceDashboard';
import MilesDashboard from './finance/MilesDashboard';
import TreasuryDashboard from './finance/TreasuryDashboard';
import BudgetDashboard from './finance/BudgetDashboard';
import OverallPNLDashboard from './finance/OverallPNLDashboard';

const FinanceDashboardRouter = () => {
    const { entity } = useParams();

    switch (entity) {
        case 'clt':
            return <CltFinanceDashboard />;
        case 'miles':
            return <MilesDashboard />;
        case 'treasury':
            return <TreasuryDashboard />;
        case 'budgeting':
            return <BudgetDashboard />;
        case 'pnl':
            return <OverallPNLDashboard />;
        default:
            return <CltFinanceDashboard />;
    }
};

export default FinanceDashboardRouter;
