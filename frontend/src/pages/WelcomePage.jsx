import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/api';
import CLTAnimation from '@/components/CLTAnimation';

function WelcomePage() {
    const navigate = useNavigate();
    const { clearJustLoggedIn } = useAuth();
    
    const handleAnimationComplete = useCallback(() => {
        clearJustLoggedIn();
        toast.success('Welcome to CLT Synapse');
        navigate('/home');
    }, [clearJustLoggedIn, navigate]);
    
    return <CLTAnimation onComplete={handleAnimationComplete} />;
}

export default WelcomePage;
