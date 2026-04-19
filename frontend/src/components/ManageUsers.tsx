import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast, Card, CardHeader, CardTitle, CardContent } from './ui';

interface User {
  id: string;
  name: string;
  cookies: { j: string; s?: string };
  suspendedUntil?: number;
  droplets?: number;
}

export default function ManageUsers() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [users, setUsers] = useState<Record<string, User>>({});
  const [jCookie, setJCookie] = useState('');
  const [sCookie, setSCookie] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cookies: { j: string; s?: string } = { j: jCookie };
      if (sCookie) cookies.s = sCookie;
      
      await axios.post('/user', { cookies });
      setJCookie('');
      setSCookie('');
      fetchUsers();
      success('User Added', 'User has been added successfully');
    } catch (error) {
      console.error('Failed to add user:', error);
      showError('Add Failed', 'Failed to add user. Please check your cookies and try again.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await axios.delete(`/user/${userId}`);
      fetchUsers();
      success('User Deleted', 'User has been deleted successfully');
    } catch (error) {
      console.error('Failed to delete user:', error);
      showError('Delete Failed', 'Failed to delete user. Please try again.');
    }
  };

  return (
    <div id="manageUsers" className="space-y-6">
      <h2 className="text-3xl font-bold">Add/Manage Users</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Add New User</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="userForm" onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="jcookie" className="block text-sm font-medium mb-1">JWT Cookie (j)</label>
                <input
                  type="password"
                  id="jcookie"
                  value={jCookie}
                  onChange={(e) => setJCookie(e.target.value)}
                  required
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label htmlFor="scookie" className="block text-sm font-medium mb-1">Session Cookie (s) [optional]</label>
                <input
                  type="password"
                  id="scookie"
                  value={sCookie}
                  onChange={(e) => setSCookie(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" id="submitUser" className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
                Add User
              </button>
              <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80" onClick={() => navigate('/')}>
                Return
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <h2 className="text-2xl font-semibold">Existing Users</h2>
      <div id="userList" className="space-y-2">
        {Object.entries(users).map(([id, user]) => (
          <Card key={id} className="flex items-center justify-between p-4">
            <div className="flex flex-col gap-1">
              <span className="font-medium">{user.name}#{id}</span>
              {user.droplets !== undefined && (
                <span className="text-sm text-muted-foreground">Droplets: {user.droplets}</span>
              )}
              {user.suspendedUntil && user.suspendedUntil > Date.now() && (
                <span className="text-sm text-destructive">Suspended until {new Date(user.suspendedUntil).toLocaleString()}</span>
              )}
            </div>
            <button
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md hover:bg-destructive/90"
              onClick={() => handleDeleteUser(id)}
            >
              Delete
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
