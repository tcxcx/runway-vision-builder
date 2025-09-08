/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Product, Model, Scene, Accessory, Pose } from './types';

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_MODELS: Model[] = [];

export const INITIAL_SCENES: Scene[] = [];

export const INITIAL_ACCESSORIES: Accessory[] = [];

export const INITIAL_POSES: Pose[] = [
    { id: 1, name: 'Standing', imageUrl: './assets/gallery/pose-standing.png', prompt: 'A classic, neutral standing pose, facing forward with a relaxed posture. Standard for e-commerce.' },
    { id: 2, name: 'Walking', imageUrl: './assets/gallery/pose-walking.png', prompt: 'A dynamic walking pose, capturing natural movement and the flow of the clothing. One leg forward.' },
    { id: 3, name: 'Editorial', imageUrl: './assets/gallery/pose-editorial.png', prompt: 'A high-fashion, expressive pose. More artistic and stylized, suitable for a magazine spread.' },
    { id: 4, name: 'Custom', imageUrl: './assets/gallery/pose-custom.png', prompt: 'A dynamic, high-fashion pose with attitude. The model should look confident and powerful.' },
];