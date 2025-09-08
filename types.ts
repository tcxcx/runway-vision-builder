/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// FIX: Add export keyword to interfaces to make them importable modules.

// A generic item with common properties for all selectable objects.
export interface BaseItem {
  id: number;
  name: string;
  imageUrl: string;
  isCustom?: boolean;
}

// Specific types for each category, extending the base item.
export interface Product extends BaseItem {}
export interface Scene extends BaseItem {}
export interface Model extends BaseItem {}
export interface Accessory extends BaseItem {}
export interface Pose extends BaseItem {
  prompt?: string;
}

// Type for a saved collection in the Lookbook.
export interface Collection {
    id: number;
    timestamp: Date;
    result: GeneratedResult[];
    selections: {
        products: Product[];
        models: Model[];
        scene: Scene | null;
        color: string | null;
        accessories: Accessory[];
        pose: Pose | null;
    }
}

// Type for a recommendation from the AI Stylist.
export interface StylistSuggestion {
  description: string;
  productNames: string[];
  modelName: string;
  sceneName: string;
  accessoryNames: string[];
}


// Type for the generated result from the final composition.
export interface GeneratedResult {
    model: Model;
    images: { angle: string; image: string; }[];
    representativeImage: string; // Used as the base for video generation
    activeDisplayUrl?: string; // The URL of the currently displayed image or video in the gallery
    aspectRatio: '9:16' | '16:9';
    videoPrompt?: string;

    // Preview
    previewVideo?: string;
    previewVideoOperation?: any;
    isPreviewLoading?: boolean;
    previewError?: string;
    previewVideoDirectLink?: string;

    // Final Video
    finalVideo?: string;
    finalVideoOperation?: any;
    isFinalLoading?: boolean;
    finalError?: string;
    finalVideoDirectLink?: string;

    // General image generation error
    error?: string;
}

// Type for the state of the generation process.
export type GenerationState = 'idle' | 'loading-image' | 'image-success' | 'error';