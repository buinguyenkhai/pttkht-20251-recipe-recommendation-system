// src/components/CustomMealPlanRecipeCard.jsx
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaFire, FaTrash } from 'react-icons/fa';
import defaultImage from '../assets/default.png';
import { AuthContext } from '../context/AuthContext';

const CustomMealPlanRecipeCard = ({ recipe, onRecipeRemoved }) => {
    const { token } = useContext(AuthContext);

    const handleRemove = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (window.confirm('Are you sure you want to remove this recipe from your plan?')) {
            try {
                const response = await fetch(`http://localhost:8000/custom-meal-plan/recipe/${recipe.recipe_id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                     const errorData = await response.json();
                     throw new Error(errorData.detail || 'Failed to remove recipe.');
                }
                alert('Recipe removed from your plan.');
                onRecipeRemoved(recipe.recipe_id);
            } catch (error) {
                alert(error.message);
            }
        }
    };

    return (
        <div className="relative bg-white rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-300 flex flex-col group">
            <button
                onClick={handleRemove}
                className="absolute top-2 right-2 z-20 p-2 bg-white rounded-full text-red-500 hover:bg-red-100 transition-colors"
                title="Remove from Plan"
            >
                <FaTrash />
            </button>
            <Link to={`/recipe/${recipe.recipe_id}`} className="block">
                <img
                    src={recipe.image_url || defaultImage}
                    alt={recipe.title}
                    className="w-full h-48 object-cover"
                />
            </Link>
            <div className="p-4 flex-grow">
                <Link to={`/recipe/${recipe.recipe_id}`} className="hover:text-orange-600">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">{recipe.title}</h3>
                </Link>
                <div className="flex items-center gap-2 text-red-600">
                    <FaFire />
                    <span className="font-semibold">{recipe.calories || 'N/A'} kcal</span>
                </div>
            </div>
        </div>
    );
};

export default CustomMealPlanRecipeCard;