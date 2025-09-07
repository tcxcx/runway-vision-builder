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
    <div className="w-full bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/png, image/jpeg"
        className="hidden"
      />
      <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg mb-4">
        <TabButton label="Catalogue" isActive={activeTab === 'catalogue'} onClick={() => setActiveTab('catalogue')} />
        <TabButton label="Create with AI" isActive={activeTab === 'create'} onClick={() => setActiveTab('create')} />
        <TabButton label="Upload Image" isActive={activeTab === 'upload'} onClick={triggerFileUpload} />
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
              <img src={generatedImageUrl} alt="Generated clothing item" className="w-full aspect-square object-contain rounded-md border bg-zinc-100" />
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

export default ProductSelector;