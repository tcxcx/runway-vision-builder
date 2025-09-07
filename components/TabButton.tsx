/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick, disabled = false, title = "" }) => {
  const baseClasses = "flex-1 px-3 py-2 text-sm font-semibold text-center transition-colors duration-200 border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background-primary)]";
  const activeClasses = "border-[var(--accent-blue)] text-[var(--accent-blue)]";
  const inactiveClasses = "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-tertiary)]";
  const disabledClasses = "text-[var(--disabled-text)] border-transparent cursor-not-allowed";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${disabled ? disabledClasses : (isActive ? activeClasses : inactiveClasses)}`}
      aria-selected={isActive}
      role="tab"
      disabled={disabled}
      title={title}
    >
      {label}
    </button>
  );
};

export default TabButton;