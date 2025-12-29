// src/page/SavedRecipesPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import RecipeCard from '../components/RecipeCard';
import { AuthContext } from '../context/AuthContext';

const SavedRecipesPage = () => {
  const { user, token } = useContext(AuthContext);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalRecipes, setTotalRecipes] = useState(0);

  useEffect(() => {
    if (user && token) {
      const fetchSavedRecipes = async () => {
        setLoading(true);
        try {
          const skip = (currentPage - 1) * pageSize;
          const url = `http://localhost:8000/users/me/saved-recipes?skip=${skip}&limit=${pageSize}`;
          
          const res = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!res.ok) {
            throw new Error(`Failed to fetch saved recipes`);
          }

          const data = await res.json();
          setRecipes(data.recipes || []);
          setTotalRecipes(data.total_count || 0);
          setError(null);
        } catch (err) {
          setError('Could not load saved recipes. Please try again.');
          setRecipes([]);
          setTotalRecipes(0);
        } finally {
          setLoading(false);
        }
      };

      fetchSavedRecipes();
    }
  }, [user, token, currentPage, pageSize]);

  const totalPages = Math.ceil(totalRecipes / pageSize);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading your saved recipes...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-orange-600 mb-6 text-center">My Saved Recipes</h1>
      
      {recipes.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
            {recipes.map(recipe => (
              <RecipeCard key={recipe.recipe_id} recipe={recipe} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 sm:gap-4 mt-8">
              <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="px-3 sm:px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md disabled:opacity-50 transition-colors">First</button>
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 sm:px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md disabled:opacity-50 transition-colors">Previous</button>
              <span className="text-gray-700 text-sm sm:text-base">Page {currentPage} of {totalPages}</span>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 sm:px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md disabled:opacity-50 transition-colors">Next</button>
              <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} className="px-3 sm:px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md disabled:opacity-50 transition-colors">Last</button>
            </div>
          )}
        </>
      ) : (
        <div className="col-span-full text-center py-10 text-gray-500">
          <h2 className="text-xl">You haven't saved any recipes yet.</h2>
          <p>Click the heart icon on a recipe to save it!</p>
        </div>
      )}
    </div>
  );
};

export default SavedRecipesPage;