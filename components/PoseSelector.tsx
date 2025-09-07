/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
// FIX: Import Pose type to resolve module errors.
import { Pose } from '../types';
import HoverCard from './HoverCard';

interface PoseSelectorProps {
  poses: Pose[];
  selectedPose: Pose | null;
  onSelectPose: (pose: Pose) => void;
  customPosePrompt: string;
  onCustomPosePromptChange: (prompt: string) => void;
}

const PoseSelector: React.FC<PoseSelectorProps> = ({ poses, selectedPose, onSelectPose, customPosePrompt, onCustomPosePromptChange }) => {
  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">5. Select Pose</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {poses.map((pose) => (
          <HoverCard
            key={pose.id}
            trigger={
              <div
                onClick={() => onSelectPose(pose)}
                className={`
                  relative bg-[var(--background-tertiary)] rounded-lg overflow-hidden transition-all duration-200 border-2 cursor-pointer h-full
                  ${selectedPose?.id === pose.id ? 'border-[var(--accent-blue)] scale-105 shadow-[0_0_15px_var(--shadow-blue)]' : 'border-transparent hover:border-[var(--accent-magenta)] hover:scale-105 hover:shadow-[0_0_15px_var(--shadow-magenta)]'}
                `}
                title={pose.name}
              >
                <div className="aspect-square w-full bg-[var(--background-secondary)] flex items-center justify-center p-2">
                  <img src={pose.imageUrl} alt={pose.name} className="w-full h-full object-contain" />
                </div>
                <div className="p-2 text-center bg-[var(--background-tertiary)]">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate">{pose.name}</h4>
                </div>
              </div>
            }
            content={
              <div className="p-3 text-sm text-[var(--text-primary)]">
                {pose.prompt}
              </div>
            }
          />
        ))}
      </div>
      {selectedPose?.name === 'Custom' && (
        <div className="mt-4">
          <label htmlFor="custom-pose-prompt" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Custom Pose Prompt
          </label>
          <textarea
            id="custom-pose-prompt"
            value={customPosePrompt}
            onChange={(e) => onCustomPosePromptChange(e.target.value)}
            placeholder="e.g., jumping in the air with excitement"
            className="w-full p-2 bg-[var(--background-secondary)] border border-[var(--border-tertiary)] rounded-md focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] text-[var(--text-primary)]"
            rows={3}
          />
        </div>
      )}
    </div>
  );
};

export default PoseSelector;