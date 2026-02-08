import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import CLTLogo from '@/components/CLTLogo';
import CLTAnimation from '@/components/CLTAnimation';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
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
            // PublicRoute will automatically redirect to /welcome after login
        } catch (error) {
            const message = error.response?.data?.detail || 'Login failed. Please check your credentials.';
            toast.error(message);
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex bg-slate-900 relative overflow-hidden">
            {/* Trading Chart Background */}
            <div className="absolute inset-0">
                <TradingChartSVG />
            </div>

            {/* Left Side - Logo */}
            <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative z-10">
                <div className="text-center">
                    <CLTLogo className="h-40 w-auto mx-auto mb-8" isDark={true} />
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
                        <CLTLogo className="h-20 w-auto mx-auto mb-4" isDark={true} />
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
        <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
            <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
            </defs>
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
            <path d="M50,350 L100,320 L150,280 L200,300 L250,250 L300,220 L350,260 L400,200 L450,180 L500,220 L550,150 L600,180 L650,140 L700,160 L750,120 L800,150 L850,100 L900,130 L950,80" fill="none" stroke="#3b82f6" strokeWidth="2" />
            <path d="M50,350 L100,320 L150,280 L200,300 L250,250 L300,220 L350,260 L400,200 L450,180 L500,220 L550,150 L600,180 L650,140 L700,160 L750,120 L800,150 L850,100 L900,130 L950,80 L950,600 L50,600 Z" fill="url(#chartGradient)" />
            <path d="M50,400 L100,380 L150,420 L200,390 L250,350 L300,380 L350,320 L400,350 L450,280 L500,310 L550,260 L600,290 L650,240 L700,270 L750,220 L800,250 L850,200 L900,230 L950,180" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />
        </svg>
    );
}

export default LoginPage;
