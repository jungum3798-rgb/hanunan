
import { useState } from 'react';

export const useCategory = () => {
    const [activeCategory, setActiveCategory] = useState<'DISASTER' | 'SAFETY' | 'REPORT'>('DISASTER');

    const handleCategoryChange = (category: 'DISASTER' | 'SAFETY' | 'REPORT') => {
        setActiveCategory(category);
    };

    return {
        activeCategory, 
        handleCategoryChange, 
    };
};