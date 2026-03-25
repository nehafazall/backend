import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Trophy, Medal, Users, Award, 
    RefreshCw, Crown, Calendar, DollarSign 
} from 'lucide-react';

const fmtUSD = (v) => `$${(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
const fmtAED = (v) => `AED ${(v || 0).toLocaleString('en-AE', { minimumFractionDigits: 0 })}`;

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

    const topThree = leaderboard.slice(0, 3);

    const PodiumCard = ({ mentor, place, borderClass, iconClass, iconSize, mt, ringClass }) => {
        if (!mentor) return <div />;
        return (
            <Card className={`${borderClass} ${mt || ''}`} data-testid={`podium-${place}`}>
                <CardContent className="pt-6 text-center">
                    <div className={`mx-auto ${iconSize} rounded-full flex items-center justify-center mb-3 ${iconClass} ${ringClass || ''}`}>
                        {place === 1 ? <Crown className="h-10 w-10 text-amber-500" /> : <Medal className={`${place === 2 ? 'h-8 w-8 text-slate-400' : 'h-7 w-7 text-amber-700'}`} />}
                    </div>
                    <p className={`text-lg font-bold ${place === 1 ? 'text-amber-500' : place === 2 ? 'text-slate-400' : 'text-amber-700'}`}>
                        {place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'} Place
                    </p>
                    <p className={`${place === 1 ? 'text-2xl' : 'text-xl'} font-semibold mt-2`}>{mentor.mentor_name}</p>
                    {place === 1 && <Badge className="mt-2 bg-amber-500">Champion</Badge>}
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Effort (USD)</span>
                            <span className="font-bold font-mono text-emerald-500">{fmtUSD(mentor.total_effort_usd)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Effort (AED)</span>
                            <span className="font-mono">{fmtAED(mentor.total_effort_aed)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Deposits</span>
                            <span className="font-medium">{mentor.deposit_count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Students</span>
                            <span className="font-medium">{mentor.total_students}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Bonus Tier</span>
                            <span className="font-medium">{mentor.bonus_tier_label}</span>
                        </div>
                    </div>
                    {place === 1 && (
                        <p className="mt-4 text-2xl font-bold text-emerald-500 font-mono">
                            {fmtUSD(mentor.total_effort_usd)}
                        </p>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6" data-testid="mentor-leaderboard">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Trophy className="h-8 w-8 text-amber-500" />
                        Mentor Leaderboard
                    </h1>
                    <p className="text-muted-foreground">Top performing mentors ranked by total redeposit effort</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-40" data-testid="leaderboard-period-filter">
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
                    <Button variant="outline" size="sm" onClick={fetchLeaderboard} data-testid="leaderboard-refresh-btn">
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                </div>
            </div>

            {/* Top 3 Podium */}
            {topThree.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PodiumCard mentor={topThree[1]} place={2}
                        borderClass="border-2 border-slate-300 dark:border-slate-600"
                        iconClass="bg-slate-100 dark:bg-slate-800"
                        iconSize="w-16 h-16" mt="md:mt-8" />
                    <PodiumCard mentor={topThree[0]} place={1}
                        borderClass="border-2 border-amber-400 bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-900/20"
                        iconClass="bg-amber-100 dark:bg-amber-900/30"
                        iconSize="w-20 h-20" ringClass="ring-4 ring-amber-400" />
                    <PodiumCard mentor={topThree[2]} place={3}
                        borderClass="border-2 border-amber-700/50 dark:border-amber-800"
                        iconClass="bg-amber-100 dark:bg-amber-900/20"
                        iconSize="w-14 h-14" mt="md:mt-12" />
                </div>
            )}

            {/* Full Leaderboard Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-500" />
                        Full Rankings — {getPeriodLabel(period)}
                    </CardTitle>
                    <CardDescription>{totalMentors} mentors ranked by total redeposit effort</CardDescription>
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">Rank</TableHead>
                            <TableHead>Mentor</TableHead>
                            <TableHead className="text-center">Students</TableHead>
                            <TableHead className="text-center">Deposits</TableHead>
                            <TableHead className="text-right">Effort (USD)</TableHead>
                            <TableHead className="text-right">Effort (AED)</TableHead>
                            <TableHead className="text-center">Bonus Tier</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaderboard.map((mentor) => (
                            <TableRow key={mentor.mentor_id} className={mentor.rank <= 3 ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''} data-testid={`leaderboard-row-${mentor.rank}`}>
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
                                <TableCell className="text-center font-medium">{mentor.deposit_count}</TableCell>
                                <TableCell className="text-right font-mono font-bold text-emerald-500">
                                    {fmtUSD(mentor.total_effort_usd)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {fmtAED(mentor.total_effort_aed)}
                                </TableCell>
                                <TableCell className="text-center">
                                    {mentor.bonus_tier ? (
                                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                                            <Award className="h-3 w-3 mr-1" />{mentor.bonus_tier}%
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {leaderboard.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
