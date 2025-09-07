/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { Product, Scene, Model, Accessory } from '../types';

type Item = (Product | Scene | Model | Accessory) & { isCustom?: boolean };

interface ObjectCardProps {
    item: Item;
    isSelected: boolean;
    onClick?: () => void;
    onDelete?: (id: number) => void;
}

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ObjectCard: React.FC<ObjectCardProps> = ({ item, isSelected, onClick, onDelete }) => {
    const cardClasses = `
        relative bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300
        ${onClick ? 'cursor-pointer hover:shadow-xl hover:scale-105' : ''}
        ${isSelected ? 'border-2 border-blue-500 shadow-xl scale-105' : 'border border-zinc-200'}
    `;
    
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(item.id);
        }
    };

    return (
        <div className={cardClasses} onClick={onClick}>
            {item.isCustom && onDelete && (
                <button
                    onClick={handleDelete}
                    className="absolute top-1.5 right-1.5 z-10 p-1 bg-white/60 text-zinc-600 rounded-full hover:bg-red-500 hover:text-white transition-colors backdrop-blur-sm"
                    aria-label="Delete item"
                    title="Delete item"
                >
                    <DeleteIcon />
                </button>
            )}
            <div className="aspect-square w-full bg-zinc-100 flex items-center justify-center">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
            </div>
            <div className="p-3 text-center">
                <h4 className="text-sm font-semibold text-zinc-700 truncate">{item.name}</h4>
            </div>
        </div>
    );
};

export default ObjectCard;