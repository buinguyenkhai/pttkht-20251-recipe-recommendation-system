// src/page/CreatedRecipesPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import RecipeCard from '../components/RecipeCard';
import { AuthContext } from '../context/AuthContext';

const CreatedRecipesPage = () => {
  const { user, token } = useContext(AuthContext);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalRecipes, setTotalRecipes] = useState(0);

  const fetchCreatedRecipes = async () => {
    if (user && token) {
      setLoading(true);
      try {
        const skip = (currentPage - 1) * pageSize;
        const url = `http://localhost:8000/users/me/created-recipes?skip=${skip}&limit=${pageSize}`;
        
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch created recipes`);
        }

        const data = await res.json();
        setRecipes(data.recipes || []);
        setTotalRecipes(data.total_count || 0);
        setError(null);
      } catch (err) {
        setError('Could not load your recipes. Please try again.');
        setRecipes([]);
        setTotalRecipes(0);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchCreatedRecipes();
  }, [user, token, currentPage, pageSize]);

  const totalPages = Math.ceil(totalRecipes / pageSize);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const onRecipeDeleted = (deletedRecipeId) => {
    setRecipes(prevRecipes => prevRecipes.filter(recipe => recipe.recipe_id !== deletedRecipeId));
    setTotalRecipes(prevTotal => prevTotal - 1);
};


  if (loading) {
    return <div className="text-center py-10">Loading your created recipes...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-orange-600 mb-6 text-center">My Created Recipes</h1>
      
      {recipes.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
            {recipes.map(recipe => (
              <RecipeCard 
                key={recipe.recipe_id} 
                recipe={recipe} 
                isOwner={true}
                onRecipeDeleted={onRecipeDeleted} 
              />
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
          <h2 className="text-xl">You haven't created any recipes yet.</h2>
          <p>Click "Add Recipe" to get started!</p>
        </div>
      )}
    </div>
  );
};

export default CreatedRecipesPage;