// src/components/AdminRoute.jsx
import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminRoute = () => {
    const { user, token } = useContext(AuthContext);

    if (token && !user) {
        return <div className="text-center py-10">Loading user data...</div>;
    }

    if (user && user.is_admin) {
        return <Outlet />;
    }
    if (user && !user.is_admin) {
        return <Navigate to="/" />;
    }
    
    return <Navigate to="/login" />;
};

export default AdminRoute;