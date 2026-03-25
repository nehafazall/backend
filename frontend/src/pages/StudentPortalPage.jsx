import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StudentPortalPage() {
    return (
        <div className="space-y-3 h-[calc(100vh-120px)]" data-testid="student-portal-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Student Portal</h1>
                    <p className="text-muted-foreground text-sm">CLT Academy Student Management &amp; Attendance</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <a href="https://main.clt-academy.com/admin/students" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" /> Open in New Tab
                    </a>
                </Button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden h-[calc(100%-60px)]">
                <iframe
                    src="https://main.clt-academy.com/admin/students"
                    className="w-full h-full"
                    title="CLT Academy Student Portal"
                    allow="storage-access"
                    data-testid="student-portal-iframe"
                />
            </div>
        </div>
    );
}
