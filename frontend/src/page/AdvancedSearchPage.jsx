// src/page/AdvancedSearchPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FilterControls from '../components/FilterControls';
import RecipeCard from '../components/RecipeCard';

const AdvancedSearchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(location.search);
      const currentQueryInUrl = params.get('query') || '';
      if (searchQuery !== currentQueryInUrl) {
        handleTextSearch();
      }
    }, 500); 

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('query') || '');
    setCurrentPage(Number(params.get('page')) || 1);
    setShowFilters(params.get('adv') === 'true');

    const hasActiveFilters = params.has('tag_inc') || params.has('tag_exc') || params.has('ing_inc') || params.has('ing_exc');
    const hasSearchCriteria = params.has('query') || hasActiveFilters;
    if (hasSearchCriteria) {
      executeSearch(params.toString());
    } else {
      setHasSearched(false);
      setSearchResults([]);
      setTotalResults(0);
    }
  }, [location.search]);

  useEffect(() => {
    fetch('http://localhost:8000/tags/').then(res => res.json()).then(setAllTags);
    fetch('http://localhost:8000/ingredients/').then(res => res.json()).then(setAllIngredients);
  }, []);

  const executeSearch = useCallback((queryString) => {
    setIsLoading(true);
    setHasSearched(true);
    setError(null);

    fetch(`http://localhost:8000/recipes/search/?${queryString}`)
      .then(res => {
        if (!res.ok) throw new Error('Search request failed');
        return res.json();
      })
      .then(data => {
        setSearchResults(data.recipes || []);
        setTotalResults(data.total_count || 0);
      })
      .catch(err => {
        setError(err.message);
        setSearchResults([]);
        setTotalResults(0);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateUrlAndNavigate = (newParams) => {
    navigate(`${location.pathname}?${newParams.toString()}`);
  };

  const handleTextSearch = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.set('query', searchQuery);
    params.set('page', '1');
    updateUrlAndNavigate(params);
  }, [searchQuery, location.search]);

  const handleFilterApply = useCallback((newFilterStates) => {
    const params = new URLSearchParams(location.search);
    params.delete('tag_inc');
    params.delete('tag_exc');
    params.delete('ing_inc');
    params.delete('ing_exc');

    Object.entries(newFilterStates.tags).forEach(([name, state]) => {
      if (state === 'include') params.append('tag_inc', name);
      else if (state === 'exclude') params.append('tag_exc', name);
    });
    Object.entries(newFilterStates.ingredients).forEach(([name, state]) => {
      if (state === 'include') params.append('ing_inc', name);
      else if (state === 'exclude') params.append('ing_exc', name);
    });
    
    params.set('page', '1');
    updateUrlAndNavigate(params);
  }, [location.search]);

  const handleClearAllFilters = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.delete('tag_inc');
    params.delete('tag_exc');
    params.delete('ing_inc');
    params.delete('ing_exc');
    params.set('page', '1');
    params.set('adv', 'true');
    navigate(`${location.pathname}?${params.toString()}`);
  }, [location.search]);

  const handleHideFilters = () => {
    const params = new URLSearchParams(location.search);
    params.delete('adv');
    navigate(`${location.pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(location.search);
    params.set('page', newPage.toString());
    updateUrlAndNavigate(params);
  };

  const activeFiltersFromUrl = useMemo(() => {
      const params = new URLSearchParams(location.search);
      const tags = {};
      const ingredients = {};
      params.getAll('tag_inc').forEach(t => tags[t] = 'include');
      params.getAll('tag_exc').forEach(t => tags[t] = 'exclude');
      params.getAll('ing_inc').forEach(i => ingredients[i] = 'include');
      params.getAll('ing_exc').forEach(i => ingredients[i] = 'exclude');
      return { tags, ingredients };
  }, [location.search]);

  return (
    <div className="container mx-auto p-4">
      {showFilters && (
        <>
          <div className="mb-6 bg-white p-4 rounded-lg shadow-md border border-gray-200">
              <h1 className="text-xl font-bold text-orange-600 mb-4">Recipe Search</h1>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()}
                  className="flex-grow w-full p-2 border border-gray-300 rounded-md bg-gray-50 focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={handleTextSearch}
                  className="w-full sm:w-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md transition-colors"
                >
                  Search
                </button>
                <button
                  onClick={handleHideFilters}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors whitespace-nowrap"
                >
                  Hide Filters
                </button>
              </div>
          </div>

          <FilterControls
            allTags={allTags}
            allIngredients={allIngredients}
            initialSelectedFilters={activeFiltersFromUrl}
            onApplyFilters={handleFilterApply}
            onClearAll={handleClearAllFilters}
          />
        </>
      )}
      
      <div className="my-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{showFilters ? "Filtered Results" : "Search Results"}</h2>
        {isLoading && <p className="text-center text-lg py-10">Searching...</p>}
        {error && <p className="text-center text-lg text-red-600 py-10">{error}</p>}
        {!isLoading && !error && !hasSearched && (
            <p className="text-center text-lg text-gray-500 py-10">Enter a search term or use advanced search to find recipes.</p>
        )}
        {!isLoading && !error && hasSearched && searchResults.length === 0 && (
             <p className="text-center text-lg text-gray-500 py-10">No recipes found. Try different search terms or filters.</p>
        )}

        {!isLoading && !error && searchResults.length > 0 && (
          <>
            <div className="text-sm text-gray-600 mb-4">Found {totalResults} recipes.</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {searchResults.map(recipe => (
                <RecipeCard key={recipe.recipe_id} recipe={recipe} />
              ))}
            </div>
            {totalResults > pageSize && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || isLoading} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md disabled:opacity-50">Previous</button>
                <span className="text-gray-700">Page {currentPage} of {Math.ceil(totalResults / pageSize)}</span>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= Math.ceil(totalResults / pageSize) || isLoading} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md disabled:opacity-50">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearchPage;