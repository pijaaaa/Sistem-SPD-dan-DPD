import React from 'react';
import { X, Download } from 'lucide-react';

export const FilePreviewModal = ({ isOpen, onClose, fileUrl, fileName }) => {
  if (!isOpen) return null;

  const isImage = fileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = fileUrl?.match(/\.pdf$/i);

  const handleDownload = async () => {
    try {
      // Extract path from URL (remove base URL)
      const urlParts = fileUrl.split('/storage/');
      if (urlParts.length < 2) {
        throw new Error('Invalid file URL');
      }
      const filePath = urlParts[1];
      
      // Call backend download endpoint
      const apiBaseUrl = fileUrl.split('/storage/')[0];
      const downloadUrl = `${apiBaseUrl}/api/dpd/download-file?path=${encodeURIComponent(filePath)}`;
      
      // Create hidden link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || filePath.split('/').pop() || 'download';
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">{fileName || 'Preview File'}</h2>
          <div className="flex items-center gap-2">
            {isImage && (
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5 text-gray-700" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {isImage && (
            <div className="flex items-center justify-center h-full">
              <img 
                src={fileUrl} 
                alt={fileName || 'Preview'} 
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          )}
          
          {isPdf && (
            <iframe
              src={fileUrl}
              className="w-full h-full min-h-[600px] rounded-lg"
              title={fileName || 'PDF Preview'}
            />
          )}
          
          {!isImage && !isPdf && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Format file tidak dapat ditampilkan. <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Buka di tab baru</a></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
