
import React, { useRef, useState, useCallback } from 'react';
import { UploadIcon } from './IconComponents';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  id?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, accept = "video/*", id = "file-upload" }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileSelect(event.target.files[0]);
      event.target.value = ''; // Reset file input to allow re-upload of the same file
    }
  }, [onFileSelect]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      // Generalized check based on 'accept' prop
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const fileType = file.type;
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

      let isValid = acceptedTypes.some(acceptedType => {
        if (acceptedType.startsWith('.')) { // like .jpg, .png
          return fileExtension === acceptedType;
        }
        if (acceptedType.endsWith('/*')) { // like image/*, video/*
          return fileType.startsWith(acceptedType.slice(0, -2));
        }
        return fileType === acceptedType; // specific MIME type like image/jpeg
      });
      
      if (!isValid) {
        alert(`Invalid file type. Please upload a file of type: ${accept}`);
        return;
      }
      onFileSelect(file);
    }
  }, [onFileSelect, accept]);

  const getDisplayAcceptText = () => {
    if (accept === "video/*") return "Video files (MP4, WEBM, OGG etc.)";
    if (accept === "image/*") return "Image files (PNG, JPG, WEBP, GIF etc.)";
    return `Accepted files: ${accept}`;
  }

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-48 sm:h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                    ${dragOver ? 'border-indigo-500 bg-gray-700' : 'border-gray-600 hover:border-gray-500 bg-gray-700 hover:bg-gray-600'}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon className={`w-10 h-10 mb-3 ${dragOver ? 'text-indigo-400' : 'text-gray-400'}`} />
          <p className={`mb-2 text-sm ${dragOver ? 'text-indigo-300' : 'text-gray-400'}`}>
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className={`text-xs ${dragOver ? 'text-indigo-400' : 'text-gray-500'}`}>
            {getDisplayAcceptText()}
          </p>
        </div>
        <input
          id={id}
          type="file"
          className="hidden"
          accept={accept}
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </label>
      <button
        type="button"
        onClick={handleButtonClick}
        className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
      >
        Select File
      </button>
    </div>
  );
};

export default FileUploader;