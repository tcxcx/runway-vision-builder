/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Product, Model, Scene, Accessory, Pose } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: 'Denim Jacket', imageUrl: './assets/gallery/product-denim-jacket.png' },
  { id: 2, name: 'White T-Shirt', imageUrl: './assets/gallery/product-white-tshirt.png' },
  { id: 3, name: 'Leather Boots', imageUrl: './assets/gallery/product-leather-boots.png' },
];

export const INITIAL_MODELS: Model[] = [
  { id: 1, name: 'Model Ava', imageUrl: './assets/gallery/model-ava.jpg' },
  { id: 2, name: 'Model Chloe', imageUrl: './assets/gallery/model-chloe.jpg' },
  { id: 3, name: 'Model Alex', imageUrl: './assets/gallery/model-alex.jpg' },
];

export const INITIAL_SCENES: Scene[] = [
  { id: 1, name: 'Mountain View', imageUrl: './assets/gallery/scene-mountain.jpg' },
  { id: 2, name: 'City Street', imageUrl: './assets/gallery/scene-city.jpg' },
  { id: 3, name: 'Beach Sunset', imageUrl: './assets/gallery/scene-beach.jpg' },
];

export const INITIAL_ACCESSORIES: Accessory[] = [
    { id: 1, name: 'Sunglasses', imageUrl: './assets/gallery/accessory-sunglasses.png' },
    { id: 2, name: 'Handbag', imageUrl: './assets/gallery/accessory-handbag.png' },
    { id: 3, name: 'Watch', imageUrl: './assets/gallery/accessory-watch.png' },
];

export const INITIAL_POSES: Pose[] = [
    { id: 1, name: 'Standing', imageUrl: './assets/gallery/pose-standing.png', prompt: 'A classic, neutral standing pose, facing forward with a relaxed posture. Standard for e-commerce.' },
    { id: 2, name: 'Walking', imageUrl: './assets/gallery/pose-walking.png', prompt: 'A dynamic walking pose, capturing natural movement and the flow of the clothing. One leg forward.' },
    { id: 3, name: 'Editorial', imageUrl: './assets/gallery/pose-editorial.png', prompt: 'A high-fashion, expressive pose. More artistic and stylized, suitable for a magazine spread.' },
    { id: 4, name: 'Custom', imageUrl: './assets/gallery/pose-custom.png', prompt: 'A dynamic, high-fashion pose with attitude. The model should look confident and powerful.' },
];