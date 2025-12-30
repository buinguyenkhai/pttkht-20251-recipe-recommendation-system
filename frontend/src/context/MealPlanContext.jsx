import React, { createContext, useState } from 'react';

export const MealPlanContext = createContext();

export const MealPlanProvider = ({ children }) => {
  const [numPeople, setNumPeople] = useState(2);
  const [meal, setMeal] = useState(null);
  const [totalNutrition, setTotalNutrition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateMeal = async (people) => {
    setLoading(true);
    setError('');
    setMeal(null);
    setTotalNutrition(null);

    try {
      const response = await fetch(`http://localhost:8000/random_meal/?num_people=${people}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `Could not find a meal plan for ${people} people.`);
      }
      const data = await response.json();
      setMeal(data);

      if (data && data.length > 0) {
        const totals = data.reduce((acc, recipe) => {
          acc.calories += recipe.calories || 0;
          acc.protein += recipe.protein || 0;
          acc.fat += recipe.fat || 0;
          acc.carbs += recipe.carbs || 0;
          return acc;
        }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

        totals.calories = Math.round(totals.calories);
        totals.protein = Math.round(totals.protein);
        totals.fat = Math.round(totals.fat);
        totals.carbs = Math.round(totals.carbs);
        
        setTotalNutrition(totals);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    numPeople,
    setNumPeople,
    meal,
    setMeal,
    totalNutrition,
    setTotalNutrition,
    loading,
    error,
    generateMeal
  };

  return (
    <MealPlanContext.Provider value={value}>
      {children}
    </MealPlanContext.Provider>
  );
};