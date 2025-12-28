// src/page/Home.jsx
import React, { useState, useEffect } from 'react';
import RecipeCard from '../components/RecipeCard';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import { Link } from 'react-router-dom';

const RecipeCarousel = ({ recipes }) => {
  if (!recipes || recipes.length === 0) {
    return (
        <div className="relative h-64 md:h-96 bg-gray-200 animate-pulse rounded-lg mb-8 shadow-lg flex items-center justify-center">
            <p className="text-gray-500">Loading featured recipes...</p>
        </div>
    );
  }

  return (
    <div className="mb-8 rounded-lg overflow-hidden shadow-2xl group">
      <Carousel
        showThumbs={false}
        showStatus={false}
        infiniteLoop
        useKeyboardArrows
        autoPlay
        interval={5000}
        transitionTime={700}
        className="cursor-pointer"
      >
        {recipes.map((recipe) => (
          <Link to={`/recipe/${recipe.recipe_id}`} key={recipe.recipe_id} className="block">
            <div className="relative h-64 md:h-96">
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-in-out"
                onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/800x400/f97316/ffffff?text=Image+Not+Available"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <h2 className="text-xl md:text-3xl font-bold text-white drop-shadow-md transform transition-transform duration-500 group-hover:-translate-y-2">
                  {recipe.title}
                </h2>
              </div>
            </div>
          </Link>
        ))}
      </Carousel>
    </div>
  );
};

const Home = ({ recipes, currentPage, setCurrentPage, pageSize, totalRecipes }) => {
  const [carouselRecipes, setCarouselRecipes] = useState([]);

  useEffect(() => {
    const fetchCarouselRecipes = async () => {
      try {

        const response = await fetch('http://localhost:8000/recipes/random-featured/?count=10'); 
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCarouselRecipes(data);
      } catch (error) {
        console.error("Could not fetch featured recipes:", error);
        setCarouselRecipes([]);
      }
    };

    fetchCarouselRecipes();
  }, []);


  const totalPages = Math.ceil(totalRecipes / pageSize);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
        <RecipeCarousel recipes={carouselRecipes} />

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">Latest Recipes</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
        {recipes && recipes.length > 0 ? (
          recipes.map(recipe => (
            <RecipeCard key={recipe.recipe_id} recipe={recipe} />
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-gray-500">
            <h2 className="text-xl">No recipes found.</h2>
            <p>Try refreshing the page or checking back later.</p>
          </div>
        )}
      </div>

      {recipes && recipes.length > 0 && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 sm:gap-4 mt-8">
            <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="px-3 sm:px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded-md disabled:opacity-50 transition-colors">First</button>
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 sm:px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded-md disabled:opacity-50 transition-colors">Previous</button>
            <span className="text-gray-700 text-sm sm:text-base">Page {currentPage} of {totalPages}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 sm:px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded-md disabled:opacity-50 transition-colors">Next</button>
            <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} className="px-3 sm:px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded-md disabled:opacity-50 transition-colors">Last</button>
        </div>
      )}
    </div>
  );
};

export default Home;
