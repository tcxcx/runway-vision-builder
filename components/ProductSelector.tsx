/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useState } from 'react';
import ObjectCard from './ObjectCard';
import TabButton from './TabButton';
import Spinner from './Spinner';
import { Product } from '../types';
import { generateClothingItem } from '../services/geminiService';

interface ProductSelectorProps {
  products: Product[];
  selectedProducts: Product[];
  onSelectProduct: (product: Product) => void;
  onAddProduct: (file: File) => void;
  onDeleteProduct: (id: number) => void;
  onProductCreated: (name: string, imageUrl: string) => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ products, selectedProducts, onSelectProduct, onAddProduct, onDeleteProduct, onProductCreated }) => {
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
      const result = await generateClothingItem(prompt);
      setGeneratedImageUrl(result.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGenerated = () => {
    if (generatedImageUrl) {
      onProductCreated(prompt, generatedImageUrl);
      setPrompt('');
      setGeneratedImageUrl(null);
      setActiveTab('catalogue');
    }
  };
  
  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onAddProduct(file);
      setActiveTab('catalogue');
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />
      <div className="flex border-b border-[var(--border-secondary)] mb-4">
        <TabButton label="Catalogue" isActive={activeTab === 'catalogue'} onClick={() => setActiveTab('catalogue')} />
        <TabButton label="Create with AI" isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} />
        <TabButton label="Upload" isActive={activeTab === 'upload'} onClick={triggerFileUpload} />
      </div>

      {activeTab === 'catalogue' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <ObjectCard
              key={product.id}
              item={product}
              isSelected={selectedProducts.some(p => p.id === product.id)}
              onClick={() => onSelectProduct(product)}
              onDelete={product.isCustom ? onDeleteProduct : undefined}
            />
          ))}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., a blue silk bomber jacket with gold embroidery"
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
              <img src={generatedImageUrl} alt="Generated clothing item" className="w-full aspect-square object-contain rounded-md border border-[var(--border-secondary)] bg-[var(--background-primary)]" />
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

export default ProductSelector;