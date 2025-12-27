// src/components/RecipeCard.jsx
import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTag, FaCalendarAlt, FaHeart, FaRegHeart, FaEdit, FaTrash, FaClipboardList } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import defaultImage from '../assets/default.png';

const RecipeCard = ({ recipe, isOwner = false, onRecipeDeleted }) => {
  const navigate = useNavigate();
  const { user, token, isRecipeSaved, toggleSaveRecipe } = useContext(AuthContext);
  const [isSaved, setIsSaved] = useState(false);

  const canDelete = isOwner || user?.is_admin;

  useEffect(() => {
    if (user && recipe && !isOwner) {
      setIsSaved(isRecipeSaved(recipe.recipe_id));
    }
  }, [recipe, isRecipeSaved, user, isOwner]);
  
  const handleAddToCustomPlan = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
        navigate('/login');
        return;
    }
    try {
        const response = await fetch(`http://localhost:8000/custom-meal-plan/recipe/${recipe.recipe_id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            alert('Recipe added to your custom meal plan!');
        } else {
            throw new Error(data.detail || 'Failed to add recipe to plan.');
        }
    } catch (error) {
        alert(error.message);
    }
  };

  const handleSaveClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    const success = await toggleSaveRecipe(recipe.recipe_id, token);
    if (success) {
      setIsSaved(!isSaved);
    }
  };

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/edit-recipe/${recipe.recipe_id}`);
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const url = user.is_admin
      ? `http://localhost:8000/admin/recipes/${recipe.recipe_id}`
      : `http://localhost:8000/recipes/${recipe.recipe_id}`;
    
    if (window.confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                alert('Recipe deleted successfully.');
                if (onRecipeDeleted) {
                    onRecipeDeleted(recipe.recipe_id);
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to delete the recipe.');
            }
        } catch (error) {
            alert(error.message);
        }
    }
};


  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error("Invalid date format:", dateString);
      return null;
    }
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };

  return (
    <div className="relative border border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 bg-white flex flex-col hover:-translate-y-1 group">
      
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
        {isOwner && (
            <button onClick={handleEdit} className="p-2 bg-white rounded-full text-blue-500 hover:bg-blue-100 transition-colors" title="Edit Recipe">
                <FaEdit size={18} />
            </button>
        )}
        
        {user && canDelete && (
            <button onClick={handleDelete} className="p-2 bg-white rounded-full text-red-500 hover:bg-red-100 transition-colors" title="Delete Recipe">
                <FaTrash size={18} />
            </button>
        )}

        {user && !isOwner && (
            <>
                <button onClick={handleSaveClick} className="p-2 bg-white rounded-full text-orange-500 hover:bg-orange-100 transition-colors" title={isSaved ? 'Unsave Recipe' : 'Save Recipe'}>
                    {isSaved ? <FaHeart size={20} /> : <FaRegHeart size={20} />}
                </button>
                <button onClick={handleAddToCustomPlan} className="p-2 bg-white rounded-full text-green-500 hover:bg-green-100 transition-colors" title="Add to Custom Plan">
                    <FaClipboardList size={20} />
                </button>
            </>
        )}
      </div>


      <Link to={`/recipe/${recipe.recipe_id}`} className="flex flex-col flex-grow">
        <div className="h-48 overflow-hidden relative">
          <img
            src={recipe.image_url || defaultImage}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { e.target.onerror = null; e.target.src = defaultImage; }}
          />
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="text-lg font-semibold mb-2 text-orange-600 h-14 line-clamp-2">{recipe.title}</h3>

          {recipe.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-grow">
              {recipe.description}
            </p>
          )}

          <div className="flex flex-wrap justify-between items-center mt-auto pt-3 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {recipe.tags && recipe.tags.slice(0, 2).map((tagName, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full flex items-center gap-1"
                >
                  <FaTag className="opacity-70" /> {tagName}
                </span>
              ))}
            </div>
            {recipe.date && (
              <div className="flex items-center text-xs text-gray-500 gap-1">
                <FaCalendarAlt />
                <span>{formatDate(recipe.date)}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default RecipeCard;