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
    // drive.google.com/thumbnail?id=ID&sz=w1000 is highly reliable for previews
    return `https://drive.google.com/thumbnail?id=${gdMatch[1]}&sz=w1000`;
  }
  return url;
};
