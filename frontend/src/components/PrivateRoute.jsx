// /src/components/PrivateRoute.jsx

import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = () => {
    const { user, token } = useContext(AuthContext);
    if (token && !user) {
        return <div>Loading...</div>;
    }

    return user ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;