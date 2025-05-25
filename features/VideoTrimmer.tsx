import React, { useState, useRef, useEffect, useCallback } from 'react';
import FileUploader from '../components/FileUploader';
import LoadingSpinner from '../components/LoadingSpinner';
import { ScissorsIcon } from '../components/IconComponents';
import { VideoTrimSelection } from '../types';
import { fetchVideoAsFile } from '../utils'; // Import the new utility

interface VideoTrimmerProps {
  onUseTrimForGif: (file: File, startTime: number, endTime: number) => void;
}

const VideoTrimmer: React.FC<VideoTrimmerProps> = ({ onUseTrimForGif }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [trimSelection, setTrimSelection] = useState<VideoTrimSelection>({ startTime: 0, endTime: 0 });
  const [isPlayingTrim, setIsPlayingTrim] = useState<boolean>(false);

  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isUrlLoading, setIsUrlLoading] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const trimIntervalRef = useRef<number | null>(null);

  const handleFileSelect = useCallback((file: File, resetUrlStates: boolean = true) => {
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setTrimSelection({ startTime: 0, endTime: 0 }); // Reset trim on new file
    if (resetUrlStates) {
      setVideoUrl('');
      setUrlError(null);
    }
    if (videoRef.current) videoRef.current.currentTime = 0;
  }, []);

  const handleLoadFromUrl = useCallback(async () => {
    if (!videoUrl) {
      setUrlError('Please enter a video URL.');
      return;
    }
    setIsUrlLoading(true);
    setUrlError(null);
    try {
      const file = await fetchVideoAsFile(videoUrl, videoFile?.name || 'video_from_url_trimmer');
      handleFileSelect(file);
    } catch (err: any) {
      setUrlError(err.message || 'Failed to load video from URL.');
      console.error(err);
    } finally {
      setIsUrlLoading(false);
    }
  }, [videoUrl, handleFileSelect, videoFile?.name]);

  const onVideoLoad = useCallback(() => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      setTrimSelection({ startTime: 0, endTime: Math.min(duration, 10) }); 
    }
  }, []);
  
  const handleStartTimeChange = useCallback((time: number) => {
    setTrimSelection(prev => ({ ...prev, startTime: Math.max(0, Math.min(time, prev.endTime - 0.1)) }));
  }, []);

  const handleEndTimeChange = useCallback((time: number) => {
    setTrimSelection(prev => ({ ...prev, endTime: Math.min(videoDuration, Math.max(time, prev.startTime + 0.1)) }));
  }, [videoDuration]);


  const playTrimmedSegment = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      video.currentTime = trimSelection.startTime;
      video.play();
      setIsPlayingTrim(true);

      if (trimIntervalRef.current) {
        clearInterval(trimIntervalRef.current);
      }

      trimIntervalRef.current = window.setInterval(() => {
        if (video.currentTime >= trimSelection.endTime) {
          video.pause();
          setIsPlayingTrim(false);
          if (trimIntervalRef.current) clearInterval(trimIntervalRef.current);
        }
      }, 100);
    }
  }, [trimSelection]);

  const stopTrimPlayback = useCallback(() => {
     if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = trimSelection.startTime; // Reset to start of trim for consistency
        setIsPlayingTrim(false);
        if (trimIntervalRef.current) clearInterval(trimIntervalRef.current);
     }
  }, [trimSelection.startTime]);

  useEffect(() => {
    return () => {
      if (trimIntervalRef.current) {
        clearInterval(trimIntervalRef.current);
      }
    };
  }, []);
  
  const handleUseForGif = () => {
    if (videoFile) {
        stopTrimPlayback(); // Ensure playback is stopped before navigating
        onUseTrimForGif(videoFile, trimSelection.startTime, trimSelection.endTime);
    }
  };

  const resetAll = () => {
    setVideoFile(null); 
    setVideoSrc(null); 
    setVideoDuration(0); 
    stopTrimPlayback();
    setTrimSelection({ startTime: 0, endTime: 0 });
    setUrlError(null);
    setVideoUrl('');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-indigo-400 flex items-center">
        <ScissorsIcon className="w-7 h-7 mr-2" /> Video Trimmer
      </h2>
      {!videoFile ? (
        <div className="space-y-4">
          <FileUploader onFileSelect={handleFileSelect} accept="video/*" id="trim-file-upload" />
          <div className="my-2 text-center text-gray-400 text-sm">OR</div>
          <div className="space-y-2">
            <label htmlFor="videoUrlTrimmer" className="block text-sm font-medium text-gray-300">
              Load from Video URL
            </label>
            <input
              type="url"
              id="videoUrlTrimmer"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white"
              aria-describedby="urlErrorTrimmer"
            />
            <button
              onClick={handleLoadFromUrl}
              disabled={isUrlLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75"
            >
              {isUrlLoading ? 'Loading Video...' : 'Load Video from URL'}
            </button>
            {isUrlLoading && <LoadingSpinner size="sm" text="Fetching video..." />}
            {urlError && <p id="urlErrorTrimmer" className="text-red-400 text-sm mt-1 p-2 bg-red-900 bg-opacity-30 rounded-md">{urlError}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <button
              onClick={resetAll}
              className="text-sm text-indigo-400 hover:text-indigo-300 mb-2"
            >
              &#8592; Choose another video or URL
            </button>
            {videoSrc && (
              <video
                ref={videoRef}
                src={videoSrc}
                onLoadedMetadata={onVideoLoad}
                onPause={() => setIsPlayingTrim(false)} // Catch native pause
                onPlay={() => { // If played natively, stop our interval if it was for trim preview
                    if (isPlayingTrim && videoRef.current && videoRef.current.currentTime < trimSelection.startTime) {
                       stopTrimPlayback(); // Playing outside trim region
                    }
                }}
                controls={!isPlayingTrim}
                muted // Mute by default
                className="w-full rounded-lg shadow-lg max-h-96"
                preload="metadata"
              />
            )}
          </div>

          {videoDuration > 0 && (
            <div className="p-4 bg-gray-700 rounded-lg space-y-4">
              <div>
                <label htmlFor="trimStartTime" className="block text-sm font-medium text-gray-300">
                  Start Time: {trimSelection.startTime.toFixed(2)}s
                </label>
                <input
                  type="range"
                  id="trimStartTime"
                  min="0"
                  max={videoDuration}
                  value={trimSelection.startTime}
                  step="0.1"
                  onChange={(e) => handleStartTimeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-1"
                />
              </div>
              <div>
                <label htmlFor="trimEndTime" className="block text-sm font-medium text-gray-300">
                  End Time: {trimSelection.endTime.toFixed(2)}s
                </label>
                <input
                  type="range"
                  id="trimEndTime"
                  min="0"
                  max={videoDuration}
                  value={trimSelection.endTime}
                  step="0.1"
                  onChange={(e) => handleEndTimeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-1"
                />
              </div>
              <div className="text-sm text-gray-400">
                Selected duration: {(trimSelection.endTime - trimSelection.startTime).toFixed(2)}s
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <button
                  onClick={isPlayingTrim ? stopTrimPlayback : playTrimmedSegment}
                  disabled={!videoFile || videoDuration === 0 || trimSelection.endTime <= trimSelection.startTime}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                  aria-live="polite"
                >
                  {isPlayingTrim ? 'Stop Preview' : 'Preview Trim'}
                </button>
                <button
                  onClick={handleUseForGif}
                  disabled={!videoFile || videoDuration === 0 || trimSelection.endTime <= trimSelection.startTime}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
                >
                  Use Trim for GIF Converter
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Note: Actual video file trimming and export is not supported directly. You can use the trimmed selection for GIF conversion.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoTrimmer;
