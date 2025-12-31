// src/page/admin/UserManagement.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { FaSort, FaSortUp, FaSortDown, FaTrash } from 'react-icons/fa';

const UserManagement = ({ selectedYear }) => {
    const { token, user: currentUser } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'created_recipes', direction: 'desc' });

    useEffect(() => {
        const fetchUsers = async () => {
            if (!selectedYear) return;

            setLoading(true);
            const url = new URL('http://localhost:8000/admin/dashboard/users');

            if (sortConfig.key) {
                url.searchParams.append('sort_by', sortConfig.key);
            }

            url.searchParams.append('start_date', `${selectedYear}-01-01T00:00:00`);
            url.searchParams.append('end_date', `${selectedYear}-12-31T23:59:59`);

            try {
                const response = await fetch(url.toString(), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Failed to fetch users.');
                
                let data = await response.json();

                if (sortConfig.direction === 'asc') {
                    data.reverse();
                }

                setUsers(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchUsers();
        }
    }, [token, sortConfig, selectedYear]);

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? Their recipes and reviews will be attributed to "Deleted user".')) {
            return;
        }
        try {
            const response = await fetch(`http://localhost:8000/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setUsers(users.filter(u => u.id !== userId));
                alert('User deleted successfully.');
            } else {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to delete user.');
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const requestSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (name) => {
        if (sortConfig.key !== name) return <FaSort className="text-gray-400" />;
        if (sortConfig.direction === 'desc') return <FaSortDown />;
        return <FaSortUp />;
    };

    if (loading) return <p>Loading users...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;

    return (
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto bg-white rounded-lg shadow relative">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                        <th onClick={() => requestSort('created_recipes')} className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <span className="flex items-center gap-2">Recipes Created {getSortIcon('created_recipes')}</span>
                        </th>
                        <th onClick={() => requestSort('reviews_count')} className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <span className="flex items-center gap-2">Reviews Made {getSortIcon('reviews_count')}</span>
                        </th>
                        <th onClick={() => requestSort('average_rating')} className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <span className="flex items-center gap-2">Avg. Rating Given {getSortIcon('average_rating')}</span>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.created_recipes_count}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.reviews_count}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.average_rating ? user.average_rating.toFixed(2) : 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {currentUser && currentUser.id !== user.id && (
                                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900" title="Delete User">
                                        <FaTrash />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UserManagement;