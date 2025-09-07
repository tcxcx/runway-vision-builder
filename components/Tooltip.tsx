/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// FIX: Replace placeholder content with a valid Tooltip component.
import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ children, text, position = 'top' }) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative group flex items-center">
      {children}
      <div 
        className={`
          absolute z-10 px-2 py-1 text-xs font-semibold text-white bg-zinc-800 rounded-md shadow-lg
          whitespace-nowrap
          invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity
          ${positionClasses[position]}
        `}
      >
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
