import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface UploadedImage {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

const STORAGE_KEY = "varnish_images";

/**
 * Get all uploaded images from localStorage
 */
const getImagesFromStorage = (): UploadedImage[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

/**
 * Save images to localStorage
 */
const saveImagesToStorage = (images: UploadedImage[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
};

/**
 * Convert File to base64 data URL
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Hook for uploading images to local storage
 */
export const useUploadImage = () => {
  return useMutation<UploadedImage, Error, File>({
    mutationFn: async (file) => {
      const base64 = await fileToBase64(file);
      
      const image: UploadedImage = {
        id: crypto.randomUUID(),
        url: base64,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      };

      const images = getImagesFromStorage();
      images.unshift(image);
      saveImagesToStorage(images);

      return image;
    },
    onSuccess: (data) => {
      toast.success(`Uploaded ${data.name}`);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    },
  });
};

/**
 * Hook for deleting an uploaded image
 */
export const useDeleteImage = () => {
  return useMutation<void, Error, string>({
    mutationFn: async (imageId) => {
      const images = getImagesFromStorage();
      const filtered = images.filter((img) => img.id !== imageId);
      saveImagesToStorage(filtered);
    },
    onSuccess: () => {
      toast.success("Image deleted");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete image");
    },
  });
};

/**
 * Get all uploaded images
 */
export const useGetImages = () => {
  return getImagesFromStorage();
};

// Aliases for compatibility
export const useGetUploadedImages = useGetImages;
export const useDeleteUploadedImage = useDeleteImage;

export type { UploadedImage };
