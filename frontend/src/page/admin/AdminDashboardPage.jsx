// src/page/admin/AdminDashboardPage.jsx
import React, { useState } from 'react';
import UserManagement from './UserManagement';
import AnalyticsCharts from './AnalyticsCharts';

const AdminDashboardPage = () => {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 border-b pb-3">
                <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                <div className="flex items-center gap-2 mt-3 sm:mt-0">
                    <label htmlFor="year-slicer" className="font-medium text-gray-700">Year:</label>
                    <select
                        id="year-slicer"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* User Management Section */}
            <div className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">User Management ({selectedYear})</h2>
                <UserManagement selectedYear={selectedYear} />
            </div>

            {/* Analytics Section */}
            <div>
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Site Analytics ({selectedYear})</h2>
                <AnalyticsCharts selectedYear={selectedYear} />
            </div>
        </div>
    );
};

export default AdminDashboardPage;