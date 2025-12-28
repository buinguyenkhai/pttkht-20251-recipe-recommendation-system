import React, { useEffect, useState, useContext, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaCalendarAlt, FaExternalLinkAlt, FaUsers, FaStar, FaEdit, FaTrash, FaHeart, FaRegHeart, FaClipboardList } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import defaultImage from '../assets/default.png';

const RatingSummary = ({ stats }) => {
    if (stats.total === 0) {
        return (
            <div className="mt-8 p-4 border rounded-lg bg-gray-50">
                <h2 className="text-2xl font-semibold mb-4 text-orange-800">Ratings</h2>
                <p className="text-gray-600">This recipe has not been rated yet.</p>
            </div>
        );
    }

    const { average, total, distribution } = stats;

    return (
        <div className="mt-8 p-6 border rounded-lg bg-gray-50">
            <h2 className="text-2xl font-semibold mb-4 text-orange-800">Ratings & Reviews</h2>
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex flex-col items-center justify-center p-4">
                    <span className="text-5xl font-bold text-orange-600">{average}</span>
                    <div className="flex items-center my-1">
                        {[...Array(5)].map((_, i) => (
                            <FaStar key={i} className={i < Math.round(average) ? 'text-yellow-400' : 'text-gray-300'} />
                        ))}
                    </div>
                    <span className="text-sm text-gray-500 mt-1">({total} {total > 1 ? 'ratings' : 'rating'})</span>
                </div>
                <div className="w-full flex-grow space-y-1">
                    {Object.entries(distribution)
                        .sort(([starA], [starB]) => starB - starA)
                        .map(([star, count]) => {
                            const percentage = total > 0 ? (count / total) * 100 : 0;
                            return (
                                <div key={star} className="flex items-center gap-3 text-sm">
                                    <div className="flex items-center w-12">
                                        <span className="font-semibold text-gray-700">{star}</span>
                                        <FaStar className="text-yellow-400 ml-1" />
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div className="bg-yellow-400 h-3 rounded-full" style={{ width: `${percentage}%` }}></div>
                                    </div>
                                    <span className="w-12 text-right text-gray-600 font-medium">{count}</span>
                                </div>
                            );
                    })}
                </div>
            </div>
        </div>
    );
};


const RecipeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, isRecipeSaved, toggleSaveRecipe } = useContext(AuthContext);
  const [recipe, setRecipe] = useState(null);
  const [steps, setSteps] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [tags, setTags] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [nutrition, setNutrition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const isOwner = user && recipe && user.id === recipe.creator?.id;
  const canDeleteRecipe = isOwner || user?.is_admin;

  useEffect(() => {
    const fetchAllDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [recipeRes, ingredientsRes, stepsRes, tagsRes, reviewsRes, nutritionRes] = await Promise.all([
          fetch(`http://localhost:8000/recipes/${id}`),
          fetch(`http://localhost:8000/recipes/${id}/ingredients/`),
          fetch(`http://localhost:8000/recipes/${id}/steps/`),
          fetch(`http://localhost:8000/recipes/${id}/tags/`),
          fetch(`http://localhost:8000/recipes/${id}/reviews/`),
          fetch(`http://localhost:8000/recipes/${id}/nutrition`),
        ]);

        if (!recipeRes.ok) throw new Error(`Recipe not found`);
        
        const recipeData = await recipeRes.json();
        setRecipe(recipeData);
        setIngredients(await ingredientsRes.json());
        setSteps(await stepsRes.json());
        setTags(await tagsRes.json());
        setReviews(await reviewsRes.json());

        if (nutritionRes.ok) {
            setNutrition(await nutritionRes.json());
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllDetails();
  }, [id]);
  
  useEffect(() => {
    if (recipe && user) {
        setIsSaved(isRecipeSaved(recipe.recipe_id));
    }
  }, [recipe, user, isRecipeSaved]);

  const handleDeleteRecipe = async () => {
      if (!window.confirm("Are you sure you want to permanently delete this recipe?")) return;
      const url = user.is_admin 
          ? `http://localhost:8000/admin/recipes/${id}` 
          : `http://localhost:8000/recipes/${id}`;

      try {
          const res = await fetch(url, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.detail || "Failed to delete recipe.");
          }
          alert("Recipe deleted successfully.");
          navigate('/');
      } catch (err) {
          setError(err.message);
      }
  };

  const handleSaveClick = async () => {
    if (!user) {
        navigate('/login');
        return;
    }
    const success = await toggleSaveRecipe(recipe.recipe_id, token);
    if (success) {
        setIsSaved(!isSaved);
    }
  };

  const handleAddToCustomPlan = async () => {
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

  const ratingStats = useMemo(() => {
    if (!reviews || reviews.length === 0) {
        return { average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }
    const total = reviews.length;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const average = total > 0 ? (sum / total).toFixed(1) : 0;
    const distribution = reviews.reduce((acc, review) => {
        const rating = review.rating;
        if (rating >= 1 && rating <= 5) acc[rating] = (acc[rating] || 0) + 1;
        return acc;
    }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    return { average, total, distribution };
  }, [reviews]);

  const handleReviewUpdate = (updatedReview) => setReviews(reviews.map(r => r.id === updatedReview.id ? updatedReview : r));
  const handleReviewDelete = (reviewId) => setReviews(reviews.filter(r => r.id !== reviewId));
  const handleReviewCreate = (newReview) => setReviews([newReview, ...reviews]);

  if (loading) return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  if (error) return <div className="flex justify-center items-center h-screen"><p className="text-red-500">Error: {error}</p></div>;
  if (!recipe) return <div className="flex justify-center items-center h-screen"><p>Recipe not found.</p></div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-4 text-orange-600 hover:underline">
        <FaArrowLeft /> Back
      </button>

      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <img src={recipe.image_url || defaultImage} alt={recipe.title} className="w-full h-96 object-cover"/>
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-4xl font-bold text-orange-700 pr-4">{recipe.title}</h1>
            <div className="flex items-center gap-2 flex-shrink-0">
                {isOwner && (
                    <button onClick={() => navigate(`/edit-recipe/${id}`)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        <FaEdit /> <span>Edit</span>
                    </button>
                )}
                {canDeleteRecipe && (
                    <button onClick={handleDeleteRecipe} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                        <FaTrash /> <span>Delete</span>
                    </button>
                )}
                {user && !isOwner && (
                    <>
                        <button onClick={handleSaveClick} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600">
                            {isSaved ? <FaHeart /> : <FaRegHeart />}
                            <span>{isSaved ? 'Saved' : 'Save'}</span>
                        </button>
                        <button onClick={handleAddToCustomPlan} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                            <FaClipboardList />
                            <span>Add to Plan</span>
                        </button>
                    </>
                )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 mb-6">
            {recipe.date && <span className="flex items-center gap-2"><FaCalendarAlt /> {new Date(recipe.date).toLocaleDateString()}</span>}
            {recipe.num_of_people && <span className="flex items-center gap-2"><FaUsers /> {recipe.num_of_people}</span>}
            {recipe.source && (
              <span className="flex items-center gap-2">
                <FaExternalLinkAlt />
                { recipe.creator?.username ?
                    <span>{recipe.creator.username}</span> :
                    recipe.url ?
                        <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                            {recipe.source.source_name}
                        </a> :
                        <span>{recipe.source.source_name}</span>
                }
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {tags.map(tag => <span key={tag.tag_id} className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">{tag.tag_name}</span>)}
          </div>

          <p className="text-gray-700 mb-6">{recipe.description}</p>
          <div className="grid md:grid-cols-3 gap-8 mb-6">
            <div className="md:col-span-1 bg-orange-50 p-6 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold mb-4 text-orange-800 border-b-2 border-orange-200 pb-2">Ingredients</h2>
              <ul className="space-y-3 list-none p-0">
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start p-2 rounded-lg transition-colors duration-200 hover:bg-orange-100">
                    <span className="font-bold text-orange-500 mr-3 mt-1">&#10003;</span> {/* Checkmark character */}
                    <div>
                      <span className="font-semibold text-gray-800">{ing.name}</span>
                      <span className="text-gray-600 block text-sm">{ing.quantity}</span>
                    </div>
                  </li>
                ))}
              </ul>
              
              {nutrition && (
                <div className="mt-6 pt-6 border-t-2 border-orange-200">
                    <h3 className="text-xl font-bold mb-4 text-orange-800">Nutritional Info</h3>
                    <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-white/70 backdrop-blur-sm p-3 rounded-lg shadow-sm">
                            <p className="text-2xl font-bold text-orange-600">{nutrition.calories}</p>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Calories</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm p-3 rounded-lg shadow-sm">
                            <p className="text-2xl font-bold text-orange-600">{nutrition.protein}g</p>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Protein</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm p-3 rounded-lg shadow-sm">
                            <p className="text-2xl font-bold text-orange-600">{nutrition.fat}g</p>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Fat</p>
                        </div>
                        <div className="bg-white/70 backdrop-blur-sm p-3 rounded-lg shadow-sm">
                            <p className="text-2xl font-bold text-orange-600">{nutrition.carbs}g</p>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Carbs</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4 text-center">* Estimated values per serving</p>
                </div>
              )}
            </div>

            {/* Instructions Column */}
            <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-orange-800 border-b-2 border-gray-200 pb-3">Instructions</h2>
              <ol className="space-y-8 list-none p-0">
                {steps.map(step => (
                  <li key={step.step_number} className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-orange-500 text-white font-bold text-lg rounded-full shadow-md">
                      {step.step_number}
                    </div>
                    <p className="text-gray-700 flex-1 pt-1 leading-relaxed">
                      {step.step_detail}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <RatingSummary stats={ratingStats} />

          <ReviewSection 
            recipeId={id} 
            reviews={reviews} 
            onReviewCreate={handleReviewCreate}
            onReviewUpdate={handleReviewUpdate}
            onReviewDelete={handleReviewDelete}
          />
        </div>
      </div>
    </div>
  );
};

const ReviewSection = ({ recipeId, reviews, onReviewCreate, onReviewUpdate, onReviewDelete }) => {
    const { user, token } = useContext(AuthContext);
    const [isEditing, setIsEditing] = useState(false);
    const [rating, setRating] = useState(null);
    const [text, setText] =useState('');
    const [error, setError] = useState('');
    const [currentReviewId, setCurrentReviewId] = useState(null);

    const MAX_TEXT_LENGTH = 500;
    const userReview = useMemo(() => reviews.find(r => r.user?.id === user?.id), [reviews, user]);
    
    useEffect(() => {
        if(userReview){
            setCurrentReviewId(userReview.id);
            setRating(userReview.rating);
            setText(userReview.text);
            setIsEditing(false);
        } else {
            setCurrentReviewId(null);
            setRating(null);
            setText('');
            setIsEditing(true);
        }
    }, [userReview]);

    const handleEditClick = () => setIsEditing(true);

    const handleCancelClick = () => {
        if (userReview) {
            setRating(userReview.rating);
            setText(userReview.text);
            setIsEditing(false);
        } else {
            setRating(null);
            setText('');
        }
        setError('');
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Are you sure you want to delete this review?")) return;

        const isOwnReview = userReview?.id === reviewId;
        const url = user.is_admin && !isOwnReview
            ? `http://localhost:8000/admin/reviews/${reviewId}`
            : `http://localhost:8000/reviews/${reviewId}`;

        try {
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to delete review');
            
            onReviewDelete(reviewId);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!rating) {
            setError('A star rating is required to submit a review.');
            return;
        }

        const isUpdating = !!userReview;
        const reviewData = { rating, text };
        const url = isUpdating ? `http://localhost:8000/reviews/${currentReviewId}` : `http://localhost:8000/recipes/${recipeId}/reviews`;
        const method = isUpdating ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(reviewData)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Failed to submit review');
            }
            
            const result = await res.json();
            if (isUpdating) onReviewUpdate(result);
            else onReviewCreate(result);
             alert('Thank you for your review!');
             setIsEditing(false);

        } catch (err) {
            setError(err.message);
        }
    };
    
    return (
        <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4 text-orange-800">Reviews</h2>
            {user ? (
                (isEditing || !userReview) ? (
                    <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
                        <h3 className="font-semibold text-lg">{userReview ? 'Edit Your Review' : 'Leave a Review'}</h3>
                        <div className="flex items-center my-2">
                            {[1, 2, 3, 4, 5].map(star => (
                                <FaStar 
                                    key={star}
                                    className={`cursor-pointer text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                    onClick={() => setRating(star)} 
                                />
                            ))}
                        </div>
                        <textarea 
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            maxLength={MAX_TEXT_LENGTH}
                            placeholder="Leave a review..."
                            className="w-full p-2 border rounded-md"
                        />
                        <div className="text-right text-sm text-gray-500">{text.length}/{MAX_TEXT_LENGTH}</div>
                        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                        <div className="flex justify-end gap-2 mt-2">
                            {userReview && <button type="button" onClick={handleCancelClick} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button>}
                            <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-md">{userReview ? 'Update' : 'Submit'}</button>
                        </div>
                    </form>
                ) : (
                    <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                        <h3 className="font-semibold text-lg">Your Review</h3>
                        <div className="flex items-center my-2">
                            {[...Array(5)].map((_, i) => <FaStar key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'} />)}
                        </div>
                        <p className="text-gray-700">{text}</p>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={handleEditClick} className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-md text-sm"><FaEdit/> Edit</button>
                            <button onClick={() => handleDeleteReview(currentReviewId)} className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-md text-sm"><FaTrash/> Delete</button>
                        </div>
                    </div>
                )
            ) : (
                <div className="mb-6 p-4 border rounded-lg bg-gray-100 text-center">
                    <p>Please <Link to="/login" className="font-semibold text-orange-600 hover:underline">log in</Link> to leave a review.</p>
                </div>
            )}
            
            <div className="space-y-4">
                {reviews.map(review => {
                    const isOwnReview = review.user?.id === user?.id;
                    if (isOwnReview) return null;

                    return (
                        <div key={review.id} className="p-4 border-b flex justify-between items-start">
                            <div>
                                <div className="flex items-center mb-1">
                                    <p className="font-semibold">{review.user?.username || 'Deleted User'}</p>
                                    <div className="flex items-center ml-4">
                                        {[...Array(5)].map((_, i) => <FaStar key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'} />)}
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 mb-2">{new Date(review.created_at).toLocaleString()}</p>
                                <p>{review.text}</p>
                            </div>
                            {user?.is_admin && (
                                <button onClick={() => handleDeleteReview(review.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100" title="Delete Review">
                                    <FaTrash />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RecipeDetails;