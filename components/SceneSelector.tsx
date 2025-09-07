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
    <div className="w-full bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
       <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept="image/png, image/jpeg" className="hidden" />
      <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg mb-4">
        <TabButton label="Catalogue" isActive={activeTab === 'catalogue'} onClick={() => setActiveTab('catalogue')} />
        <TabButton label="Create with AI" isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} />
        <TabButton label="Upload Image" isActive={activeTab === 'upload'} onClick={() => fileInputRef.current?.click()} />
      </div>

      {activeTab === 'catalogue' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div 
            className={`
              relative bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300
              ${selectedColor ? 'border-2 border-blue-500 shadow-xl scale-105' : 'border border-zinc-200'}
            `}
          >
            <label htmlFor="color-picker" className="cursor-pointer">
              <div className="aspect-square w-full bg-zinc-100 flex items-center justify-center">
                  <input 
                      id="color-picker"
                      type="color" 
                      value={selectedColor || '#ffffff'} 
                      onChange={(e) => onColorChange(e.target.value)}
                      className="color-picker-swatch"
                  />
              </div>
              <div className="p-3 text-center">
                  <h4 className="text-sm font-semibold text-zinc-700 truncate">Solid Color</h4>
              </div>
            </label>
          </div>

          {scenes.map((scene) => (
            <ObjectCard
              key={scene.id}
              item={scene} 
              isSelected={selectedScene?.id === scene.id && !selectedColor}
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
            className="w-full p-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt}
            className="w-full bg-zinc-800 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-zinc-300 hover:enabled:bg-zinc-900"
          >
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
          
          {isLoading && <Spinner />}
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          
          {generatedImageUrl && (
            <div className="space-y-2 text-center">
              <img src={generatedImageUrl} alt="Generated scene" className="w-full aspect-video object-cover rounded-md border" />
              <button
                onClick={handleSaveGenerated}
                className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"
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
