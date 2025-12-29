// frontend/src/page/EditRecipePage.jsx

import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

const EditRecipePage = () => {
    const { id } = useParams();
    const { user, token } = useContext(AuthContext);
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [servings, setServings] = useState('1');
    const [steps, setSteps] = useState(['']);
    const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: '' }]);
    const [allTags, setAllTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [newTag, setNewTag] = useState('');
    const [tagSearchQuery, setTagSearchQuery] = useState('');
    const [allIngredients, setAllIngredients] = useState([]);
    const [error, setError] = useState(null);
    const [imageUrl, setImageUrl] = useState(''); 
    const [imagePreview, setImagePreview] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecipeData = async () => {
            try {
                const [recipeRes, ingredientsRes, stepsRes, tagsRes] = await Promise.all([
                    fetch(`http://localhost:8000/recipes/${id}`),
                    fetch(`http://localhost:8000/recipes/${id}/ingredients/`),
                    fetch(`http://localhost:8000/recipes/${id}/steps/`),
                    fetch(`http://localhost:8000/recipes/${id}/tags/`),
                ]);

                if (!recipeRes.ok) throw new Error('Recipe not found or you do not have permission to edit it.');

                const recipeData = await recipeRes.json();
                const ingredientsData = await ingredientsRes.json();
                const stepsData = await stepsRes.json();
                const tagsData = await tagsRes.json();

                // Authorization check
                if (recipeData.creator?.id !== user.id) {
                     throw new Error('You are not authorized to edit this recipe.');
                }
                
                setTitle(recipeData.title);
                setDescription(recipeData.description);
                setServings(recipeData.num_of_people?.match(/\d+/)?.[0] || '1');
                setSteps(stepsData.map(s => s.step_detail));
                setIngredients(ingredientsData.map(ing => {
                    const parts = ing.quantity.match(/([\d.]+)\s*(.*)/) || ['', ing.quantity, ''];
                    return { name: ing.name, quantity: parts[1], unit: parts[2] };
                }));
                setSelectedTags(tagsData.map(t => t.tag_name));
                setImageUrl(recipeData.image_url || '');
                setImagePreview(recipeData.image_url || '');

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const fetchSupportingData = async () => {
            try {
                 const [tagsFetch, ingredientsFetch] = await Promise.all([
                    fetch('http://localhost:8000/tags/'),
                    fetch('http://localhost:8000/ingredients/')
                 ]);
                 const tagsJson = await tagsFetch.json();
                 const ingredientsJson = await ingredientsFetch.json();
                 setAllTags(tagsJson.map(tag => tag.tag_name));
                 setAllIngredients(ingredientsJson.map(ing => ing.name));

            } catch(err) {
                console.error("Failed to fetch supporting data:", err)
            }
        };

        if (token && user) {
            fetchRecipeData();
            fetchSupportingData();
        }
    }, [id, token, user]);

    const handleImageChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImagePreview(URL.createObjectURL(file));
            
            const formData = new FormData();
            formData.append('image', file);

            setIsUploading(true);
            setError(null);
            
            try {
                const response = await fetch('http://localhost:8000/recipes/upload-image/', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });

                if (!response.ok) throw new Error('Image upload failed.');
                
                const data = await response.json();
                setImageUrl(data.image_url);

            } catch (err) {
                setError(err.message);
                setImagePreview('');
                setImageUrl('');
            } finally {
                setIsUploading(false);
            }
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const recipePayload = {
            title,
            description,
            servings: String(servings),
            steps: steps.filter(step => step.trim() !== ''),
            tags: selectedTags,
            ingredients,
            image_url: imageUrl,
        };

        try {
            const response = await fetch(`http://localhost:8000/recipes/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(recipePayload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Server error: ${response.status}`);
            }

            alert('Recipe updated successfully!');
            navigate(`/recipe/${id}`);

        } catch (err) {
            setError(err.message);
        }
    };

    const handleStepChange = (index, value) => {
        const newSteps = [...steps];
        newSteps[index] = value;
        setSteps(newSteps);
    };

    const addStep = () => setSteps([...steps, '']);

    const removeStep = (index) => {
        if (steps.length > 1) {
            setSteps(steps.filter((_, i) => i !== index));
        }
    };
    
    const handleTagToggle = (tag) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const handleAddNewTag = () => {
        const trimmedTag = newTag.trim();
        if (trimmedTag && !allTags.includes(trimmedTag) && !selectedTags.includes(trimmedTag)) {
            setSelectedTags([...selectedTags, trimmedTag]);
        }
        setNewTag('');
    };

    const handleIngredientChange = (index, field, value) => {
        const newIngredients = [...ingredients];
        newIngredients[index][field] = value;
        setIngredients(newIngredients);
    };

    const addIngredient = () => setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);

    const removeIngredient = (index) => {
        if (ingredients.length > 1) {
            setIngredients(ingredients.filter((_, i) => i !== index));
        }
    };
    
    const availableTags = allTags
        .filter(tag => !selectedTags.includes(tag))
        .filter(tag => tag.toLowerCase().includes(tagSearchQuery.toLowerCase()));

    if (loading) return <div className="text-center py-10">Loading recipe for editing...</div>;
    if (error) return <div className="text-center py-10 text-red-500">Error: {error}</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Edit Recipe</h1>
            <form onSubmit={handleSubmit} className="space-y-8">
                 <div>
                    <label htmlFor="title" className="block text-lg font-medium text-gray-700">Title</label>
                    <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                           className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                           maxLength="100" required />
                </div>
                <div>
                    <label htmlFor="description" className="block text-lg font-medium text-gray-700">Description</label>
                    <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)}
                              maxLength="500" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                              rows="4" required></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label htmlFor="servings" className="block text-lg font-medium text-gray-700">Servings (Number of People)</label>
                        <select id="servings" value={servings} onChange={(e) => setServings(e.target.value)}
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500">
                            {[...Array(10)].map((_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
                            <option value="10+">10+</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-lg font-medium text-gray-700">Recipe Image</label>
                        <div className="mt-1 flex items-center gap-4">
                            <input type="file" id="image" onChange={handleImageChange} accept="image/*" disabled={isUploading}
                                   className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 disabled:opacity-50" />
                            {imagePreview && <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-md" />}
                        </div>
                        {isUploading && <p className="text-sm text-orange-600 mt-1">Uploading image, please wait...</p>}
                    </div>
                </div>

                <div>
                    <p className="text-lg text-gray-700">
                        <span className="font-medium">Source:</span> Uploaded by <strong>{user?.username || '...'}</strong>
                    </p>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-700">Steps</h3>
                    <div className="space-y-2 mt-2">
                        {steps.map((step, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <span className="text-gray-500 font-bold">{index + 1}.</span>
                                <input type="text" value={step} onChange={(e) => handleStepChange(index, e.target.value)}
                                       className="flex-grow px-3 py-2 border border-gray-300 rounded-md" required />
                                {index > 0 && <button type="button" onClick={() => removeStep(index)} className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">&times;</button>}
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={addStep} className="mt-2 px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Add Step</button>
                </div>
                
                <div>
                    <h3 className="text-lg font-medium text-gray-700">Tags</h3>
                    <div className="p-2 mt-2 border border-gray-200 rounded-md min-h-[40px] bg-gray-50">
                        {selectedTags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {selectedTags.map(tag => (
                                    <div key={tag} className="flex items-center gap-2 px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-medium">
                                        <span>{tag}</span>
                                        <button type="button" onClick={() => handleTagToggle(tag)} className="text-white hover:text-orange-200" aria-label={`Remove ${tag}`}>&times;</button>
                                    </div>
                                ))}
                            </div>
                        ) : (<p className="text-sm text-gray-500 px-2">Select tags below or add a new one.</p>)}
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="tag-search" className="text-sm font-medium text-gray-600">Search Existing Tags</label>
                            <input type="text" id="tag-search" placeholder="Filter tags..." value={tagSearchQuery} onChange={(e) => setTagSearchQuery(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                            <div className="mt-2 h-40 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                                {availableTags.length > 0 ? availableTags.map(tag => (
                                    <button type="button" key={tag} onClick={() => handleTagToggle(tag)} className="w-full text-left px-3 py-1 rounded-md text-sm font-medium transition-colors bg-gray-200 text-gray-700 hover:bg-orange-100">{tag}</button>
                                )) : <p className="text-sm text-gray-400 p-2">No matching tags found.</p>}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="new-tag" className="text-sm font-medium text-gray-600">Or Add a New Tag</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input type="text" id="new-tag" placeholder="e.g., Vegan, QuickMeal" value={newTag} onChange={(e) => setNewTag(e.target.value)} className="flex-grow px-3 py-2 border border-gray-300 rounded-md" />
                                <button type="button" onClick={handleAddNewTag} className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 whitespace-nowrap">Add Tag</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-medium text-gray-700">Ingredients</h3>
                    <div className="space-y-4 mt-2">
                        {ingredients.map((ing, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                <input list="ingredient-suggestions" type="text" placeholder="Ingredient Name" value={ing.name} onChange={e => handleIngredientChange(index, 'name', e.target.value)} className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md" required/>
                                <input type="number" min="0" step="any" placeholder="Quantity" value={ing.quantity} onChange={e => handleIngredientChange(index, 'quantity', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md" required/>
                                <div className="flex items-center gap-2">
                                    <input type="text" placeholder="Unit" value={ing.unit} onChange={e => handleIngredientChange(index, 'unit', e.target.value)} className="flex-grow px-3 py-2 border border-gray-300 rounded-md"/>
                                    {index > 0 && <button type="button" onClick={() => removeIngredient(index)} className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">&times;</button>}
                                </div>
                            </div>
                        ))}
                        <datalist id="ingredient-suggestions">
                            {allIngredients.map(ing => <option key={ing} value={ing} />)}
                        </datalist>
                    </div>
                    <button type="button" onClick={addIngredient} className="mt-2 px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Add Ingredient</button>
                </div>
                
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={() => navigate(-1)} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancel</button>
                    <button type="submit" disabled={isUploading} className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-orange-300">
                        {isUploading ? 'Uploading...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditRecipePage;