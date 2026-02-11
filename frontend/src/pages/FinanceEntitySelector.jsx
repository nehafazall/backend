import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Construction } from 'lucide-react';

const FinanceEntitySelector = () => {
    const navigate = useNavigate();

    const entities = [
        {
            id: 'clt',
            name: 'CLT Academy',
            description: 'Main business entity',
            icon: Building2,
            status: 'active',
            route: '/finance/clt/dashboard'
        },
        {
            id: 'miles',
            name: 'MILES',
            description: 'Secondary entity',
            icon: Building2,
            status: 'development',
            route: null
        }
    ];

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center" data-testid="finance-entity-selector">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight mb-3">Finance & Accounting</h1>
                <p className="text-lg text-muted-foreground">Select an entity to manage</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl">
                {entities.map((entity) => {
                    const Icon = entity.icon;
                    const isActive = entity.status === 'active';

                    return (
                        <Card
                            key={entity.id}
                            className={`relative cursor-pointer transition-all duration-300 hover:shadow-xl ${
                                isActive 
                                    ? 'hover:scale-105 hover:border-primary' 
                                    : 'opacity-70 cursor-not-allowed'
                            }`}
                            onClick={() => isActive && navigate(entity.route)}
                            data-testid={`entity-${entity.id}`}
                        >
                            {!isActive && (
                                <div className="absolute top-3 right-3">
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                        <Construction className="h-3 w-3 mr-1" />
                                        Under Development
                                    </Badge>
                                </div>
                            )}
                            <CardContent className="p-8 flex flex-col items-center text-center">
                                <div className={`p-6 rounded-2xl mb-4 ${
                                    isActive 
                                        ? 'bg-primary/10 text-primary' 
                                        : 'bg-muted text-muted-foreground'
                                }`}>
                                    <Icon className="h-16 w-16" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">{entity.name}</h2>
                                <p className="text-muted-foreground">{entity.description}</p>
                                {isActive && (
                                    <Badge className="mt-4 bg-green-500">Active</Badge>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default FinanceEntitySelector;
