'use client';

import { jsPDF } from 'jspdf';
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
    // Format: 05 May 2025
    const formattedDate = format(new Date(), 'dd MMM yyyy');
    setCurrentDate(formattedDate);
  }, []); // Empty dependency array ensures this runs once on mount

  const generatePdfBlob = (text: string): Blob => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const lineHeight = 10;
    const lines = doc.splitTextToSize(text, 180); // 180 is the text width

    let cursorY = margin;

    for (let i = 0; i < lines.length; i++) {
      if (cursorY + lineHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
        doc.text('\n', margin, cursorY);
        cursorY += lineHeight;
      }
      doc.text(lines[i], margin, cursorY);
      cursorY += lineHeight;
    }

    return doc.output('blob');
  };

  const handleSave = async () => {
    if (!textContent.trim()) {
      setStatusMessage('Text area is empty.');
      return;
    }
    setIsLoading(true);
    setStatusMessage('Generating PDF...');

    try {
      const pdfBlob = generatePdfBlob(`\n${currentDate}\n\n${textContent}`);
      setStatusMessage('Uploading PDF...');

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

      setStatusMessage("Successfully added today's entry!");
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
        {/* Header with Date and Sign Out Button */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl text-black font-bold">{currentDate}</h1>
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
