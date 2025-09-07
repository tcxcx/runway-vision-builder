/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import Header from './components/Header';
import ProductSelector from './components/ProductSelector';
import ModelSelector from './components/ModelSelector';
import SceneSelector from './components/SceneSelector';
import AccessorySelector from './components/AccessorySelector';
import PoseSelector from './components/PoseSelector';
import Spinner from './components/Spinner';
import { Product, Scene, Model, Accessory, Pose, GeneratedResult, GenerationState, Collection, StylistSuggestion } from './types';
import { 
  generateProductShot, 
  generateRunwayVideo, 
  pollVideoOperation, 
  getStylingSuggestions, 
  generateDescriptionForVideo, 
  createProductCutout,
  processUploadedModelImage
} from './services/geminiService';
import { INITIAL_PRODUCTS, INITIAL_MODELS, INITIAL_SCENES, INITIAL_ACCESSORIES, INITIAL_POSES } from './data';

// Helper to convert file to data URL
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};


function App() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [models, setModels] = useState<Model[]>(INITIAL_MODELS);
  const [scenes, setScenes] = useState<Scene[]>(INITIAL_SCENES);
  const [accessories, setAccessories] = useState<Accessory[]>(INITIAL_ACCESSORIES);
  const [poses, setPoses] = useState<Pose[]>(INITIAL_POSES);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedAccessories, setSelectedAccessories] = useState<Accessory[]>([]);
  const [selectedPose, setSelectedPose] = useState<Pose | null>(null);

  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [generationProgress, setGenerationProgress] = useState('');
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);
  
  const [isModelLockEnabled, setIsModelLockEnabled] = useState(false);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [stylingSuggestions, setStylingSuggestions] = useState<StylistSuggestion[]>([]);
  const [isStylistLoading, setIsStylistLoading] = useState(false);

  const [ecommerceMeta, setEcommerceMeta] = useState({ title: '', description: '', sku: '', tags: '' });

  const videoPollInterval = useRef<NodeJS.Timeout | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const isGenerationDisabled = !selectedProduct || !selectedModel || (!selectedScene && !selectedColor) || !selectedPose;

  useEffect(() => {
    // Automatically disable model lock if no single model is selected
    if (!selectedModel) {
      setIsModelLockEnabled(false);
    }
  }, [selectedModel]);

  const handleUploadAndProcessModel = async (file: File) => {
    const tempId = Date.now();
    const tempImageUrl = URL.createObjectURL(file);
    const tempModel = { id: tempId, name: 'Processing...', imageUrl: tempImageUrl, isCustom: true };
    
    setModels(prev => [...prev, tempModel]);

    try {
        const { imageUrl } = await processUploadedModelImage(tempImageUrl);
        const finalModel = { id: tempId, name: file.name.replace(/\.[^/.]+$/, ""), imageUrl, isCustom: true };
        setModels(prev => prev.map(m => m.id === tempId ? finalModel : m));
    } catch (error) {
        console.error("Error processing model image:", error);
        alert("Could not process the uploaded model image.");
        // Remove the temporary model on failure
        setModels(prev => prev.filter(m => m.id !== tempId));
    }
  };


  // Generic handler for adding a new item from an upload
  const handleAddItem = useCallback(async <T extends { id: number; name: string; imageUrl: string; isCustom?: boolean }>(
    file: File,
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    try {
      const imageUrl = await fileToDataUrl(file);
      const newItem = {
        id: Date.now(),
        name: file.name.replace(/\.[^/.]+$/, ""), // Use filename as name
        imageUrl,
        isCustom: true,
      } as T;
      setter(prevItems => [...prevItems, newItem]);
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Could not process the uploaded file.");
    }
  }, []);
  
  // Generic handler for adding a new AI-created item
  const handleItemCreated = useCallback(<T extends { id: number; name: string; imageUrl: string; isCustom?: boolean }>(
    name: string,
    imageUrl: string,
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    const newItem = {
      id: Date.now(),
      name,
      imageUrl,
      isCustom: true,
    } as T;
    setter(prevItems => [...prevItems, newItem]);
  }, []);

  // Generic handler for deleting a custom item
  const handleDeleteItem = useCallback(<T extends { id: number }>(
    id: number,
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    currentSelection: T | null,
    // FIX: Update the type for selectionSetter to correctly match React's state dispatch function type.
    selectionSetter: React.Dispatch<React.SetStateAction<T | null>>
  ) => {
    setter(prevItems => prevItems.filter(item => item.id !== id));
    if (currentSelection?.id === id) {
      selectionSetter(null);
    }
  }, []);

  const handleSelectAccessory = useCallback((accessory: Accessory) => {
    setSelectedAccessories(prev =>
      prev.some(a => a.id === accessory.id)
        ? prev.filter(a => a.id !== accessory.id)
        : [...prev, accessory]
    );
  }, []);
  
  const handleSelectScene = useCallback((scene: Scene) => {
    setSelectedScene(scene);
    setSelectedColor(null);
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
    setSelectedScene(null);
  }, []);

  const resetSelections = (isFullReset = true) => {
    if (isFullReset) {
      setSelectedProduct(null);
      setSelectedModel(null);
      setSelectedScene(null);
      setSelectedColor(null);
      setSelectedPose(null);
      setIsModelLockEnabled(false);
      setReferenceImageUrl(null);
    }
    setSelectedAccessories([]);
    setGeneratedResult(null);
    setGenerationState('idle');
    setGenerationProgress('');
  };
  
  const handleGenerate = async () => {
    if (isGenerationDisabled) return;

    setGenerationState('loading-image');
    setGenerationProgress('Generating product shot...');
    setGeneratedResult(null);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });

    try {
      const result = await generateProductShot({
        product: selectedProduct!,
        model: selectedModel!,
        scene: selectedScene,
        sceneColor: selectedColor,
        pose: selectedPose!,
        accessories: selectedAccessories,
        referenceImageUrl: isModelLockEnabled ? referenceImageUrl : null,
      });
      
      const newResult: GeneratedResult = { image: result.imageUrl };
      setGeneratedResult(newResult);
      if (isModelLockEnabled && !referenceImageUrl) {
        setReferenceImageUrl(result.imageUrl);
      }
      
      const selections = { product: selectedProduct, model: selectedModel, scene: selectedScene, color: selectedColor, accessories: selectedAccessories, pose: selectedPose };
      const newCollectionEntry: Collection = { id: Date.now(), timestamp: new Date(), result: newResult, selections };
      setCollections(prev => [newCollectionEntry, ...prev]);

      // Start video and cutout generation in parallel
      const videoPromise = (async () => {
        setGenerationState('loading-video-description');
        setGenerationProgress('Analyzing image for video prompt...');
        const description = await generateDescriptionForVideo(result.imageUrl);

        setGenerationState('loading-video');
        setGenerationProgress('Composing runway video (this can take a few minutes)...');
        const videoOperation = await generateRunwayVideo(result.imageUrl, description);
        
        newCollectionEntry.result.videoOperation = videoOperation;
        setGeneratedResult(prev => ({ ...prev, videoOperation }));
      })();

      const cutoutPromise = (async () => {
        setGenerationProgress('Creating product cutout...');
        const cutoutResult = await createProductCutout(result.imageUrl);
        newCollectionEntry.result.cutoutImage = cutoutResult.imageUrl;
        setGeneratedResult(prev => ({ ...prev, cutoutImage: cutoutResult.imageUrl }));
      })();

      await Promise.all([videoPromise, cutoutPromise]);

    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred.';
      setGeneratedResult({ error });
      setGenerationState('error');
    }
  };
  
  const handleDownloadZip = async () => {
    if (!generatedResult?.image) return;

    try {
      const zip = new JSZip();

      // 1. Add main image
      const imageBlob = await fetch(generatedResult.image).then(res => res.blob());
      zip.file("image-front.png", imageBlob);

      // 2. Add cutout image if it exists
      if (generatedResult.cutoutImage) {
        const cutoutBlob = await fetch(generatedResult.cutoutImage).then(res => res.blob());
        zip.file("cutout.png", cutoutBlob);
      }

      // 3. Add video if it exists
      if (generatedResult.video) {
        const videoBlob = await fetch(generatedResult.video).then(res => res.blob());
        zip.file("runway.mp4", videoBlob);
      }

      // 4. Add metadata
      const metadata = {
        title: ecommerceMeta.title,
        description: ecommerceMeta.description,
        sku: ecommerceMeta.sku,
        tags: ecommerceMeta.tags.split(',').map(t => t.trim()),
        generated_at: new Date().toISOString(),
      };
      zip.file("metadata.json", JSON.stringify(metadata, null, 2));

      // 5. Generate and download zip
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `VisionRunway-Product-Pack-${Date.now()}.zip`;
      link.click();

    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred while creating the ZIP file.';
      alert(`Could not create product pack: ${error}`);
    }
  };

  const handleGetSuggestions = async () => {
    setIsStylistLoading(true);
    setStylingSuggestions([]);
    try {
        const suggestions = await getStylingSuggestions({ products, models, scenes, accessories });
        setStylingSuggestions(suggestions);
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Could not get suggestions.';
        alert(error);
    } finally {
        setIsStylistLoading(false);
    }
  };
  
  const handleApplyAndGenerate = (suggestion: StylistSuggestion) => {
    const product = products.find(p => p.name === suggestion.productName);
    const model = models.find(m => m.name === suggestion.modelName);
    const scene = scenes.find(s => s.name === suggestion.sceneName);
    const suggestedAccessories = accessories.filter(a => suggestion.accessoryNames.includes(a.name));

    if (product && model && scene) {
        setSelectedProduct(product);
        setSelectedModel(model);
        setSelectedScene(scene);
        setSelectedColor(null);
        setSelectedAccessories(suggestedAccessories);
        // Let's pick a default pose, the first one
        if (poses.length > 0) {
            setSelectedPose(poses[0]);
        }
        // Use a timeout to ensure state updates before generation
        setTimeout(() => {
            handleGenerate();
        }, 100);
    } else {
        alert("Could not apply suggestion. Some items might have been deleted.");
    }
  };

  const pollVideo = useCallback(async () => {
    const currentResult = generatedResult;
    if (!currentResult?.videoOperation || currentResult.videoOperation.done) {
      if(videoPollInterval.current) clearInterval(videoPollInterval.current);
      return;
    }
    
    try {
      setGenerationProgress('Finalizing your video...');
      const updatedOp = await pollVideoOperation(currentResult.videoOperation);

      if (updatedOp.done) {
        if(videoPollInterval.current) clearInterval(videoPollInterval.current);
        const videoUri = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
          const videoUrl = `${videoUri}&key=${process.env.API_KEY}`;
          setGeneratedResult(prev => ({ ...prev, video: videoUrl, videoOperation: updatedOp }));
          setCollections(prev => prev.map(c => c.id === collections[0].id ? { ...c, result: { ...c.result, video: videoUrl, videoOperation: updatedOp } } : c));
          setGenerationState('success');
        } else {
          throw new Error("Video processing finished, but no video URL was found.");
        }
      } else {
        setGeneratedResult(prev => ({ ...prev, videoOperation: updatedOp }));
        setCollections(prev => prev.map(c => c.id === collections[0].id ? { ...c, result: { ...c.result, videoOperation: updatedOp } } : c));
      }
    } catch (err) {
      if(videoPollInterval.current) clearInterval(videoPollInterval.current);
      const error = err instanceof Error ? err.message : 'Failed to poll for video status.';
      setGeneratedResult(prev => ({ ...prev, error }));
      setGenerationState('error');
    }
  }, [generatedResult, collections]);

  useEffect(() => {
    if (generationState === 'loading-video') {
      videoPollInterval.current = setInterval(pollVideo, 10000);
    }
    return () => {
      if(videoPollInterval.current) clearInterval(videoPollInterval.current);
    };
  }, [generationState, pollVideo]);

  const renderResult = () => {
    if (generationState === 'idle') return null;

    const isLoading = generationState !== 'success' && generationState !== 'error';

    return (
      <div ref={resultsRef} className="w-full bg-white p-6 rounded-lg border border-zinc-200 shadow-sm text-center">
        {isLoading && (
          <>
            <Spinner />
            <p className="mt-4 text-zinc-600 font-semibold">{generationProgress}</p>
          </>
        )}
        
        {(generatedResult?.image) && (
          <div className="max-w-2xl mx-auto">
             <h3 className="text-2xl font-bold text-zinc-800 mb-4">{generationState === 'success' ? 'Your Vision, Realized' : 'Generated Photoshoot'}</h3>
            <img src={generatedResult.image} alt="Generated product shot" className="rounded-lg shadow-lg w-full mb-4" />
          </div>
        )}
        
        {generationState === 'success' && generatedResult.video && (
          <div className="max-w-2xl mx-auto mt-8">
            <video src={generatedResult.video} controls autoPlay loop muted className="w-full rounded-lg shadow-lg"></video>
            <p className="text-green-600 font-semibold mt-4">Success! Your assets are ready.</p>
          </div>
        )}

        {generationState === 'error' && (
          <div>
            <p className="text-red-600 font-bold">Generation Failed</p>
            <p className="text-zinc-600 mt-2">{generatedResult?.error || 'An unknown error occurred.'}</p>
          </div>
        )}

        {(generationState === 'success' || (generationState === 'error' && generatedResult?.image)) && (
            <div className="mt-8 space-y-6">
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => resetSelections(true)}
                        className="bg-zinc-800 text-white font-bold py-2 px-6 rounded-lg transition-colors hover:bg-zinc-900"
                    >
                        Start Over
                    </button>
                    {isModelLockEnabled && (
                        <button
                            onClick={() => resetSelections(false)}
                            className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-colors hover:bg-blue-700"
                        >
                            Create Another Look
                        </button>
                    )}
                </div>

                <div className="max-w-xl mx-auto bg-zinc-50 p-6 rounded-lg border border-zinc-200 text-left">
                  <h4 className="text-xl font-bold text-zinc-800 mb-4">E-commerce Product Pack</h4>
                  <div className="space-y-4">
                    <input type="text" placeholder="Product Title" value={ecommerceMeta.title} onChange={e => setEcommerceMeta({...ecommerceMeta, title: e.target.value})} className="w-full p-2 border rounded-md" />
                    <textarea placeholder="Product Description" value={ecommerceMeta.description} onChange={e => setEcommerceMeta({...ecommerceMeta, description: e.target.value})} className="w-full p-2 border rounded-md" rows={3}></textarea>
                    <div className="flex gap-4">
                      <input type="text" placeholder="SKU" value={ecommerceMeta.sku} onChange={e => setEcommerceMeta({...ecommerceMeta, sku: e.target.value})} className="w-full p-2 border rounded-md" />
                      <input type="text" placeholder="Tags (comma-separated)" value={ecommerceMeta.tags} onChange={e => setEcommerceMeta({...ecommerceMeta, tags: e.target.value})} className="w-full p-2 border rounded-md" />
                    </div>
                  </div>
                   {!generatedResult.cutoutImage && generationState !== 'error' && <p className="text-sm text-zinc-500 mt-4">Generating transparent cutout...</p>}
                  <button 
                    onClick={handleDownloadZip}
                    disabled={!generatedResult.cutoutImage}
                    className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg mt-4 transition-colors disabled:bg-zinc-300 hover:enabled:bg-green-700"
                  >
                    Download Product Pack (.zip)
                  </button>
                </div>
            </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <Header onLogoClick={() => resetSelections(true)} />
      <main className="container mx-auto p-4 md:p-8 space-y-8">
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            <div className="space-y-8">
                 <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-zinc-800 flex items-center">
                        <span className="bg-zinc-800 text-white rounded-full h-10 w-10 text-lg font-bold flex items-center justify-center mr-4">1</span>
                        Choose Clothing
                    </h2>
                    <ProductSelector
                      products={products}
                      selectedProducts={selectedProduct ? [selectedProduct] : []}
                      onSelectProduct={(p) => setSelectedProduct(curr => curr?.id === p.id ? null : p)}
                      onAddProduct={(file) => handleAddItem(file, setProducts)}
                      onProductCreated={(name, url) => handleItemCreated(name, url, setProducts)}
                      onDeleteProduct={(id) => handleDeleteItem(id, setProducts, selectedProduct, setSelectedProduct)}
                    />
                </section>
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-zinc-800 flex items-center">
                        <span className="bg-zinc-800 text-white rounded-full h-10 w-10 text-lg font-bold flex items-center justify-center mr-4">2</span>
                        Add Accessories (Optional)
                    </h2>
                    <AccessorySelector
                      accessories={accessories}
                      selectedAccessories={selectedAccessories}
                      onSelectAccessory={handleSelectAccessory}
                      onAddAccessory={(file) => handleAddItem(file, setAccessories)}
                      onAccessoryCreated={(name, url) => handleItemCreated(name, url, setAccessories)}
                      onDeleteAccessory={(id) => {
                        setAccessories(prev => prev.filter(item => item.id !== id));
                        setSelectedAccessories(prev => prev.filter(item => item.id !== id));
                      }}
                    />
                </section>
            </div>
            <div className="space-y-8">
                 <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-zinc-800 flex items-center">
                        <span className="bg-zinc-800 text-white rounded-full h-10 w-10 text-lg font-bold flex items-center justify-center mr-4">3</span>
                        Select a Model
                    </h2>
                      <ModelSelector
                        models={models}
                        selectedModels={selectedModel ? [selectedModel] : []}
                        onSelectModel={(m) => setSelectedModel(curr => curr?.id === m.id ? null : m)}
                        onUploadAndProcessModel={handleUploadAndProcessModel}
                        onModelCreated={(name, url) => handleItemCreated(name, url, setModels)}
                        onDeleteModel={(id) => handleDeleteItem(id, setModels, selectedModel, setSelectedModel)}
                      />
                </section>
                 <section className="space-y-4">
                     <PoseSelector
                      poses={poses}
                      selectedPose={selectedPose}
                      onSelectPose={(p) => setSelectedPose(curr => curr?.id === p.id ? null : p)}
                    />
                </section>
            </div>
        </div>

        <section className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-800 flex items-center">
                <span className="bg-zinc-800 text-white rounded-full h-10 w-10 text-lg font-bold flex items-center justify-center mr-4">5</span>
                Pick a Scene
            </h2>
            <SceneSelector
                scenes={scenes}
                selectedScene={selectedScene}
                onSelectScene={handleSelectScene}
                selectedColor={selectedColor}
                onColorChange={handleColorChange}
                onAddScene={(file) => handleAddItem(file, setScenes)}
                onSceneCreated={(name, url) => handleItemCreated(name, url, setScenes)}
                onDeleteScene={(id) => handleDeleteItem(id, setScenes, selectedScene, setSelectedScene)}
              />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
             <div className="w-full bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-800 mb-4">AI Stylist Assistant</h3>
                <p className="text-zinc-600 mb-4">Need inspiration? Let our AI stylist suggest some creative looks for you based on your current catalogue.</p>
                <button
                    onClick={handleGetSuggestions}
                    disabled={isStylistLoading}
                    className="w-full bg-zinc-800 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-zinc-300 hover:enabled:bg-zinc-900"
                >
                    {isStylistLoading ? 'Thinking...' : 'Suggest Outfits'}
                </button>
                {stylingSuggestions.length > 0 && (
                    <div className="mt-4 space-y-3">
                        {stylingSuggestions.map((suggestion, index) => (
                            <div key={index} className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                                <p className="font-semibold text-zinc-700">Suggestion {index + 1}: <span className="font-normal">{suggestion.description}</span></p>
                                <button
                                    onClick={() => handleApplyAndGenerate(suggestion)}
                                    className="text-sm text-blue-600 font-semibold hover:underline mt-1"
                                >
                                    Generate This Look
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="w-full bg-white p-6 rounded-lg border border-zinc-200 shadow-sm text-center">
                 <h3 className="text-lg font-semibold text-zinc-800 mb-4">Final Step: Generate</h3>
                <div className="flex items-center justify-center gap-4 mb-4">
                    <label htmlFor="model-lock" className="flex items-center cursor-pointer text-zinc-600 font-semibold">
                        <input
                            type="checkbox"
                            id="model-lock"
                            checked={isModelLockEnabled}
                            onChange={(e) => setIsModelLockEnabled(e.target.checked)}
                            disabled={!selectedModel}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="ml-2">Model Lock</span>
                    </label>
                </div>

                <button 
                    onClick={handleGenerate} 
                    disabled={isGenerationDisabled || generationState.startsWith('loading')}
                    className="bg-blue-600 text-white font-extrabold text-xl py-4 px-12 rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:bg-zinc-300 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
                >
                    {generationState.startsWith('loading') ? 'Generating...' : '✨ Generate My Vision ✨'}
                </button>
                {isGenerationDisabled && <p className="text-zinc-500 mt-2 text-sm">Please select a product, model, scene/color, and pose to begin.</p>}
            </div>
        </div>

        {renderResult()}
        
        {collections.length > 0 && (
            <section className="space-y-4">
                <h2 className="text-2xl font-bold text-zinc-800">My Lookbook</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map(collection => (
                        <div key={collection.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                            <img src={collection.result.image} alt="Generated look" className="w-full h-64 object-cover" />
                            <div className="p-4">
                                <p className="text-sm text-zinc-500">{collection.timestamp.toLocaleString()}</p>
                                {collection.result.video && <a href={collection.result.video} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Video</a>}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        )}

      </main>
      <footer className="text-center p-8 text-zinc-500 text-sm">
        <p>Powered by Google Gemini. © 2024 VisionRunway Inc.</p>
      </footer>
    </div>
  );
}

export default App;