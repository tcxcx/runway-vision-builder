/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface HeaderProps {
  onLogoClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogoClick }) => {
  const title = "VisionRunway";
  const description = "Your AI-powered fashion studio. Turn clothing designs into professional product shots and runway videos instantly.";
  
  return (
    <header className="w-full p-4 text-center">
      <div 
        className="flex items-center justify-center cursor-pointer"
        onClick={onLogoClick}
        title="Go to Home"
      >
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-zinc-800">
            {title}
          </h1>
      </div>
      <p className="mt-4 text-lg text-zinc-600 max-w-3xl mx-auto">
        {description}
      </p>
    </header>
  );
};

export default Header;