/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
// FIX: Import Pose type to resolve module errors.
import { Pose } from '../types';

interface PoseSelectorProps {
  poses: Pose[];
  selectedPose: Pose | null;
  onSelectPose: (pose: Pose) => void;
}

const PoseSelector: React.FC<PoseSelectorProps> = ({ poses, selectedPose, onSelectPose }) => {
  return (
    <div className="w-full bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-800 mb-4 flex items-center">
        <span className="bg-zinc-800 text-white rounded-full h-8 w-8 text-sm font-bold flex items-center justify-center mr-3">4</span>
        Select Pose
      </h3>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {poses.map((pose) => (
          <div
            key={pose.id}
            onClick={() => onSelectPose(pose)}
            className={`
              relative bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 cursor-pointer
              hover:shadow-xl hover:scale-105
              ${selectedPose?.id === pose.id ? 'border-2 border-blue-500 shadow-xl scale-105' : 'border border-zinc-200'}
            `}
            title={pose.name}
          >
            <div className="aspect-square w-full bg-zinc-100 flex items-center justify-center p-2">
              <img src={pose.imageUrl} alt={pose.name} className="w-full h-full object-contain" />
            </div>
            <div className="p-2 text-center bg-white">
              <h4 className="text-xs font-semibold text-zinc-700 truncate">{pose.name}</h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PoseSelector;
