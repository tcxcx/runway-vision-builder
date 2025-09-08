/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);

interface HeaderProps {
  onLogoClick: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const Header: React.FC<HeaderProps> = ({ onLogoClick, theme, setTheme }) => {
  
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="w-full bg-[var(--background-primary)] text-[var(--text-primary)] sticky top-0 z-50">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between py-4 border-b border-[var(--border-primary)]">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={onLogoClick}
            title="Start Over"
          >
            <img 
              src="./assets/visionrunwaybanana.png" 
              alt="VisionRunway Logo" 
              className="w-8 h-8 transition-transform group-hover:-rotate-12" 
            />
            <h1 className="text-3xl font-bold tracking-tighter">
              Vision<span style={{color: 'var(--accent-gold)'}}>Runway</span>
            </h1>
          </div>
          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-secondary)]">
              <a href="#" className="hover:text-[var(--accent-blue)] transition-colors">Home</a>
              <a href="#" className="hover:text-[var(--accent-blue)] transition-colors">Wardrobe</a>
              <a href="#" className="hover:text-[var(--accent-blue)] transition-colors">Scenes</a>
              <a href="#" className="hover:text-[var(--accent-blue)] transition-colors">Collections</a>
              <a href="#" className="hover:text-[var(--accent-blue)] transition-colors">Profile</a>
            </nav>
            <button 
                onClick={toggleTheme}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[var(--background-tertiary)]"
                aria-label="Toggle theme"
                title="Toggle theme"
            >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
         <div className="text-center pb-8 pt-6">
          <p className="text-lg text-[var(--text-secondary)] max-w-3xl mx-auto">
            Your AI-powered fashion studio. Turn clothing designs into professional shots and runway videos instantly.
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;