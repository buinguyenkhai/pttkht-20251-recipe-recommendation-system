// src/components/NavBar.jsx
import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaUtensils, FaUser, FaSearch, FaFilter, FaSignOutAlt, FaPlus, FaHeart, FaBook, FaShieldAlt, FaClipboardList, FaSave } from 'react-icons/fa';
import logo from '../assets/image.png';
import { AuthContext } from '../context/AuthContext';

const NavBar = ({ searchQuery, setSearchQuery, setCurrentPage }) => {
  const navigate = useNavigate();
  const { user, logout, savedRecipeCount } = useContext(AuthContext); 
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    navigate(`/search?query=${encodeURIComponent(trimmed)}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const goToAdvancedSearch = () => {
    const params = new URLSearchParams();
    const trimmedQuery = searchQuery.trim();
    
    if (trimmedQuery) {
        params.set('query', trimmedQuery);
    }
    
    params.set('adv', 'true');
    
    navigate(`/search?${params.toString()}`);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const displayCount = savedRecipeCount > 99 ? '99+' : savedRecipeCount;

  return (
    <nav className="flex items-center justify-between px-4 md:px-6 py-3 bg-white shadow-md text-gray-800 sticky top-0 z-50">
      <Link
        to="/"
        className="flex items-center gap-2 cursor-pointer flex-shrink-0"
        onClick={() => {
          setSearchQuery('');
          if (setCurrentPage) {
            setCurrentPage(1);
          }
        }}
      >
        <img src={logo} alt="logo" className="w-14 h-10 md:w-16 md:h-12 object-contain" />
        <h1 className="text-md md:text-xl font-bold text-orange-500 whitespace-nowrap">Let Me Cook!</h1>
      </Link>

      <div className="flex items-center flex-grow max-w-xs sm:max-w-sm md:max-w-md lg:max-w-xl mx-2 sm:mx-4">
        <button
          onClick={goToAdvancedSearch}
          className="flex items-center gap-1 sm:gap-2 px-2 py-2 sm:px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-l-md transition-colors border border-r-0 border-gray-300"
          title="Advanced Search & Filters"
        >
          <FaFilter />
          <span className="hidden sm:inline text-xs sm:text-sm whitespace-nowrap">Adv. Search</span>
        </button>
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <button
          className="px-3 py-2 bg-orange-500 text-white rounded-r-md hover:bg-orange-600 transition-colors flex items-center justify-center border border-l-0 border-orange-500"
          onClick={handleSearchSubmit}
          aria-label="Search"
        >
          <FaSearch />
        </button>
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 relative">
        {user ? (
          <>
            <Link to="/add-recipe" className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 transition-colors">
                <FaPlus />
                <span>Add Recipe</span>
            </Link>
             <Link to="/add-recipe" className="sm:hidden p-2 text-white bg-orange-500 rounded-full hover:bg-orange-600">
                <FaPlus />
            </Link>
            <Link to="/meal-plan" className="p-2 rounded-full hover:bg-gray-100" title="Chef's Meal Plan Generator">
                <FaUtensils className="text-lg sm:text-xl text-orange-500" />
            </Link>
            <Link to="/custom-meal-plan" className="p-2 rounded-full hover:bg-gray-100" title="My Custom Meal Plan">
                <FaClipboardList className="text-lg sm:text-xl text-orange-500" />
            </Link>

            <div ref={dropdownRef} className="relative">
                <button onClick={() => setShowDropdown(!showDropdown)} className="p-2 rounded-full hover:bg-gray-100" title="Profile">
                    <FaUser className="text-lg sm:text-xl text-orange-500" />
                    {savedRecipeCount > 0 && (
                      <span className="absolute -top-1 -right-2 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {displayCount}
                      </span>
                    )}
                </button>
                {showDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">Signed in as <br/><strong>{user.username}</strong></div>
                    
                    {user.is_admin && (
                        <Link to="/admin/dashboard" className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => setShowDropdown(false)}>
                            <FaShieldAlt className="mr-3 text-gray-500" />
                            Admin Dashboard
                        </Link>
                    )}

                    <Link to="/my-recipes" className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => setShowDropdown(false)}>
                        <FaBook className="mr-3 text-gray-500" />
                        My Recipes
                    </Link>
                    <Link to="/saved-recipes" className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => setShowDropdown(false)}>
                        <FaHeart className="mr-3 text-gray-500" />
                        My Saved Recipes ({displayCount})
                    </Link>
                    <Link to="/saved-meal-plans" className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => setShowDropdown(false)}>
                        <FaSave className="mr-3 text-gray-500" />
                        My Saved Meal Plans
                    </Link>
                    <button
                    onClick={() => {
                        logout();
                        setShowDropdown(false);
                    }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                    <FaSignOutAlt className="mr-3 text-gray-500"/>
                    Logout
                    </button>
                </div>
                )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-3 py-2 text-sm font-medium text-orange-500 rounded-md hover:bg-orange-100 transition-colors">Login</Link>
            <Link to="/signup" className="px-3 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 transition-colors">Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar;