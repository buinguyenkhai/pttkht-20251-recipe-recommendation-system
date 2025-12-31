// src/page/admin/AnalyticsCharts.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AnalyticsCharts = ({ selectedYear }) => {
    const { token } = useContext(AuthContext);
    const [unfilteredData, setUnfilteredData] = useState(null);
    const [chartData, setChartData] = useState({
        recipes: null,
        users: null,
        reviews: null,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAllChartData = async () => {
            const fetchData = async (endpoint) => {
                const response = await fetch(`http://localhost:8000/admin/charts/${endpoint}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error(`Failed to fetch ${endpoint} data`);
                return await response.json();
            };

            try {
                setLoading(true);
                const [recipesData, usersData, reviewsData] = await Promise.all([
                    fetchData('recipes-by-date'),
                    fetchData('users-by-date'),
                    fetchData('reviews-by-date'),
                ]);
                setUnfilteredData({ recipes: recipesData, users: usersData, reviews: reviewsData });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        if (token) {
            fetchAllChartData();
        }
    }, [token]);

    // **MODIFIED FUNCTION**: This function now aggregates daily data into monthly totals.
    const processDataByMonth = (data, label, year) => {
        const monthlyData = Object.entries(data).reduce((acc, [date, count]) => {
            const entryDate = new Date(date);
            if (entryDate.getFullYear() === year) {
                const monthKey = date.substring(0, 7); // Extracts "YYYY-MM"
                acc[monthKey] = (acc[monthKey] || 0) + count;
            }
            return acc;
        }, {});

        const allMonthLabels = Array.from({ length: 12 }, (_, i) => {
            const month = (i + 1).toString().padStart(2, '0');
            return `${year}-${month}`;
        });
        
        return {
            labels: allMonthLabels,
            datasets: [{
                label: label,
                data: allMonthLabels.map(monthLabel => monthlyData[monthLabel] || 0),
                backgroundColor: 'rgba(249, 115, 22, 0.6)',
                borderColor: 'rgba(249, 115, 22, 1)',
                borderWidth: 1,
            }]
        };
    };

    useEffect(() => {
        if (unfilteredData) {
            setChartData({
                recipes: processDataByMonth(unfilteredData.recipes, 'New Recipes', selectedYear),
                users: processDataByMonth(unfilteredData.users, 'New Users', selectedYear),
                reviews: processDataByMonth(unfilteredData.reviews, 'New Reviews', selectedYear),
            });
        }
    }, [unfilteredData, selectedYear]);


    const chartOptions = (title) => ({
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: title, font: { size: 16 } }
        },
        scales: {
            y: {
                ticks: {
                    stepSize: 1,
                    beginAtZero: true
                }
            }
        }
    });

    if (loading) return <p>Loading charts...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-4 rounded-lg shadow">
                {chartData.recipes && <Bar options={chartOptions('Recipes Created Per Month')} data={chartData.recipes} />}
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
                {chartData.users && <Bar options={chartOptions('Users Joined Per Month')} data={chartData.users} />}
            </div>
            <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
                {chartData.reviews && <Bar options={chartOptions('Reviews Submitted Per Month')} data={chartData.reviews} />}
            </div>
        </div>
    );
};

export default AnalyticsCharts;