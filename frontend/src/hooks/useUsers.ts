import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { User } from '../types';

type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

export function useUsers() {
  const [users, setUsers] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<{ action: string; status: OperationStatus; message?: string }>({ action: '', status: 'idle' });

  // Form state for adding users
  const [jCookie, setJCookie] = useState('');
  const [sCookie, setSCookie] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get<Record<string, User>>('/users');
      setUsers(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addUser = useCallback(async () => {
    if (!jCookie.trim()) return false;

    setOperationStatus({ action: 'add', status: 'loading' });
    try {
      const cookies: { j: string; s?: string } = { j: jCookie };
      if (sCookie.trim()) cookies.s = sCookie;

      await axios.post('/user', { cookies });
      setJCookie('');
      setSCookie('');
      await fetchUsers();
      setOperationStatus({ action: 'add', status: 'success', message: 'User added successfully' });
      setTimeout(() => setOperationStatus({ action: '', status: 'idle' }), 3000);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add user';
      setOperationStatus({ action: 'add', status: 'error', message });
      return false;
    }
  }, [jCookie, sCookie, fetchUsers]);

  const deleteUser = useCallback(async (userId: string) => {
    setOperationStatus({ action: 'delete', status: 'loading' });
    try {
      await axios.delete(`/user/${userId}`);
      await fetchUsers();
      setOperationStatus({ action: 'delete', status: 'success', message: 'User deleted successfully' });
      setTimeout(() => setOperationStatus({ action: '', status: 'idle' }), 3000);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      setOperationStatus({ action: 'delete', status: 'error', message });
      return false;
    }
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    isLoading,
    error,
    operationStatus,
    jCookie,
    sCookie,
    setJCookie,
    setSCookie,
    fetchUsers,
    addUser,
    deleteUser,
  };
}
