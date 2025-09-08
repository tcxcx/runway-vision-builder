/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// FIX: Implement the geminiService module to provide AI generation capabilities.
import { GoogleGenAI, Modality } from "@google/genai";
import { Model, Product, Scene, Accessory, Pose } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert data URL to a Gemini Part object
const dataUrlToImagePart = (dataUrl: string) => {
    const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.*)$/);
    if (!match) {
        throw new Error('Invalid data URL format');
    }
    const mimeType = match[1];
    const data = match[2];
    return {
        inlineData: {
            mimeType,
            data,
        },
    };
};

// Generic image generation function
const generateImage = async (prompt: string, aspectRatio: '1:1' | '3:4' | '4:3' = '1:1') => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio,
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return { imageUrl: `data:image/png;base64,${base64ImageBytes}` };
        } else {
            throw new Error("Image generation failed, no images returned.");
        }
    } catch (error) {
        console.error("Error in generateImage:", error);
        throw new Error(`Failed to generate image. Please try again. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
};


export const generateClothingItem = (prompt: string) => generateImage(`A professional, clean, high-resolution photo of a single clothing item, '${prompt}', on a pure white background. The item should be perfectly lit and displayed flat or on an invisible mannequin. E-commerce style.`, '1:1');
export const generateAccessory = (prompt: string) => generateImage(`A professional, clean, high-resolution studio photo of a single fashion accessory, '${prompt}', on a pure white background. The item should be perfectly lit and sharply focused. E-commerce style.`, '1:1');
export const generateScene = (prompt: string) => generateImage(`A beautiful, high-resolution, photorealistic background scene for a fashion photoshoot. The scene is '${prompt}'. The lighting should be flattering for a model. There should be no people or prominent characters in the scene.`, '4:3');
export const generateModel = (prompt: string) => generateImage(`A full-body, professional fashion model photo. The model is '${prompt}'. They are standing against a solid, neutral gray studio background. The photo is photorealistic and high-resolution.`, '3:4');

export const removeBackground = async (imageDataUrl: string) => {
    try {
        const imagePart = dataUrlToImagePart(imageDataUrl);
        const promptPart = { text: "Segment the person from the background. Make the background fully transparent." };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, promptPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        throw new Error("Model did not return an image after background removal.");
    } catch (error) {
        console.error("Error in removeBackground:", error);
        throw new Error(`Failed to remove background. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const composeFinalImage = async (
    models: Model[],
    products: Product[],
    scene: Scene | null,
    accessories: Accessory[],
    pose: Pose,
    customPosePrompt: string,
    backgroundColor: string | null
): Promise<{ images: { angle: string, image: string }[], model: Model }[]> => {
    try {
        const results = [];
        const angles = ['Front View', 'Three-Quarter View', 'Side View'];

        for (const model of models) {
            const modelImages = [];
            
            for (const angle of angles) {
                const parts: any[] = [];
                
                if (scene) {
                    parts.push(dataUrlToImagePart(scene.imageUrl));
                    parts.push({ text: `The background is the provided scene image. Place the model seamlessly within this environment.` });
                } else if (backgroundColor) {
                    parts.push({ text: `The background must be a solid color: ${backgroundColor}.` });
                } else {
                     parts.push({ text: `The background must be a solid, neutral light gray color.` });
                }

                parts.push(dataUrlToImagePart(model.imageUrl));
                
                const productNames = products.map(p => p.name).join(', ');
                for (const product of products) {
                    parts.push(dataUrlToImagePart(product.imageUrl));
                }

                const accessoryNames = accessories.map(a => a.name).join(', ');
                 if (accessories.length > 0) {
                    for (const accessory of accessories) {
                        parts.push(dataUrlToImagePart(accessory.imageUrl));
                    }
                }
                
                const posePrompt = pose.name === 'Custom' ? customPosePrompt : pose.prompt;
                
                const promptLines = [
                    '**Objective:** Create a single, ultra-realistic, professional fashion photograph.',
                    `**Angle:** The camera angle for the shot must be: **${angle}**.`,
                    '**Model:** The primary subject is the provided model image.',
                    `**Clothing:** The model must be dressed in the following clothing items: ${productNames}. The clothes must fit the model perfectly and look natural.`,
                ];

                if (accessories.length > 0) {
                    promptLines.push(`**Accessories:** The model must also be wearing or holding these accessories: ${accessoryNames}.`);
                }

                promptLines.push(`**Pose:** The model's pose should be exactly as described: "${posePrompt}".`);
                promptLines.push('**Instructions:**');

                const instruction2 = accessories.length > 0
                    ? '2. Do NOT show any of the original clothing from the model image. The model must ONLY wear the provided clothing items and accessories.'
                    : '2. Do NOT show any of the original clothing from the model image. The model must ONLY wear the provided clothing items.';

                promptLines.push(
                    '1. Combine all provided images into one cohesive, photorealistic image.',
                    instruction2,
                    '3. The final image should look like a real photograph from a high-end fashion campaign. Pay close attention to lighting, shadows, and textures to ensure realism.',
                    "4. Maintain the model's likeness, hair, and face from their original image. This is the most important rule."
                );

                promptLines.push(
                    '**Negative Constraints (Things to AVOID):**',
                    '- DO NOT change the model\'s face, ethnicity, or body type.',
                    '- DO NOT generate distorted or unrealistic body parts (e.g., hands, limbs).',
                    '- DO NOT add any text, logos, or watermarks to the image.',
                    '- DO NOT produce a blurry, low-resolution, or cartoonish image. The output must be photorealistic.'
                );
                
                parts.push({ text: promptLines.join('\n') });
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image-preview',
                    contents: { parts },
                     config: {
                        responseModalities: [Modality.IMAGE, Modality.TEXT],
                    },
                });
                
                let foundImage = false;
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        const base64ImageBytes: string = part.inlineData.data;
                        modelImages.push({ angle, image: `data:image/png;base64,${base64ImageBytes}` });
                        foundImage = true;
                        break; 
                    }
                }
                 if (!foundImage) {
                    console.warn(`Image generation failed for model ${model.name} at angle ${angle}.`);
                 }
            }
            
            if (modelImages.length > 0) {
                results.push({ images: modelImages, model });
            } else {
                 throw new Error(`Image composition failed for model ${model.name}. The model did not return any images.`);
            }
        }
        return results;

    } catch (error) {
        console.error("Error in composeFinalImage:", error);
        throw new Error(`Failed to compose image. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
};


export const generateVideoDescription = async (
    composedImage: string,
    model: Model,
    products: Product[],
    accessories: Accessory[],
    scene: Scene | null
): Promise<string> => {
    try {
        const productNames = products.map(p => p.name).join(', ');
        const accessoryNames = accessories.map(a => a.name).join(', ');
        const sceneName = scene ? `in the scene '${scene.name}'` : 'in a studio setting';

        const promptText = `**Primary Goal:** Create a short, compelling video prompt (20-30 words).

**CONTEXT:**
You are given several source images:
1.  An **original model**.
2.  Clothing items: ${productNames}.
3.  ${accessories.length > 0 ? `Accessories: ${accessoryNames}.` : ''}
4.  A final **composed image** showing the model wearing everything ${sceneName}.

**TASK:**
Write a prompt to generate a video. The video should show the model walking a runway or moving cinematically.

**CRUCIAL INSTRUCTIONS:**
-   Your description MUST be faithful to the **original model's key features** (e.g., "A blonde model...", "A model with short dark hair..."). Use the original model image as the ground truth for their appearance.
-   Describe the ACTION based on the final composed image and scene. Focus on movement, the flow of the clothing, and the atmosphere.
-   Do not just list the items. Create a vivid, actionable scene description.`;

        const parts: any[] = [
            dataUrlToImagePart(model.imageUrl), // Original model is key context
            ...products.map(p => dataUrlToImagePart(p.imageUrl)),
            ...accessories.map(a => dataUrlToImagePart(a.imageUrl)),
            dataUrlToImagePart(composedImage), // Final composed shot for action context
            { text: promptText }
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error in generateVideoDescription:", error);
        throw new Error(`Failed to generate video description. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
};

const generateVideoBase = async (
    videoPrompt: string, 
    composedImage: string,
    config: any = {}
) => {
    const imagePart = dataUrlToImagePart(composedImage);
        
    const finalPrompt = `**Critical requirement: The person in the video MUST be an identical match to the person in the reference image.** Preserve their face, hair, and physical features perfectly. The video should bring this exact person to life.
      
Video prompt: "${videoPrompt}"`;

    return ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: finalPrompt,
        image: {
            imageBytes: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
        },
        config: {
            numberOfVideos: 1,
            negativePrompt: "Do not change the model’s face, hair, or outfit. Do not generate a different person.",
            ...config
        }
    });
};

export const generateVideoPreview = async (videoPrompt: string, composedImage: string) => {
    try {
        return await generateVideoBase(videoPrompt, composedImage, { durationSeconds: 5 });
    } catch (error) {
        console.error("Error in generateVideoPreview:", error);
        throw new Error(`Failed to start video preview generation. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const generateFinalVideo = async (videoPrompt: string, composedImage: string) => {
    try {
        return await generateVideoBase(videoPrompt, composedImage, { durationSeconds: 8 });
    } catch (error) {
        console.error("Error in generateFinalVideo:", error);
        throw new Error(`Failed to start final video generation. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const checkVideoStatus = async (operation: any) => {
    try {
        const updatedOperation = await ai.operations.getVideosOperation({ operation });
        if (updatedOperation.done && updatedOperation.response?.generatedVideos?.[0]?.video?.uri) {
            const downloadLink = updatedOperation.response.generatedVideos[0].video.uri;
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
            const blob = await response.blob();
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }
        return null; // Not done yet
    } catch (error) {
        console.error("Error in checkVideoStatus:", error);
        // Pass through the more specific error from the operation if available
        if (operation?.error?.message) {
            throw new Error(`Video generation failed: ${operation.error.message}`);
        }
        throw new Error(`Failed to check video status. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
};