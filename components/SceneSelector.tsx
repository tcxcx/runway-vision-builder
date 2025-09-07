/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import ObjectCard from './ObjectCard';
import TabButton from './TabButton';
import Spinner from './Spinner';
import { Scene } from '../types';
import { generateScene } from '../services/geminiService';

interface SceneSelectorProps {
  scenes: Scene[];
  selectedScene: Scene | null;
  onSelectScene: (scene: Scene) => void;
  selectedColor: string | null;
  onColorChange: (color: string) => void;
  onAddScene: (file: File) => void;
  onSceneCreated: (name: string, imageUrl: string) => void;
  onDeleteScene: (id: number) => void;
}

type ActiveTab = 'catalogue' | 'create' | 'upload';

const SceneSelector: React.FC<SceneSelectorProps> = ({ 
  scenes, 
  selectedScene, 
  onSelectScene, 
  selectedColor,
  onColorChange,
  onAddScene, 
  onSceneCreated, 
  onDeleteScene 
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalogue');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);
    try {
      const result = await generateScene(prompt);
      if (result.imageUrl) {
        setGeneratedImageUrl(result.imageUrl);
      } else {
        throw new Error("The model did not return an image.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGenerated = () => {
    if (generatedImageUrl) {
      onSceneCreated(prompt, generatedImageUrl);
      setPrompt('');
      setGeneratedImageUrl(null);
      setActiveTab('catalogue');
    }
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onAddScene(file);
      setActiveTab('catalogue');
    }
  };

  return (
    <div className="w-full">
       <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept="image/png, image/jpeg, image/webp" className="hidden" />
      <div className="flex border-b border-[var(--border-secondary)] mb-4">
        <TabButton label="Catalogue" isActive={activeTab === 'catalogue'} onClick={() => setActiveTab('catalogue')} />
        <TabButton label="Create with AI" isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} />
        <TabButton label="Upload" isActive={activeTab === 'upload'} onClick={() => fileInputRef.current?.click()} />
      </div>

      {activeTab === 'catalogue' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div 
            onClick={() => onColorChange(selectedColor || '#1A1A1A')}
            className={`
              relative bg-[var(--background-tertiary)] rounded-lg overflow-hidden transition-all duration-200 border-2 cursor-pointer
              ${selectedColor ? 'border-[var(--accent-blue)] scale-105 shadow-[0_0_15px_var(--shadow-blue)]' : 'border-transparent hover:border-[var(--accent-magenta)] hover:scale-105 hover:shadow-[0_0_15px_var(--shadow-magenta)]'}
            `}
          >
            <div className="aspect-square w-full bg-[var(--background-secondary)] flex items-center justify-center p-2">
                <input 
                    type="color" 
                    value={selectedColor || '#1A1A1A'} 
                    onChange={(e) => onColorChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="color-picker-swatch"
                    aria-label="Select a solid color background"
                />
            </div>
            <div className="p-3 text-center bg-[var(--background-tertiary)]">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">Solid Color</h4>
            </div>
          </div>

          {scenes.map((scene) => (
            <ObjectCard
              key={scene.id}
              item={scene} 
              isSelected={selectedScene?.id === scene.id}
              onClick={() => onSelectScene(scene)}
              onDelete={scene.isCustom ? onDeleteScene : undefined}
            />
          ))}
        </div>
      )}
      
      {activeTab === 'create' && (
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., a futuristic neon-lit city street"
            className="w-full p-2 bg-[var(--background-secondary)] border border-[var(--border-tertiary)] rounded-md focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] text-[var(--text-primary)]"
            rows={3}
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt}
            className="w-full bg-[var(--accent-blue)] text-[var(--text-button)] font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--disabled-bg)] disabled:text-[var(--disabled-text)] hover:enabled:bg-white"
          >
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
          
          {isLoading && <Spinner />}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          
          {generatedImageUrl && (
            <div className="space-y-2 text-center">
              <img src={generatedImageUrl} alt="Generated scene" className="w-full aspect-video object-cover rounded-md border border-[var(--border-secondary)]" />
              <button
                onClick={handleSaveGenerated}
                className="w-full bg-[var(--accent-blue)] text-[var(--text-button)] font-bold py-2 px-4 rounded-lg hover:bg-white"
              >
                Save to Catalogue
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SceneSelector;