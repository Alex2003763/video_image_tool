import React, { useState, useCallback } from 'react';
import { Tool } from './types';
import VideoToGifConverter from './features/VideoToGifConverter';
import VideoTrimmer from './features/VideoTrimmer';
import DirectUrlDownloader from './features/DirectUrlDownloader';
import ImageEditor from './features/ImageEditor'; // New import
import { VideoIcon, FilmIcon, DownloadIcon, CogIcon, ImageIcon } from './components/IconComponents'; // Added ImageIcon

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.Converter);
  const [videoFileForConverter, setVideoFileForConverter] = useState<File | null>(null);
  const [trimTimesForConverter, setTrimTimesForConverter] = useState<{startTime: number, endTime: number} | null>(null);

  const handleSetVideoForConverter = useCallback((file: File, startTime?: number, endTime?: number) => {
    setVideoFileForConverter(file);
    if (startTime !== undefined && endTime !== undefined) {
      setTrimTimesForConverter({ startTime, endTime });
    } else {
      setTrimTimesForConverter(null);
    }
    setActiveTool(Tool.Converter);
  }, []);


  const renderTool = () => {
    switch (activeTool) {
      case Tool.Converter:
        return <VideoToGifConverter initialVideoFile={videoFileForConverter} initialTrimTimes={trimTimesForConverter} />;
      case Tool.Trimmer:
        return <VideoTrimmer onUseTrimForGif={handleSetVideoForConverter} />;
      case Tool.Downloader:
        return <DirectUrlDownloader />;
      case Tool.ImageEditor: // New case
        return <ImageEditor />;
      default:
        return <VideoToGifConverter />;
    }
  };

  const navItems = [
    { name: Tool.Converter, icon: <CogIcon className="w-5 h-5 mr-2" /> },
    { name: Tool.Trimmer, icon: <FilmIcon className="w-5 h-5 mr-2" /> },
    { name: Tool.Downloader, icon: <DownloadIcon className="w-5 h-5 mr-2" /> },
    { name: Tool.ImageEditor, icon: <ImageIcon className="w-5 h-5 mr-2" /> }, // New nav item
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 flex flex-col items-center p-4 sm:p-8">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center mb-2">
          <VideoIcon className="w-12 h-12 text-indigo-400 mr-3" />
          <h1 className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Video & GIF Toolkit
          </h1>
        </div>
        <p className="text-gray-400 text-sm sm:text-base max-w-xl">
          Convert videos to GIFs, trim segments, download from URLs, and edit images. All processing happens in your browser.
        </p>
      </header>

      <nav className="mb-8 flex flex-wrap justify-center gap-2 sm:gap-3 p-2 bg-gray-800 rounded-lg shadow-lg">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setActiveTool(item.name)}
            className={`flex items-center px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-medium rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75
              ${activeTool === item.name 
                ? 'bg-indigo-600 text-white shadow-md transform scale-105' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
          >
            {item.icon}
            {item.name}
          </button>
        ))}
      </nav>

      <main className="w-full max-w-3xl bg-gray-800 shadow-2xl rounded-xl p-6 sm:p-8">
        {renderTool()}
      </main>

      <footer className="mt-12 text-center text-gray-500 text-xs sm:text-sm">
        <p>&copy; {new Date().getFullYear()} Video & GIF Toolkit. All processing is client-side.</p>
        <p className="mt-1">Note: GIF generation, video, and image processing can be slow and consume resources.</p>
      </footer>
    </div>
  );
};

export default App;