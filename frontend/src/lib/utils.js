import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const getDirectImageUrl = (url) => {
  if (!url) return '';
  // Support various Google Drive URL formats (view links, direct links, etc.)
  const gdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                  url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                  url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                  
  if (gdMatch && gdMatch[1]) {
    // lh3.googleusercontent.com/d/ID is the most direct and reliable format for <img> tags
    return `https://lh3.googleusercontent.com/d/${gdMatch[1]}`;
  }
  return url;
};
