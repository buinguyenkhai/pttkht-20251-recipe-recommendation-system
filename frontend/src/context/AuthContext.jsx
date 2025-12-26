import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [savedRecipeIds, setSavedRecipeIds] = useState(new Set());
    const [savedRecipeCount, setSavedRecipeCount] = useState(0);

    const navigate = useNavigate();

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        if (token) {
            fetch('http://localhost:8000/users/me/', {
                headers: { 'Authorization': `Bearer ${token}` },
                signal
            })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Session expired');
            })
            .then(userData => {
                setUser(userData);
                return fetch('http://localhost:8000/users/me/saved-recipes', {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal
                });
            })
            .then(res => {
                if (res.ok) return res.json();
                console.error('Could not fetch saved recipes.');
                return { recipes: [], total_count: 0 };
            })
            .then(savedData => {
                const ids = new Set(savedData.recipes.map(r => r.recipe_id));
                setSavedRecipeIds(ids);
                setSavedRecipeCount(savedData.total_count);
            })
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    logout();
                }
            });
        } else {
            setUser(null);
            setSavedRecipeIds(new Set());
            setSavedRecipeCount(0);
        }

        return () => {
            controller.abort();
        };
    }, [token]);

    const login = async (username, password) => {
        try {
            const response = await fetch('http://localhost:8000/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.access_token);
                setToken(data.access_token);
                return { success: true };
            } else {
                const errorData = await response.json();
                return { success: false, message: errorData.detail || "Failed to login" };
            }
        } catch (error) {
            return { success: false, message: "A network error occurred." };
        }
    };

    const signup = async (username, password) => {
        try {
            const response = await fetch('http://localhost:8000/users/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                return { success: true };
            } else {
                const errorData = await response.json();
                if (response.status === 422 && Array.isArray(errorData.detail)) {
                     return { success: false, message: errorData.detail[0].msg };
                }
                return { success: false, message: errorData.detail || "Failed to sign up" };
            }
        } catch (error) {
            return { success: false, message: "A network error occurred." };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setSavedRecipeIds(new Set());
        setSavedRecipeCount(0);
        navigate('/');
    };

    //

    /**
     * Checks if a recipe is in the user's saved list.
     * @param {number} recipeId - The ID of the recipe to check.
     * @returns {boolean} - True if the recipe is saved, false otherwise.
     */
    const isRecipeSaved = (recipeId) => {
        return savedRecipeIds.has(recipeId);
    };

    /**
     * Saves or unsaves a recipe for the current user.
     * @param {number} recipeId - The ID of the recipe to toggle.
     * @returns {boolean} - True on success, false on failure.
     */
    const toggleSaveRecipe = async (recipeId) => {
        if (!token) return false;

        const isCurrentlySaved = isRecipeSaved(recipeId);
        const method = isCurrentlySaved ? 'DELETE' : 'POST';
        const url = `http://localhost:8000/recipes/${recipeId}/save`;

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                if (isCurrentlySaved) {
                    setSavedRecipeIds(prevIds => {
                        const newIds = new Set(prevIds);
                        newIds.delete(recipeId);
                        return newIds;
                    });
                    setSavedRecipeCount(prev => Math.max(0, prev - 1));
                } else {
                    setSavedRecipeIds(prevIds => new Set(prevIds).add(recipeId));
                    setSavedRecipeCount(prev => prev + 1);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error("Failed to toggle save state:", error);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            token, 
            login, 
            logout, 
            signup,
            savedRecipeCount,
            isRecipeSaved,
            toggleSaveRecipe
        }}>
            {children}
        </AuthContext.Provider>
    );
};