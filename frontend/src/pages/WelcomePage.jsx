import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CLTAnimation from '@/components/CLTAnimation';

function WelcomePage() {
    const navigate = useNavigate();
    
    function handleAnimationComplete() {
        toast.success('Welcome to CLT Academy ERP');
        navigate('/home');
    }
    
    return <CLTAnimation onComplete={handleAnimationComplete} />;
}

export default WelcomePage;
