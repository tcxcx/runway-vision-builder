/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { Pose } from '../types';
import Tooltip from './Tooltip';

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
          <Tooltip key={pose.id} text={pose.prompt || ''} position="top">
            <button
              onClick={() => onSelectPose(pose)}
              className={`
                w-full h-full p-4 rounded-lg border-2 text-center font-semibold transition-all duration-200
                ${selectedPose?.id === pose.id ? 'bg-[var(--accent-blue)] text-[var(--text-inverted)] border-[var(--accent-blue)] scale-105 shadow-[0_0_15px_var(--shadow-blue)]' : 'bg-[var(--background-tertiary)] text-[var(--text-primary)] border-transparent hover:border-[var(--accent-magenta)]'}
              `}
            >
              {pose.name}
            </button>
          </Tooltip>
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