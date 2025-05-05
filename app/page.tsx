'use client';

import { jsPDF } from 'jspdf';
import { useState, useEffect } from 'react';
import { format } from 'date-fns'; // if using date-fns

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [textContent, setTextContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    // Format: 05 May 2025
    const formattedDate = format(new Date(), 'dd MMM yyyy');
    setCurrentDate(formattedDate);
  }, []); // Empty dependency array ensures this runs once on mount

  const generatePdfBlob = (text: string): Blob => {
    const doc = new jsPDF();
    // You might need to split text and handle multiple pages for long content
    // doc.text(text, 10, 10); // Simple example
    const lines = doc.splitTextToSize(text, 180); // Adjust width (180mm) as needed
    doc.text(lines, 10, 10);
    return doc.output('blob');
  };

  const handleSave = async () => {
    console.log('Saving PDF...');
    if (!textContent.trim()) {
      setStatusMessage('Text area is empty.');
      return;
    }
    setIsLoading(true);
    setStatusMessage('Generating PDF...');

    try {
      const pdfBlob = generatePdfBlob(textContent);
      setStatusMessage('Uploading PDF...');

      console.log('Saving PDF2...');
      const formData = new FormData();
      // Use the client-side date for the filename part if desired,
      // but the API route should determine the S3 path based on server date.
      const filename = `${format(new Date(), 'dd MMM yyyy')}.pdf`;
      formData.append('pdfFile', pdfBlob, filename);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        // Headers are automatically set for FormData by fetch
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      setStatusMessage(`Successfully uploaded: ${result.key}`);
      setTextContent('');

    } catch (error: unknown) {
      console.error('Save Error:', error);

      // Default error message
      let errorMessage = 'An unknown error occurred during upload.';

      // Check if the error is an instance of Error to safely access message
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      } else if (typeof error === 'string') {
        // Handle cases where a string might have been thrown
        errorMessage = `Error: ${error}`;
      } else {
          // Optionally log the structure if it's something else unexpected
          console.error("Caught error is not an Error instance:", error);
      }

      setStatusMessage(errorMessage); // Set the potentially refined error message
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">{currentDate}</h1>
      <textarea
        value={textContent}
        onChange={(e) => setTextContent(e.target.value)}
        placeholder="Enter your text here..."
        className="w-full max-w-md p-4 border rounded-lg shadow-md"
      />
      <button
        onClick={handleSave} disabled={isLoading}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600"
      >
        {isLoading ? 'Saving...' : 'Save'}
      </button>
      {statusMessage && <p>{statusMessage}</p>}
    </div>
  );
}
