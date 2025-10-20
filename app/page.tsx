'use client';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const router = useRouter();
  const { status } = useSession();

  const [isLoading, setIsLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [textContent, setTextContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // --- Handle Authentication Status ---
  useEffect(() => {
    if (status === 'unauthenticated') {
      // Option 1: Use NextAuth's signIn function which can redirect
      signIn(); // Redirects to the page defined in authOptions.pages.signIn

      // Option 2: Manual redirect (less common for simple cases)
      // router.push('/login');
    }
  }, [status, router]); // Depend on status and router

  useEffect(() => {
  // Set default date to today on mount (full month name)
  const formattedDate = format(new Date(), 'dd MMMM yyyy');
  setCurrentDate(formattedDate);
  }, []); // Set default date once

  const generatePdfBlob = async (text: string): Promise<Blob> => {
    // Create a temporary div to render text with proper emoji support
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '720px'; // Width for PDF content (roughly 190mm at 96dpi)
    tempDiv.style.padding = '40px';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '14px';
    tempDiv.style.lineHeight = '1.6';
    tempDiv.style.color = '#000000';
    tempDiv.style.backgroundColor = '#ffffff';
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.style.wordWrap = 'break-word';
    tempDiv.textContent = text;
    
    document.body.appendChild(tempDiv);

    try {
      // Render the div to canvas with proper emoji support
      const canvas = await html2canvas(tempDiv, {
        useCORS: true,
        logging: false,
        width: tempDiv.scrollWidth,
        height: tempDiv.scrollHeight,
      });

      // Create PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Use JPEG for smaller file size (quality: 0.85 is a good balance)
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();
      
      // Calculate image dimensions
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // If content fits on one page
      if (imgHeight <= pdfHeight) {
        doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      } else {
        // Split content across multiple pages
        let heightLeft = imgHeight;
        let position = 0;
        
        // Add first page
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Add subsequent pages
        while (heightLeft > 0) {
          position = -pdfHeight * (Math.floor((imgHeight - heightLeft) / pdfHeight) + 1);
          doc.addPage();
          doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
      }

      return doc.output('blob');
    } finally {
      // Clean up: remove temporary div
      document.body.removeChild(tempDiv);
    }
  };

  const handleSave = async () => {
    if (!textContent.trim()) {
      setStatusMessage('Text area is empty.');
      return;
    }
    // Validate date format: dd MMMM yyyy (e.g. 07 July 2025)
    if (!/^\d{2} [A-Za-z]+ \d{4}$/.test(currentDate)) {
      setStatusMessage('Date must be in format: dd MMMM yyyy (e.g. 07 July 2025)');
      return;
    }
    setIsLoading(true);
    setStatusMessage('Generating PDF...');

    try {
      const pdfBlob = await generatePdfBlob(`\n${currentDate}\n\n${textContent}`);
      setStatusMessage('Uploading PDF...');

      const formData = new FormData();
      // Use the client-side date for the filename part if desired,
      // but the API route should determine the S3 path based on server date.
      const filename = `${format(new Date(), 'dd MMMM yyyy')}.pdf`;
      formData.append('pdfFile', pdfBlob, filename);
      formData.append('date', currentDate); // Pass the user-selected date to backend

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        // Headers are automatically set for FormData by fetch
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      setStatusMessage("Successfully added the entry!");
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
      }

      setStatusMessage(errorMessage); // Set the potentially refined error message (custom error message)
    } finally {
      setIsLoading(false);
    }
  };

  // --- Conditional Rendering based on Auth Status ---

  // 1. Show loading state while session status is being determined
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">Loading session...</p>
      </div>
    );
  }

  // 2. Render the main content ONLY if authenticated
  if (status === 'authenticated') {
    return (
      <div className="flex flex-col justify-between min-h-screen bg-gray-100 p-8">
        {/* Header with Date input and Sign Out Button */}
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            value={currentDate}
            onChange={e => setCurrentDate(e.target.value)}
            className="text-2xl text-black font-bold bg-white border rounded px-2 py-1 w-48 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Enter date (e.g. 07 July 2025)"
          />
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>

        {/* Expanded text area */}
        <textarea
          value={textContent}
          placeholder="Enter your text here..."
          onChange={(e) => setTextContent(e.target.value)}
          className="flex-1 w-full p-4 border rounded-lg shadow-md resize-none text-lg text-black placeholder-gray-500"
        />

        {/* Button + Status Message aligned to the left */}
        <div className="flex items-center mt-4 space-x-4">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
          {statusMessage && <p className="text-sm text-gray-700">{statusMessage}</p>}
        </div>
      </div>
    );
  }

  // 3. If unauthenticated, show a message or redirect
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg text-gray-600">You are not logged in. Please log in to access your journal.</p>
    </div>
  );
}
