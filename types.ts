// Declaration for gif.js library loaded via CDN
// This allows TypeScript to recognize the GIF global variable.
// Fix: Uncomment the following declaration to make GIF known globally to TypeScript.
declare global {
  var GIF: any; // Replace 'any' with more specific types if available/known
}

export enum Tool {
  Converter = 'Video to GIF Converter',
  // Trimmer = 'Video Trimmer', // Removed
  // Downloader = 'Video Downloader', // Removed
  ImageEditor = 'Image Editor',
}

export interface VideoTrimSelection {
  startTime: number;
  endTime: number;
}