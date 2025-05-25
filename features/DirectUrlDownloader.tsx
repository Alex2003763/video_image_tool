
import React, { useState, useCallback } from 'react';
import { DownloadIcon } from '../components/IconComponents';

const DirectUrlDownloader: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleDownload = useCallback(async () => {
    if (!videoUrl) {
      setError('Please enter a video URL.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      // Basic URL validation
      new URL(videoUrl); 
    } catch (e) {
      setError('Invalid URL format.');
      setIsLoading(false);
      return;
    }
    
    // Attempt to fetch to check for CORS or other issues before trying to download
    // This is a very basic check.
    try {
        const response = await fetch(videoUrl, { method: 'HEAD', mode: 'cors' });
        if (!response.ok && response.status !== 0) { // status 0 can be opaque redirect, might still work for download
             // Don't set error for all non-ok responses here, as `<a>` download might still work.
             // This HEAD request can be blocked by CORS itself.
        }
    } catch (e) {
        // Likely a CORS issue or network error. The download might still work in some browsers.
        console.warn("HEAD request failed, download might still work or fail due to CORS:", e);
    }


    // Use an anchor tag to trigger download. This relies on browser behavior and Content-Disposition headers.
    // It won't work for sites that block direct linking or require authentication/cookies not sent by simple anchor.
    const link = document.createElement('a');
    link.href = videoUrl;
    
    // Try to get a filename from URL
    let filename = 'video';
    try {
        const urlPath = new URL(videoUrl).pathname;
        const lastSegment = urlPath.substring(urlPath.lastIndexOf('/') + 1);
        if (lastSegment) filename = lastSegment.split('.')[0] || 'video';
    } catch { /* ignore, use default */ }

    link.download = filename; // Suggest a filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsLoading(false);

  }, [videoUrl]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-indigo-400 flex items-center">
        <DownloadIcon className="w-7 h-7 mr-2" /> Direct URL Video Downloader
      </h2>
      <div className="p-4 bg-gray-700 rounded-lg">
        <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-300">
          Video URL
        </label>
        <input
          type="url"
          id="videoUrl"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://example.com/video.mp4"
          className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white"
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>
      <button
        onClick={handleDownload}
        disabled={isLoading || !videoUrl}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
      >
        {isLoading ? 'Preparing Download...' : 'Download Video'}
      </button>
      <div className="mt-4 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-md text-yellow-300 text-sm">
        <p className="font-semibold mb-1">Important Notes:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>This tool works best with direct links to video files (e.g., .mp4, .webm).</li>
          <li>It may <strong className="font-bold">NOT</strong> work for videos from platforms like YouTube, Vimeo, etc., due to DRM, CORS restrictions, and dynamic URL generation.</li>
          <li>Download success depends on the server's configuration and browser security policies.</li>
          <li>Ensure you have the right to download the content.</li>
        </ul>
      </div>
    </div>
  );
};

export default DirectUrlDownloader;
