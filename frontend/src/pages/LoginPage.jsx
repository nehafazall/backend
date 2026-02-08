import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showAnimation, setShowAnimation] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        
        if (!email || !password) {
            toast.error('Please enter email and password');
            return;
        }
        
        setLoading(true);
        
        try {
            await login(email, password);
            setShowAnimation(true);
        } catch (error) {
            const message = error.response?.data?.detail || 'Login failed. Please check your credentials.';
            toast.error(message);
            setLoading(false);
        }
    }

    function handleAnimationEnd() {
        toast.success('Welcome to CLT Academy ERP');
        navigate('/home');
    }

    if (showAnimation) {
        return <LogoAnimation onComplete={handleAnimationEnd} />;
    }

    return (
        <div className="min-h-screen flex bg-slate-900 relative overflow-hidden">
            {/* Trading Chart Background - Full page */}
            <div className="absolute inset-0">
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-15"
                    style={{ 
                        backgroundImage: `url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&q=80')`
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/95 to-blue-900/30" />
                <TradingChartSVG />
            </div>

            {/* Left Side - Logo */}
            <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative z-10">
                <div className="text-center">
                    <img 
                        src="https://customer-assets.emergentagent.com/job_37b7a798-83f6-40f1-8986-24840490698e/artifacts/kld5ow33_2.svg"
                        alt="CLT Academy"
                        className="h-32 w-auto mx-auto mb-8 drop-shadow-2xl"
                        data-testid="login-logo"
                    />
                    <h1 className="text-4xl font-bold text-white mb-4">CLT Academy</h1>
                    <p className="text-xl text-slate-400">Enterprise Resource Planning</p>
                    <div className="mt-8 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm text-slate-500">System Online</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <img 
                            src="https://customer-assets.emergentagent.com/job_37b7a798-83f6-40f1-8986-24840490698e/artifacts/kld5ow33_2.svg"
                            alt="CLT Academy"
                            className="h-16 w-auto mx-auto mb-4"
                        />
                    </div>

                    <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                            <p className="text-slate-400">Sign in to your account</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@clt-academy.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                                    data-testid="login-email"
                                    disabled={loading}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-300">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-12 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 pr-12"
                                        data-testid="login-password"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                            
                            <Button
                                type="submit"
                                className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-all duration-200 shadow-lg shadow-blue-600/25"
                                disabled={loading}
                                data-testid="login-submit"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-3">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                        Signing in...
                                    </div>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>

                        {/* Demo Credentials */}
                        <div className="mt-8 p-4 rounded-xl bg-slate-700/30 border border-slate-600/50">
                            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Demo Credentials</p>
                            <div className="space-y-1">
                                <p className="text-sm text-slate-300 font-mono">aqib@clt-academy.com</p>
                                <p className="text-sm text-slate-300 font-mono">A@qib1234</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-slate-500 text-sm mt-8">
                        © 2024 CLT Academy. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}

function TradingChartSVG() {
    return (
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
            <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
            </defs>
            {/* Grid lines */}
            <g stroke="#334155" strokeWidth="0.5" opacity="0.3">
                <line x1="0" y1="100" x2="1000" y2="100" />
                <line x1="0" y1="200" x2="1000" y2="200" />
                <line x1="0" y1="300" x2="1000" y2="300" />
                <line x1="0" y1="400" x2="1000" y2="400" />
                <line x1="0" y1="500" x2="1000" y2="500" />
                <line x1="200" y1="0" x2="200" y2="600" />
                <line x1="400" y1="0" x2="400" y2="600" />
                <line x1="600" y1="0" x2="600" y2="600" />
                <line x1="800" y1="0" x2="800" y2="600" />
            </g>
            {/* Candlestick chart simulation */}
            <g className="animate-pulse">
                <path d="M50,350 L100,320 L150,280 L200,300 L250,250 L300,220 L350,260 L400,200 L450,180 L500,220 L550,150 L600,180 L650,140 L700,160 L750,120 L800,150 L850,100 L900,130 L950,80" fill="none" stroke="#3b82f6" strokeWidth="2" />
                <path d="M50,350 L100,320 L150,280 L200,300 L250,250 L300,220 L350,260 L400,200 L450,180 L500,220 L550,150 L600,180 L650,140 L700,160 L750,120 L800,150 L850,100 L900,130 L950,80 L950,600 L50,600 Z" fill="url(#chartGradient)" />
            </g>
            {/* Second line */}
            <path d="M50,400 L100,380 L150,420 L200,390 L250,350 L300,380 L350,320 L400,350 L450,280 L500,310 L550,260 L600,290 L650,240 L700,270 L750,220 L800,250 L850,200 L900,230 L950,180" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />
        </svg>
    );
}

function LogoAnimation({ onComplete }) {
    const [phase, setPhase] = useState(1);

    React.useEffect(() => {
        const timer1 = setTimeout(() => setPhase(2), 800);
        const timer2 = setTimeout(() => setPhase(3), 1600);
        const timer3 = setTimeout(() => onComplete(), 2400);
        
        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [onComplete]);

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center relative overflow-hidden">
            {/* Trading chart background */}
            <div className="absolute inset-0 opacity-15">
                <TradingChartSVG />
            </div>
            
            {/* Animated rings */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className={`absolute w-64 h-64 rounded-full border border-blue-500/30 transition-all duration-700 ${phase >= 2 ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`} />
                <div className={`absolute w-48 h-48 rounded-full border border-blue-500/50 transition-all duration-500 delay-100 ${phase >= 2 ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`} />
                <div className={`absolute w-32 h-32 rounded-full border border-blue-500/70 transition-all duration-300 delay-200 ${phase >= 2 ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`} />
            </div>

            {/* Logo */}
            <div className={`relative z-10 text-center transition-all duration-700 ${phase === 1 ? 'scale-75 opacity-0' : phase === 2 ? 'scale-100 opacity-100' : 'scale-110 opacity-0'}`}>
                <img 
                    src="https://customer-assets.emergentagent.com/job_37b7a798-83f6-40f1-8986-24840490698e/artifacts/kld5ow33_2.svg"
                    alt="CLT Academy"
                    className="h-24 w-auto mx-auto mb-6 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]"
                />
                <h1 className={`text-3xl font-bold text-white transition-all duration-500 delay-200 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    CLT Academy
                </h1>
                <p className={`text-slate-400 mt-2 transition-all duration-500 delay-300 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    Loading your workspace...
                </p>
                
                {/* Loading bar */}
                <div className={`mt-8 w-48 h-1 bg-slate-700 rounded-full overflow-hidden mx-auto transition-opacity duration-300 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                    <div className={`h-full bg-blue-500 rounded-full transition-all duration-1000 ${phase >= 2 ? 'w-full' : 'w-0'}`} />
                </div>
            </div>

            {/* Particle effects */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-blue-500 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${3 + Math.random() * 2}s`,
                            opacity: 0.3 + Math.random() * 0.3
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

export default LoginPage;
