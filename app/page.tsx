'use client';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { useAuth } from '@/app/components/AuthProvider';
import { getFirebaseAuth } from '@/lib/firebase/client';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [textContent, setTextContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const formattedDate = format(new Date(), 'dd MMMM yyyy');
    setCurrentDate(formattedDate);
  }, []);

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
    if (!/^\d{2} [A-Za-z]+ \d{4}$/.test(currentDate)) {
      setStatusMessage('Date must be in format: dd MMMM yyyy (e.g. 07 July 2025)');
      return;
    }
    if (!user) {
      setStatusMessage('Not authenticated.');
      return;
    }
    setIsLoading(true);
    setStatusMessage('Generating PDF...');

    try {
      const pdfBlob = await generatePdfBlob(`\n${currentDate}\n\n${textContent}`);
      setStatusMessage('Uploading PDF...');

      const idToken = await user.getIdToken();

      const formData = new FormData();
      const filename = `${format(new Date(), 'dd MMMM yyyy')}.pdf`;
      formData.append('pdfFile', pdfBlob, filename);
      formData.append('date', currentDate);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
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

      setStatusMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const auth = getFirebaseAuth();
      await firebaseSignOut(auth);
      
      await fetch('/api/auth/session', {
        method: 'DELETE',
      });

      router.push('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">You are not logged in. Please log in to access your journal.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen min-h-dvh flex-col justify-between bg-gray-100 px-4 py-4 sm:p-6 md:p-8">
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 md:flex-row md:items-start md:justify-between">
        <input
          type="text"
          value={currentDate}
          onChange={(e) => setCurrentDate(e.target.value)}
          className="w-full max-w-full rounded border bg-white px-2 py-2 text-lg font-bold text-black focus:outline-none focus:ring-2 focus:ring-blue-400 sm:w-auto sm:min-w-[12rem] md:text-2xl"
          placeholder="Enter date (e.g. 07 July 2025)"
        />
        <div className="flex flex-wrap gap-2">
          <Link
            href="/calendar"
            className="rounded bg-gray-600 px-3 py-1.5 text-center text-sm text-white hover:bg-gray-700 sm:px-4 sm:py-1"
          >
            Calendar
          </Link>
          <Link
            href="/settings"
            className="rounded bg-gray-600 px-3 py-1.5 text-center text-sm text-white hover:bg-gray-700 sm:px-4 sm:py-1"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600 sm:px-4 sm:py-1"
          >
            Sign Out
          </button>
        </div>
      </div>

      <textarea
        value={textContent}
        placeholder="Enter your text here..."
        onChange={(e) => setTextContent(e.target.value)}
        className="min-h-[40vh] w-full flex-1 resize-none rounded-lg border p-3 text-base text-black shadow-md placeholder:text-gray-500 sm:min-h-[50vh] sm:p-4 sm:text-lg"
      />

      <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-white shadow hover:bg-blue-700 disabled:opacity-50 sm:px-6 sm:py-2"
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        {statusMessage && (
          <p className="text-xs text-gray-700 sm:text-sm">{statusMessage}</p>
        )}
      </div>
    </div>
  );
}
