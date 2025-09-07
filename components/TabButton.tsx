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
  const baseClasses = "flex-1 px-3 py-2 text-sm font-bold text-center transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";
  const activeClasses = "bg-zinc-800 text-white shadow";
  const inactiveClasses = "bg-zinc-200 text-zinc-600 hover:bg-zinc-300";
  const disabledClasses = "bg-zinc-100 text-zinc-400 cursor-not-allowed";

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