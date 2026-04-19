import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from './ui';

export default function MainView() {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Manage Users',
      description: 'Add, remove, and manage user accounts',
      icon: '/icons/manageUsers.svg',
      path: '/users',
      color: 'border-blue-500',
    },
    {
      title: 'Manage Templates',
      description: 'View and manage existing templates',
      icon: '/icons/manageTemplates.svg',
      path: '/templates',
      color: 'border-purple-500',
    },
    {
      title: 'View Logs',
      description: 'Monitor system logs and errors',
      icon: '/icons/code.svg',
      path: '/logs',
      color: 'border-orange-500',
    },
    {
      title: 'Settings',
      description: 'Configure application settings',
      icon: '/icons/settings.svg',
      path: '/settings',
      color: 'border-gray-500',
    },
  ];

  return (
    <>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mb-6">
        Welcome to wplacer. Select an action below to get started.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {quickActions.map((action) => (
          <Card
            key={action.path}
            className="cursor-pointer transition-all hover:shadow-md hover:scale-105"
            onClick={() => navigate(action.path)}
          >
            <CardHeader>
              <div className={`border-l-4 ${action.color} pl-3`}>
                <div className="flex items-center gap-3 mb-2">
                  <img 
                    src={action.icon} 
                    alt="" 
                    className="w-8 h-8"
                  />
                  <CardTitle>{action.title}</CardTitle>
                </div>
              </div>
              <CardDescription className="pl-3">{action.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </>
  );
}
