// src/components/MealPlanRecipeCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaFire, FaDotCircle } from 'react-icons/fa';
import defaultImage from '../assets/default.png';

const NutritionStat = ({ icon, value, unit, label, colorClass }) => (
    <div className={`flex items-center gap-2 ${colorClass}`}>
        {icon}
        <div>
            <span className="font-bold">{value || 'N/A'}</span>
            <span className="text-xs ml-1">{unit}</span>
            <p className="text-xs -mt-1">{label}</p>
        </div>
    </div>
);

const MealPlanRecipeCard = ({ recipe }) => {
    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 flex flex-col">
            <Link to={`/recipe/${recipe.recipe_id}`} className="block">
                <img
                    src={recipe.image_url || defaultImage}
                    alt={recipe.title}
                    className="w-full h-48 object-cover"
                />
            </Link>
            <div className="p-4 flex-grow flex flex-col">
                <Link to={`/recipe/${recipe.recipe_id}`} className="hover:text-orange-600">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">{recipe.title}</h3>
                </Link>

                <div className="mt-auto pt-4 border-t border-gray-200">
                     <h4 className="text-sm font-semibold text-gray-600 mb-2">Nutritional Info (est.)</h4>
                     <div className="grid grid-cols-2 gap-3 text-sm">
                        <NutritionStat icon={<FaFire className="text-red-500" />} value={recipe.calories} unit="kcal" label="Calories" colorClass="text-red-700" />
                        <NutritionStat icon={<FaDotCircle size="0.8em" className="text-blue-500" />} value={recipe.protein} unit="g" label="Protein" colorClass="text-blue-700" />
                        <NutritionStat icon={<FaDotCircle size="0.8em" className="text-yellow-500" />} value={recipe.fat} unit="g" label="Fat" colorClass="text-yellow-700" />
                        <NutritionStat icon={<FaDotCircle size="0.8em" className="text-green-500" />} value={recipe.carbs} unit="g" label="Carbs" colorClass="text-green-700" />
                     </div>
                </div>
            </div>
        </div>
    );
};

export default MealPlanRecipeCard;