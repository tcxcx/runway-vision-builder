/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';

interface HoverCardProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
}

const HoverCard: React.FC<HoverCardProps> = ({ 
  trigger, 
  content, 
  openDelay = 100, 
  closeDelay = 200 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const handleOpen = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (!isOpen) {
      openTimer.current = window.setTimeout(() => {
        setIsOpen(true);
      }, openDelay);
    }
  };

  const handleClose = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    closeTimer.current = window.setTimeout(() => {
      setIsOpen(false);
    }, closeDelay);
  };

  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <div className="relative" onMouseEnter={handleOpen} onMouseLeave={handleClose}>
      {trigger}
      <div 
        className={`
          absolute z-50 w-64 rounded-lg border border-[var(--border-secondary)] bg-[var(--background-tertiary)] text-[var(--text-primary)] shadow-xl
          transition-opacity duration-200
          bottom-full left-1/2 -translate-x-1/2 mb-2
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        aria-hidden={!isOpen}
      >
        {content}
      </div>
    </div>
  );
};

export default HoverCard;