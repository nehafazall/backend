import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useTheme } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email || !password) {
            toast.error('Please enter email and password');
            return;
        }
        
        setLoading(true);
        
        try {
            await login(email, password);
            toast.success('Welcome to CLT Academy ERP');
            navigate('/dashboard');
        } catch (error) {
            const message = error.response?.data?.detail || 'Login failed. Please check your credentials.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
            {/* Background */}
            <div 
                className="absolute inset-0 bg-cover bg-center opacity-20"
                style={{ 
                    backgroundImage: `url('https://images.unsplash.com/photo-1639825752750-5061ded5503b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwyfHx0cmFkaW5nJTIwY2hhcnQlMjBkYXRhJTIwdmlzdWFsaXphdGlvbiUyMGFic3RyYWN0JTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3NzAyNTkxOTh8MA&ixlib=rb-4.1.0&q=85')`
                }}
            />
            
            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
            
            {/* Theme Toggle */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                onClick={toggleTheme}
                data-testid="theme-toggle"
            >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            {/* Login Card */}
            <Card className="w-full max-w-md mx-4 bg-slate-800/80 backdrop-blur-xl border-slate-700 shadow-2xl relative z-10">
                <CardHeader className="text-center space-y-4">
                    {/* Logo */}
                    <div className="flex justify-center">
                        <img 
                            src="https://customer-assets.emergentagent.com/job_37b7a798-83f6-40f1-8986-24840490698e/artifacts/kld5ow33_2.svg"
                            alt="CLT Academy"
                            className="h-16 w-auto"
                            data-testid="login-logo"
                        />
                    </div>
                    <div>
                        <CardTitle className="text-2xl text-white font-bold tracking-tight">
                            Welcome Back
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Sign in to CLT Academy ERP
                        </CardDescription>
                    </div>
                </CardHeader>
                
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
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
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 pr-10"
                                    data-testid="login-password"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                    data-testid="toggle-password"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        
                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            disabled={loading}
                            data-testid="login-submit"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                    Signing in...
                                </div>
                            ) : (
                                'Sign In'
                            )}
                        </Button>
                    </form>
                    
                    {/* Demo Credentials */}
                    <div className="mt-6 p-4 rounded-lg bg-slate-700/30 border border-slate-600">
                        <p className="text-xs text-slate-400 mb-2">Demo Credentials:</p>
                        <p className="text-sm text-slate-300 font-mono">aqib@clt-academy.com</p>
                        <p className="text-sm text-slate-300 font-mono">A@qib1234</p>
                    </div>
                </CardContent>
            </Card>
            
            {/* Footer */}
            <p className="absolute bottom-4 text-slate-500 text-sm">
                © 2024 CLT Academy. All rights reserved.
            </p>
        </div>
    );
};

export default LoginPage;
