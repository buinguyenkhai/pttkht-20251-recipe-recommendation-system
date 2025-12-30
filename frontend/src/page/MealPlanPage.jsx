// src/page/MealPlanPage.jsx
import React, { useContext } from 'react';
import MealPlanRecipeCard from '../components/MealPlanRecipeCard';
import { FaFire, FaSave } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { MealPlanContext } from '../context/MealPlanContext';

const TotalStat = ({ icon, value, unit, label }) => (
    <div className="flex items-center gap-3">
        <div className="text-3xl text-orange-500">{icon}</div>
        <div>
            <p className="text-xl font-bold text-gray-800">{value} <span className="text-base font-normal">{unit}</span></p>
            <p className="text-sm text-gray-500 -mt-1">{label}</p>
        </div>
    </div>
);


const MealPlanPage = () => {
  const { 
    numPeople, 
    setNumPeople, 
    meal, 
    totalNutrition, 
    loading, 
    error, 
    generateMeal 
  } = useContext(MealPlanContext);

  const { token } = useContext(AuthContext);

  const handleGenerateMeal = () => {
    generateMeal(numPeople);
  };

  const handleSaveMeal = async () => {
      if (!meal || meal.length === 0) {
          alert("You must generate a meal before saving.");
          return;
      }

      const planName = prompt("Please enter a name for this meal plan:", `Chef's Plan for ${numPeople} people`);
      
      if (planName) {
          const payload = {
              name: planName,
              recipe_ids: meal.map(r => r.recipe_id),
              nutrition: {
                  total_calories: totalNutrition.calories,
                  total_protein: totalNutrition.protein,
                  total_fat: totalNutrition.fat,
                  total_carbs: totalNutrition.carbs,
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

              if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.detail || 'Failed to save the meal plan.');
              }

              alert('Meal plan saved successfully!');

          } catch (err) {
              alert(err.message);
          }
      }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-orange-600">Chef's Meal Plan Generator</h1>
        <p className="text-lg text-gray-600 mt-2">Let our professional chefs curate a perfect meal for you.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 bg-white shadow-md rounded-lg mb-8">
        <label htmlFor="numPeople" className="font-semibold text-gray-700">Select number of people:</label>
        <select
          id="numPeople"
          value={numPeople}
          onChange={(e) => setNumPeople(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        >
          <option value={1}>1 Person</option>
          <option value={2}>2 People</option>
          <option value={3}>3 People</option>
          <option value={4}>4 People</option>
        </select>
        <button
          onClick={handleGenerateMeal}
          disabled={loading}
          className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Generating...' : 'Generate Meal'}
        </button>
      </div>

      <div className="mt-6">
        {error && (
            <div className="text-center p-10 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 font-semibold">{error}</p>
            </div>
        )}

        {meal && meal.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Your Recommended Meal for {numPeople} {numPeople > 1 ? 'People' : 'Person'}:</h2>
            
            {totalNutrition && (
              <div className="mb-8 p-4 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-700">Total Meal Nutrition (Estimated)</h3>
                    <button
                       onClick={handleSaveMeal}
                       className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                    >
                        <FaSave /> Save Meal
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <TotalStat icon={<FaFire/>} value={totalNutrition.calories} unit="kcal" label="Calories" />
                  <TotalStat icon="P" value={totalNutrition.protein} unit="g" label="Protein" />
                  <TotalStat icon="F" value={totalNutrition.fat} unit="g" label="Fat" />
                  <TotalStat icon="C" value={totalNutrition.carbs} unit="g" label="Carbs" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {meal.map(recipe => (
                <MealPlanRecipeCard key={recipe.recipe_id} recipe={recipe} />
              ))}
            </div>
          </div>
        )}
        
        {!loading && !meal && !error && (
             <div className="text-center p-10 bg-gray-50 border rounded-lg">
                <p className="text-gray-500">Select how many people are eating and click "Generate Meal" to begin!</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default MealPlanPage;