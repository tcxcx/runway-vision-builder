/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useState } from 'react';
import ObjectCard from './ObjectCard';
import TabButton from './TabButton';
import Spinner from './Spinner';
import { Accessory } from '../types';
import { generateAccessory } from '../services/geminiService';

interface AccessorySelectorProps {
  accessories: Accessory[];
  selectedAccessories: Accessory[];
  onSelectAccessory: (accessory: Accessory) => void;
  onAddAccessory: (file: File) => void;
  onDeleteAccessory: (id: number) => void;
  onAccessoryCreated: (name: string, imageUrl: string) => void;
}

const AccessorySelector: React.FC<AccessorySelectorProps> = ({ accessories, selectedAccessories, onSelectAccessory, onAddAccessory, onDeleteAccessory, onAccessoryCreated }) => {
  const [activeTab, setActiveTab] = useState<'catalogue' | 'create' | 'upload'>('catalogue');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);
    try {
      const result = await generateAccessory(prompt);
      setGeneratedImageUrl(result.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGenerated = () => {
    if (generatedImageUrl) {
      onAccessoryCreated(prompt, generatedImageUrl);
      setPrompt('');
      setGeneratedImageUrl(null);
      setActiveTab('catalogue');
    }
  };
  
  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onAddAccessory(file);
      setActiveTab('catalogue');
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />
      <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg mb-4">
        <TabButton label="Catalogue" isActive={activeTab === 'catalogue'} onClick={() => setActiveTab('catalogue')} />
        <TabButton label="Create with AI" isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} />
        <TabButton label="Upload Image" isActive={activeTab === 'upload'} onClick={triggerFileUpload} />
      </div>

      {activeTab === 'catalogue' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {accessories.map((accessory) => (
            <ObjectCard
              key={accessory.id}
              item={accessory}
              isSelected={selectedAccessories.some(a => a.id === accessory.id)}
              onClick={() => onSelectAccessory(accessory)}
              onDelete={accessory.isCustom ? onDeleteAccessory : undefined}
            />
          ))}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., a pair of futuristic silver sunglasses"
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
              <img src={generatedImageUrl} alt="Generated accessory" className="w-full aspect-square object-contain rounded-md border bg-zinc-100" />
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

export default AccessorySelector;