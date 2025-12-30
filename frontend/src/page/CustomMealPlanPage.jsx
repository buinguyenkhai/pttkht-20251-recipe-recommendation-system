// src/page/CustomMealPlanPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import CustomMealPlanRecipeCard from '../components/CustomMealPlanRecipeCard';
import { FaPlus, FaTrash, FaExclamationTriangle, FaCheckCircle, FaBalanceScale, FaSave } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';

const initialPersonState = () => ({
    id: uuidv4(),
    gender: 'Male',
    weight: 70,
    frequency_of_exercise: 'Moderate'
});

const CustomMealPlanPage = () => {
    const { token } = useContext(AuthContext);
    const [people, setPeople] = useState([initialPersonState()]);
    const [planRecipes, setPlanRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [caloriesNeeded, setCaloriesNeeded] = useState(0);

    const fetchCustomPlan = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/custom-meal-plan/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch custom meal plan.');
            const data = await response.json();
            setPlanRecipes(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchCustomPlan();
        }
    }, [token]);

    const handlePersonChange = (id, field, value) => {
        setPeople(people.map(p => p.id === id ? { ...p, [field]: value } : p));
    };


    const addPerson = () => {
        setPeople([...people, initialPersonState()]);
    };

    const removePerson = (id) => {
        setPeople(people.filter(p => p.id !== id));
    };

    const handleCalculateCalories = async () => {
        let totalCalories = 0;
        setError('');
        try {
            for (const person of people) {
                const response = await fetch('http://localhost:8000/custom-meal-plan/calculate-and-get-plan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        gender: person.gender,
                        weight: person.weight,
                        frequency_of_exercise: person.frequency_of_exercise
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail[0]?.msg || errorData.detail || 'Failed to calculate calories for one or more people.');
                }
                const data = await response.json();
                totalCalories += data.calories_needed;
            }
            setCaloriesNeeded(totalCalories);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleRecipeRemoved = (recipeId) => {
        setPlanRecipes(prevRecipes => prevRecipes.filter(r => r.recipe_id !== recipeId));
    };

    const totalPlanNutrition = useMemo(() => {
        return planRecipes.reduce((acc, recipe) => {
          acc.calories += recipe.calories || 0;
          acc.protein += recipe.protein || 0;
          acc.fat += recipe.fat || 0;
          acc.carbs += recipe.carbs || 0;
          return acc;
        }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
    }, [planRecipes]);

    const calorieComparison = useMemo(() => {
        if (caloriesNeeded === 0) return null;
        const difference = totalPlanNutrition.calories - caloriesNeeded;
        const percentageDiff = Math.abs(difference / caloriesNeeded);
        if (percentageDiff <= 0.1) {
            return {
                message: "Excellent! This meal plan's calories are well-matched to your needs.",
                Icon: FaCheckCircle,
                color: 'text-green-600',
                bg: 'bg-green-50'
            };
        } else if (difference > 0) {
            return {
                message: `Warning: This meal plan is about ${Math.round(difference)} calories over your estimated daily needs.`,
                Icon: FaExclamationTriangle,
                color: 'text-yellow-600',
                bg: 'bg-yellow-50'
            };
        } else {
            return {
                message: `Warning: This meal plan is about ${Math.round(Math.abs(difference))} calories below your estimated daily needs.`,
                Icon: FaExclamationTriangle,
                color: 'text-red-600',
                bg: 'bg-red-50'
            };
        }
    }, [caloriesNeeded, totalPlanNutrition]);

    const handleSavePlan = async () => {
        if (!planRecipes || planRecipes.length === 0) {
            alert("Your plan is empty. Add some recipes before saving.");
            return;
        }
        const planName = prompt("Please enter a name for your custom plan:", "My Custom Plan");
        if (planName) {
            const payload = {
                name: planName,
                recipe_ids: planRecipes.map(r => r.recipe_id),
                nutrition: {
                    total_calories: totalPlanNutrition.calories,
                    total_protein: totalPlanNutrition.protein,
                    total_fat: totalPlanNutrition.fat,
                    total_carbs: totalPlanNutrition.carbs,
                }
            };
            try {
                const response = await fetch('http://localhost:8000/saved-meal-plans/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error('Failed to save the meal plan.');
                alert('Custom meal plan saved successfully!');
            } catch (err) {
                alert(err.message);
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-orange-600 mb-6 text-center">My Custom Meal Plan</h1>
            
            {(caloriesNeeded > 0 || totalPlanNutrition.calories > 0) && (
                <div className="p-6 bg-white rounded-lg shadow-md mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-2xl font-semibold text-gray-800">Summary</h2>
                        <button
                            onClick={handleSavePlan}
                            disabled={planRecipes.length === 0}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
                        >
                            <FaSave /> Save This Plan
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600">Total Daily Calories Needed:</span>
                            <span className="font-bold text-lg text-orange-600">{Math.round(caloriesNeeded)} kcal</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600">Total Plan Calories:</span>
                            <span className="font-bold text-lg text-blue-600">{Math.round(totalPlanNutrition.calories)} kcal</span>
                        </div>
                        {calorieComparison && (
                            <div className={`md:col-span-2 mt-4 p-3 rounded-md flex items-start gap-3 ${calorieComparison.bg} border-l-4 ${calorieComparison.color.replace('text', 'border')}`}>
                                <calorieComparison.Icon className={`mt-1 h-5 w-5 flex-shrink-0 ${calorieComparison.color}`} />
                                <p className={`text-sm ${calorieComparison.color}`}>{calorieComparison.message}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Calculate Your Needs</h2>
                        {people.map((person, index) => (
                            <div key={person.id} className="relative p-4 border rounded-md mb-4 bg-gray-50">
                                <h3 className="font-semibold text-gray-700 mb-2">Person {index + 1}</h3>
                                {people.length > 1 && (
                                    <button onClick={() => removePerson(person.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                                        <FaTrash />
                                    </button>
                                )}
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600">Gender</label>
                                        <select value={person.gender} onChange={(e) => handlePersonChange(person.id, 'gender', e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500">
                                            <option>Male</option>
                                            <option>Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600">Weight (kg)</label>
                                        <input type="number" value={person.weight} onChange={(e) => handlePersonChange(person.id, 'weight', parseFloat(e.target.value) || 0)} className="w-full mt-1 p-2 border border-gray-300 rounded-md shadow-sm"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600">Exercise Frequency</label>
                                        <select value={person.frequency_of_exercise} onChange={(e) => handlePersonChange(person.id, 'frequency_of_exercise', e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-md shadow-sm">
                                            <option>Sedentary</option>
                                            <option>Low</option>
                                            <option>Moderate</option>
                                            <option>Heavy</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                         <div className="flex justify-between items-center mt-4">
                            <button onClick={addPerson} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-green-500 rounded-md hover:bg-green-600">
                                <FaPlus /> Add Person
                            </button>
                            <button onClick={handleCalculateCalories} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-orange-500 rounded-md hover:bg-orange-600">
                                <FaBalanceScale /> Calculate
                            </button>
                         </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="p-6 bg-white rounded-lg shadow-md min-h-full">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Recipes</h2>
                        {loading && <p>Loading recipes...</p>}
                        {error && !loading && <p className="text-red-500">{error}</p>}
                        {!loading && planRecipes.length === 0 && (
                            <div className="text-center py-10 text-gray-500">
                                <h3 className="text-xl">Your meal plan is empty.</h3>
                                <p>Go to a recipe card or page and click the "Add to Custom Plan" button.</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {planRecipes.map(recipe => (
                                <CustomMealPlanRecipeCard key={recipe.recipe_id} recipe={recipe} onRecipeRemoved={handleRecipeRemoved} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomMealPlanPage;