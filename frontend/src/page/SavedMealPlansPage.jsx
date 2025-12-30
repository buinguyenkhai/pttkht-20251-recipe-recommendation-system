// src/page/SavedMealPlansPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FaTrash, FaFire, FaListAlt, FaPencilAlt, FaCheck, FaTimes } from 'react-icons/fa';
import MealPlanRecipeCard from '../components/MealPlanRecipeCard';

const TotalStat = ({ icon, value, unit, label }) => (
    <div className="flex items-center gap-3">
        <div className="text-3xl text-orange-500">{icon}</div>
        <div>
            <p className="text-xl font-bold text-gray-800">{Math.round(value)} <span className="text-base font-normal">{unit}</span></p>
            <p className="text-sm text-gray-500 -mt-1">{label}</p>
        </div>
    </div>
);

const SavedMealPlansPage = () => {
    const { token } = useContext(AuthContext);
    const [savedPlans, setSavedPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [detailLoading, setDetailLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingName, setEditingName] = useState('');

    const fetchSavedPlans = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:8000/saved-meal-plans/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch saved plans.');
            const data = await response.json();
            setSavedPlans(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchSavedPlans();
        }
    }, [token]);

    const handleSelectPlan = async (planId) => {
        if (selectedPlan?.id === planId) return;
        setIsEditing(false);
        setDetailLoading(true);
        setSelectedPlan(null);
        try {
            const response = await fetch(`http://localhost:8000/saved-meal-plans/${planId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to load plan details.');
            const data = await response.json();
            setSelectedPlan(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleDeletePlan = async (planId) => {
        if (window.confirm('Are you sure you want to permanently delete this meal plan?')) {
            try {
                const response = await fetch(`http://localhost:8000/saved-meal-plans/${planId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to delete plan.');
                
                alert('Plan deleted successfully.');
                setSelectedPlan(null);
                fetchSavedPlans();
            } catch (err) {
                alert(err.message);
            }
        }
    };

    const handleSaveName = async (planId) => {
        if (editingName.trim().length < 3) {
            alert('Plan name must be at least 3 characters long.');
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/saved-meal-plans/${planId}/name`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: editingName })
            });

            if (!response.ok) throw new Error('Failed to update plan name.');
            const updatedPlanInfo = await response.json();
            setSelectedPlan(prev => ({ ...prev, name: updatedPlanInfo.name }));
            setSavedPlans(prev => prev.map(p => p.id === planId ? { ...p, name: updatedPlanInfo.name } : p));
            setIsEditing(false);

        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-orange-600 mb-6 text-center">My Saved Meal Plans</h1>
            {loading && <p>Loading your saved plans...</p>}
            {error && <p className="text-red-500 text-center">{error}</p>}
            
            {!loading && savedPlans.length === 0 && (
                 <div className="text-center py-16 text-gray-500 bg-white rounded-lg shadow-md">
                    <FaListAlt className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold">You have no saved meal plans.</h3>
                    <p>Go to a meal plan generator and save a plan to see it here.</p>
                </div>
            )}

            {!loading && savedPlans.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-1">
                         <div className="p-4 bg-white rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold text-gray-700 mb-3">Your Plans</h2>
                            <ul className="space-y-2">
                                {savedPlans.map(plan => (
                                    <li key={plan.id}>
                                        <button
                                            onClick={() => handleSelectPlan(plan.id)}
                                            className={`w-full text-left px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                                                selectedPlan?.id === plan.id 
                                                ? 'bg-orange-500 text-white' 
                                                : 'bg-gray-100 hover:bg-orange-100'
                                            }`}
                                        >
                                            {plan.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="lg:col-span-3">
                        <div className="p-6 bg-white rounded-lg shadow-md min-h-[60vh]">
                            {detailLoading && <p>Loading plan details...</p>}
                            {!detailLoading && !selectedPlan && (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <p>Select a plan from the list to see its details.</p>
                                </div>
                            )}
                            {selectedPlan && (
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex-grow">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        className="text-2xl font-bold text-gray-800 border-b-2 border-orange-500 focus:outline-none bg-transparent"
                                                    />
                                                    <button onClick={() => handleSaveName(selectedPlan.id)} className="p-1 text-green-600 hover:bg-green-100 rounded-full"><FaCheck /></button>
                                                    <button onClick={() => setIsEditing(false)} className="p-1 text-red-600 hover:bg-red-100 rounded-full"><FaTimes /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <h2 className="text-2xl font-bold text-gray-800">{selectedPlan.name}</h2>
                                                    <button onClick={() => { setIsEditing(true); setEditingName(selectedPlan.name); }} className="p-1 text-gray-500 hover:text-orange-600 hover:bg-gray-100 rounded-full">
                                                        <FaPencilAlt />
                                                    </button>
                                                </div>
                                            )}
                                            <p className="text-sm text-gray-500">Saved on: {new Date(selectedPlan.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleDeletePlan(selectedPlan.id)}
                                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 bg-red-100 rounded-md hover:bg-red-200 ml-4"
                                        >
                                            <FaTrash /> Delete
                                        </button>
                                    </div>
                                    
                                    <div className="mb-8 p-4 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Total Meal Nutrition (Estimated)</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <TotalStat icon={<FaFire/>} value={selectedPlan.total_calories} unit="kcal" label="Calories" />
                                            <TotalStat icon="P" value={selectedPlan.total_protein} unit="g" label="Protein" />
                                            <TotalStat icon="F" value={selectedPlan.total_fat} unit="g" label="Fat" />
                                            <TotalStat icon="C" value={selectedPlan.total_carbs} unit="g" label="Carbs" />
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Recipes in this Plan</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {selectedPlan.recipes.map(recipe => (
                                            <MealPlanRecipeCard key={recipe.recipe_id} recipe={recipe} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SavedMealPlansPage;