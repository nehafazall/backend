import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Trophy, Medal, Star, Users, TrendingUp, Award, 
    RefreshCw, Crown, Calendar 
} from 'lucide-react';
import { formatCurrency } from '@/components/finance/utils';

const MentorLeaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [period, setPeriod] = useState('monthly');
    const [loading, setLoading] = useState(true);
    const [totalMentors, setTotalMentors] = useState(0);

    useEffect(() => {
        fetchLeaderboard();
    }, [period]);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/mentor/leaderboard?period=${period}`);
            setLeaderboard(response.data.leaderboard || []);
            setTotalMentors(response.data.total_mentors || 0);
        } catch (error) {
            console.error('Error:', error);
            setLeaderboard([]);
        } finally {
            setLoading(false);
        }
    };

    const getRankBadge = (rank) => {
        if (rank === 1) return <div className="flex items-center gap-1 text-amber-500"><Crown className="h-5 w-5" /><span className="font-bold">1st</span></div>;
        if (rank === 2) return <div className="flex items-center gap-1 text-slate-400"><Medal className="h-5 w-5" /><span className="font-bold">2nd</span></div>;
        if (rank === 3) return <div className="flex items-center gap-1 text-amber-700"><Medal className="h-5 w-5" /><span className="font-bold">3rd</span></div>;
        return <span className="text-muted-foreground">#{rank}</span>;
    };

    const getPeriodLabel = (p) => {
        const labels = {
            monthly: 'This Month',
            quarterly: 'This Quarter',
            yearly: 'This Year',
            all_time: 'All Time'
        };
        return labels[p] || p;
    };

    // Top 3 mentors for podium display
    const topThree = leaderboard.slice(0, 3);
    const restOfList = leaderboard.slice(3);

    return (
        <div className="space-y-6" data-testid="mentor-leaderboard">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Trophy className="h-8 w-8 text-amber-500" />
                        Mentor Leaderboard
                    </h1>
                    <p className="text-muted-foreground">Top performing mentors based on upgrades, revenue, and satisfaction</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-40">
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="monthly">This Month</SelectItem>
                            <SelectItem value="quarterly">This Quarter</SelectItem>
                            <SelectItem value="yearly">This Year</SelectItem>
                            <SelectItem value="all_time">All Time</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={fetchLeaderboard}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                </div>
            </div>

            {/* Top 3 Podium */}
            {topThree.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 2nd Place */}
                    {topThree[1] ? (
                        <Card className="border-2 border-slate-300 dark:border-slate-600 md:mt-8">
                            <CardContent className="pt-6 text-center">
                                <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                                    <Medal className="h-8 w-8 text-slate-400" />
                                </div>
                                <p className="text-lg font-bold text-slate-400">2nd Place</p>
                                <p className="text-xl font-semibold mt-2">{topThree[1].mentor_name}</p>
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Students</span>
                                        <span className="font-medium">{topThree[1].total_students}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Upgrades</span>
                                        <span className="font-medium text-green-600">{topThree[1].upgrades}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Commission</span>
                                        <span className="font-medium">{formatCurrency(topThree[1].total_commission)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Rating</span>
                                        <span className="font-medium flex items-center gap-1">
                                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                            {topThree[1].avg_satisfaction || '-'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : <div />}

                    {/* 1st Place */}
                    {topThree[0] && (
                        <Card className="border-2 border-amber-400 bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-900/20">
                            <CardContent className="pt-6 text-center">
                                <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3 ring-4 ring-amber-400">
                                    <Crown className="h-10 w-10 text-amber-500" />
                                </div>
                                <p className="text-lg font-bold text-amber-500">1st Place</p>
                                <p className="text-2xl font-semibold mt-2">{topThree[0].mentor_name}</p>
                                <Badge className="mt-2 bg-amber-500">Champion</Badge>
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Students</span>
                                        <span className="font-medium">{topThree[0].total_students}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Upgrades</span>
                                        <span className="font-medium text-green-600">{topThree[0].upgrades}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Commission</span>
                                        <span className="font-medium">{formatCurrency(topThree[0].total_commission)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Rating</span>
                                        <span className="font-medium flex items-center gap-1">
                                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                            {topThree[0].avg_satisfaction || '-'}
                                        </span>
                                    </div>
                                </div>
                                <p className="mt-4 text-2xl font-bold text-amber-600">
                                    Score: {Math.round(topThree[0].score)}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* 3rd Place */}
                    {topThree[2] ? (
                        <Card className="border-2 border-amber-700/50 dark:border-amber-800 md:mt-12">
                            <CardContent className="pt-6 text-center">
                                <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-3">
                                    <Medal className="h-7 w-7 text-amber-700" />
                                </div>
                                <p className="text-lg font-bold text-amber-700">3rd Place</p>
                                <p className="text-xl font-semibold mt-2">{topThree[2].mentor_name}</p>
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Students</span>
                                        <span className="font-medium">{topThree[2].total_students}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Upgrades</span>
                                        <span className="font-medium text-green-600">{topThree[2].upgrades}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Commission</span>
                                        <span className="font-medium">{formatCurrency(topThree[2].total_commission)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Rating</span>
                                        <span className="font-medium flex items-center gap-1">
                                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                            {topThree[2].avg_satisfaction || '-'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : <div />}
                </div>
            )}

            {/* Full Leaderboard Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Full Rankings - {getPeriodLabel(period)}</CardTitle>
                    <CardDescription>{totalMentors} mentors ranked by performance score</CardDescription>
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">Rank</TableHead>
                            <TableHead>Mentor</TableHead>
                            <TableHead className="text-center">Students</TableHead>
                            <TableHead className="text-center">Active</TableHead>
                            <TableHead className="text-center">Upgrades</TableHead>
                            <TableHead className="text-right">Commission</TableHead>
                            <TableHead className="text-center">Rating</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaderboard.map((mentor) => (
                            <TableRow key={mentor.mentor_id} className={mentor.rank <= 3 ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}>
                                <TableCell>{getRankBadge(mentor.rank)}</TableCell>
                                <TableCell>
                                    <div>
                                        <p className="font-medium">{mentor.mentor_name}</p>
                                        <p className="text-xs text-muted-foreground">{mentor.email}</p>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        {mentor.total_students}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">{mentor.active_students}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={mentor.upgrades > 0 ? 'default' : 'secondary'}>
                                        {mentor.upgrades}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {formatCurrency(mentor.total_commission)}
                                </TableCell>
                                <TableCell className="text-center">
                                    {mentor.avg_satisfaction > 0 ? (
                                        <div className="flex items-center justify-center gap-1">
                                            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                            <span>{mentor.avg_satisfaction}</span>
                                            <span className="text-xs text-muted-foreground">({mentor.reviews_count})</span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-bold">{Math.round(mentor.score)}</TableCell>
                            </TableRow>
                        ))}
                        {leaderboard.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                    <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>No mentor data available for this period</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};

export default MentorLeaderboard;
