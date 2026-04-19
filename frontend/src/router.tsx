import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import { Sidebar } from './components/Sidebar';
import MainView from './components/MainView';
import LogsViewer from './components/LogsViewer';
import ManageUsers from './components/ManageUsers';
import AddTemplate from './components/AddTemplate';
import ManageTemplates from './components/ManageTemplates';
import Settings from './components/Settings';

function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <App />
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <MainView />,
      },
      {
        path: 'logs',
        element: <LogsViewer />,
      },
      {
        path: 'users',
        element: <ManageUsers />,
      },
      {
        path: 'templates',
        children: [
          {
            index: true,
            element: <ManageTemplates />,
          },
          {
            path: 'add',
            element: <AddTemplate />,
          },
        ],
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export const navItems = [
  { path: '/', label: 'Dashboard', icon: '/icons/icon.png' },
  { path: '/users', label: 'Users', icon: '/icons/manageUsers.svg' },
  { path: '/templates', label: 'Templates', icon: '/icons/manageTemplates.svg' },
  { path: '/logs', label: 'Logs', icon: '/icons/code.svg' },
  { path: '/settings', label: 'Settings', icon: '/icons/settings.svg' },
];
