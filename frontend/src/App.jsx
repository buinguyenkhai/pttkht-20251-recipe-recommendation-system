// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/NavBar';
import Home from './page/Home';
import RecipeDetails from './page/RecipeDetails';
import AdvancedSearchPage from './page/AdvancedSearchPage';
import Login from './page/Login';
import SignUp from './page/SignUp';
import { AuthProvider } from './context/AuthContext';
import AddRecipePage from './page/AddRecipePage';
import PrivateRoute from './components/PrivateRoute';
import SavedRecipesPage from './page/SavedRecipesPage';
import CreatedRecipesPage from './page/CreatedRecipesPage';
import EditRecipePage from './page/EditRecipePage';
import MealPlanPage from './page/MealPlanPage';
import AdminRoute from './components/AdminRoute';
import AdminDashboardPage from './page/admin/AdminDashboardPage';
import CustomMealPlanPage from './page/CustomMealPlanPage';
import SavedMealPlansPage from './page/SavedMealPlansPage';
import { MealPlanProvider } from './context/MealPlanContext';

const AppWrapper = () => {
  return (
    <Router>
      <AuthProvider>
        <MealPlanProvider> 
        <AppContent />
        </MealPlanProvider> 
      </AuthProvider>
    </Router>
  );
};

const AppContent = () => {
  const location = useLocation();
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryFromUrl = params.get('query') || '';
    setNavSearchQuery(queryFromUrl);
  }, [location.search]);

  useEffect(() => {
    if (location.pathname === '/') {
      const fetchGeneralRecipes = async () => {
        setLoading(true);
        try {
          const skip = (currentPage - 1) * pageSize;
          const url = `http://localhost:8000/recipes/?skip=${skip}&limit=${pageSize}`;

          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`Failed to fetch recipes (status: ${res.status})`);
          }
          const result = await res.json();
          setRecipes(result.recipes || []);
          setTotalRecipes(result.total_count || 0);
          setError(null);
        } catch (err) {
          console.error('Failed to fetch general recipes:', err);
          setError('Failed to load recipes. Please try again later.');
          setRecipes([]);
          setTotalRecipes(0);
        } finally {
          setLoading(false);
        }
      };
      fetchGeneralRecipes();
    }
  }, [currentPage, pageSize, location.pathname]);

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800">
      <Navbar
        searchQuery={navSearchQuery}
        setSearchQuery={setNavSearchQuery}
        setCurrentPage={setCurrentPage}
      />
      <main className="pt-4 px-4 pb-8">
        <Routes>
          <Route
            path="/"
            element={
              loading ? (
                <div className="flex justify-center items-center h-64"><p className="text-lg">Loading recipes...</p></div>
              ) : error ? (
                <div className="flex justify-center items-center h-64"><p className="text-lg text-red-600">{error}</p></div>
              ) : (
                <Home
                  recipes={recipes}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  pageSize={pageSize}
                  totalRecipes={totalRecipes}
                />
              )
            }
          />
          <Route path="/search" element={<AdvancedSearchPage />} />
          <Route path="/recipe/:id" element={<RecipeDetails />} />
          <Route path="/meal-plan" element={<MealPlanPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          
          {/* Routes for all logged-in users */}
          <Route element={<PrivateRoute />}>
            <Route path="/add-recipe" element={<AddRecipePage />} />
            <Route path="/saved-recipes" element={<SavedRecipesPage />} />
            <Route path="/my-recipes" element={<CreatedRecipesPage />} />
            <Route path="/edit-recipe/:id" element={<EditRecipePage />} />
            <Route path="/custom-meal-plan" element={<CustomMealPlanPage />} />
            <Route path="/saved-meal-plans" element={<SavedMealPlansPage />} />
          </Route>

          {/* Routes for admin users only */}
          <Route element={<AdminRoute />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          </Route>

        </Routes>
      </main>
    </div>
  );
};

export default AppWrapper;