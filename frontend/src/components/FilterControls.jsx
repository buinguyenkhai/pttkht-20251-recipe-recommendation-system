// src/components/FilterControls.jsx
import React, { useState, useEffect } from 'react';
import { FaPlusCircle, FaMinusCircle } from 'react-icons/fa';

const FilterControls = ({
  allTags,
  allIngredients,
  initialSelectedFilters,
  onApplyFilters,
  onClearAll,
}) => {
  const [selectedTagStates, setSelectedTagStates] = useState(initialSelectedFilters.tags || {});
  const [selectedIngredientStates, setSelectedIngredientStates] = useState(initialSelectedFilters.ingredients || {});
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState('');

  useEffect(() => {
    setSelectedTagStates(initialSelectedFilters.tags || {});
    setSelectedIngredientStates(initialSelectedFilters.ingredients || {});
  }, [initialSelectedFilters]);

  const getNextState = (currentState) => {
    if (currentState === 'include') return 'exclude';
    if (currentState === 'exclude') return 'clear';
    return 'include';
  };

  const handleItemClick = (itemName, currentStates, setterFunction) => {
    const newStates = { ...currentStates };
    const currentState = newStates[itemName];
    const nextState = getNextState(currentState);
    if (nextState === 'clear') {
      delete newStates[itemName];
    } else {
      newStates[itemName] = nextState;
    }
    setterFunction(newStates);
  };

  const handleClearSection = (type) => {
    if (type === 'tags') {
      setSelectedTagStates({});
    } else if (type === 'ingredients') {
      setSelectedIngredientStates({});
    }
  };

  const handleApplyButtonClick = () => {
    onApplyFilters({
      tags: selectedTagStates,
      ingredients: selectedIngredientStates,
    });
  };

  const renderSelectedItems = (selectedStates) => {
    const included = Object.keys(selectedStates).filter(key => selectedStates[key] === 'include');
    const excluded = Object.keys(selectedStates).filter(key => selectedStates[key] === 'exclude');

    if (included.length === 0 && excluded.length === 0) return null;

    return (
      <div className="mb-3 text-xs sm:text-sm">
        {included.length > 0 && (
          <div className="mb-1 flex items-center flex-wrap gap-1">
            <span className="font-semibold text-green-600">Including:</span>
            {included.map(name => (
              <span key={name} className="inline-block bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                {name}
              </span>
            ))}
          </div>
        )}
        {excluded.length > 0 && (
          <div className="flex items-center flex-wrap gap-1">
            <span className="font-semibold text-red-600">Excluding:</span>
            {excluded.map(name => (
              <span key={name} className="inline-block bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full">
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const filteredTags = allTags.filter(tag =>
    tag.tag_name.toLowerCase().includes(tagSearchTerm.toLowerCase())
  );

  const filteredIngredients = allIngredients.filter(ing =>
    ing.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase())
  );

  const getButtonClass = (state) => {
    if (state === 'include') return 'bg-green-500 text-white border-green-600 hover:bg-green-600';
    if (state === 'exclude') return 'bg-red-500 text-white border-red-600 hover:bg-red-600';
    return 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300';
  };

  const getButtonIcon = (state) => {
    if (state === 'include') return <FaPlusCircle className="mr-1.5" />;
    if (state === 'exclude') return <FaMinusCircle className="mr-1.5" />;
    return null;
  };

  const getCountClass = (state) => {
    if (state === 'include') return 'text-green-200';
    if (state === 'exclude') return 'text-red-200';
    return 'text-gray-500';
  };

  return (
    <div className="bg-white shadow-lg border border-gray-200 p-4 sm:p-6 rounded-lg w-full mx-auto mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-lg text-orange-600">Filter by Tags</h4>
            <button
              onClick={() => handleClearSection('tags')}
              className="text-xs text-gray-500 hover:text-orange-600 font-semibold px-2 py-1 rounded"
            >
              RESET
            </button>
          </div>
          {renderSelectedItems(selectedTagStates)}
          <input
            type="text"
            placeholder="Search tags..."
            className="w-full p-2 mb-3 border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-orange-500"
            value={tagSearchTerm}
            onChange={(e) => setTagSearchTerm(e.target.value)}
          />
          <div className="max-h-60 overflow-y-auto pr-2 flex flex-wrap gap-2">
            {filteredTags.map(tag => (
              <button
                key={tag.tag_id}
                onClick={() => handleItemClick(tag.tag_name, selectedTagStates, setSelectedTagStates)}
                className={`flex items-center px-2.5 py-1.5 rounded-md border text-sm font-medium transition-colors ${getButtonClass(selectedTagStates[tag.tag_name])}`}
              >
                {getButtonIcon(selectedTagStates[tag.tag_name])}
                {tag.tag_name} <span className={`text-xs ml-1.5 ${getCountClass(selectedTagStates[tag.tag_name])}`}>({tag.recipe_count})</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-lg text-green-600">Filter by Ingredients</h4>
            <button
              onClick={() => handleClearSection('ingredients')}
              className="text-xs text-gray-500 hover:text-green-600 font-semibold px-2 py-1 rounded"
            >
              RESET
            </button>
          </div>
          {renderSelectedItems(selectedIngredientStates)}
          <input
            type="text"
            placeholder="Search ingredients..."
            className="w-full p-2 mb-3 border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-green-500"
            value={ingredientSearchTerm}
            onChange={(e) => setIngredientSearchTerm(e.target.value)}
          />
          <div className="max-h-60 overflow-y-auto pr-2 flex flex-wrap gap-2">
            {filteredIngredients.map(ing => (
              <button
                key={ing.ingredient_id}
                onClick={() => handleItemClick(ing.name, selectedIngredientStates, setSelectedIngredientStates)}
                className={`flex items-center px-2.5 py-1.5 rounded-md border text-sm font-medium transition-colors ${getButtonClass(selectedIngredientStates[ing.name])}`}
              >
                {getButtonIcon(selectedIngredientStates[ing.name])}
                {ing.name} <span className={`text-xs ml-1.5 ${getCountClass(selectedIngredientStates[ing.name])}`}>({ing.recipe_count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-3 mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onClearAll}
          className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
        >
          Clear All
        </button>
        <button
          onClick={handleApplyButtonClick}
          className="w-full sm:w-auto px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default React.memo(FilterControls);