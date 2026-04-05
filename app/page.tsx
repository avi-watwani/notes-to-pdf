'use client';

import { format, subDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { useAuth } from '@/app/components/AuthProvider';
import {
  JournalEditor,
  type JournalEditorHandle,
} from '@/app/components/JournalEditor';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { generateJournalPdfBlob } from '@/lib/journalPdf';
import Link from 'next/link';
import {
  appButtonDanger,
  appButtonGhost,
  appButtonPrimary,
} from '@/app/components/auth-ui';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [editorHtml, setEditorHtml] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const journalEditorRef = useRef<JournalEditorHandle>(null);

  useEffect(() => {
    const formattedDate = format(subDays(new Date(), 1), 'dd MMMM yyyy');
    setCurrentDate(formattedDate);
  }, []);

  useEffect(() => {
    if (!navMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navMenuOpen]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  const handleSave = async () => {
    const plain = journalEditorRef.current?.getText() ?? '';
    if (!plain) {
      setStatusMessage('Journal is empty.');
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
      const pdfBlob = await generateJournalPdfBlob(currentDate, editorHtml);
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
      setEditorHtml('');

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
    setNavMenuOpen(false);
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
    return null;
  }

  return (
    <div className="flex min-h-screen min-h-dvh flex-col justify-between bg-gray-100 px-4 py-4 sm:p-6 md:p-8">
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="flex w-full min-w-0 items-center gap-2 md:contents">
          <input
            type="text"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border-0 bg-white px-4 py-2.5 text-lg font-bold text-neutral-900 shadow-sm ring-1 ring-neutral-200/80 focus:outline-none focus:ring-2 focus:ring-[#10214d]/25 md:w-auto md:min-w-[12rem] md:flex-none md:text-2xl"
            placeholder="Enter date (e.g. 07 July 2025)"
          />
          <div className="relative shrink-0 md:hidden">
            <button
              type="button"
              aria-expanded={navMenuOpen}
              aria-haspopup="menu"
              aria-label={navMenuOpen ? 'Close menu' : 'Open menu'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-0 bg-white text-neutral-800 shadow-sm ring-1 ring-neutral-200/80 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10214d]/25"
              onClick={() => setNavMenuOpen((open) => !open)}
            >
              <span className="flex w-5 flex-col gap-1" aria-hidden>
                <span className="h-0.5 rounded-full bg-neutral-800" />
                <span className="h-0.5 rounded-full bg-neutral-800" />
                <span className="h-0.5 rounded-full bg-neutral-800" />
              </span>
            </button>
            {navMenuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Dismiss menu"
                  className="fixed inset-0 z-40 bg-neutral-900/20"
                  onClick={() => setNavMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[11rem] overflow-hidden rounded-xl bg-white py-1.5 shadow-lg ring-1 ring-neutral-200/80"
                >
                  <Link
                    href="/calendar"
                    role="menuitem"
                    className="flex w-full px-4 py-3 text-left text-sm font-medium text-neutral-800 transition hover:bg-neutral-100"
                    onClick={() => setNavMenuOpen(false)}
                  >
                    Calendar
                  </Link>
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="flex w-full px-4 py-3 text-left text-sm font-medium text-neutral-800 transition hover:bg-neutral-100"
                    onClick={() => setNavMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full border-t border-neutral-100 px-4 py-3 text-center text-sm font-medium text-red-700 transition hover:bg-red-50"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <Link href="/calendar" className={appButtonGhost}>
            Calendar
          </Link>
          <Link href="/settings" className={appButtonGhost}>
            Settings
          </Link>
          <button type="button" onClick={handleSignOut} className={appButtonDanger}>
            Sign out
          </button>
        </div>
      </div>

      <JournalEditor
        ref={journalEditorRef}
        value={editorHtml}
        onChange={setEditorHtml}
      />

      <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className={`${appButtonPrimary} min-w-[8.5rem]`}
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
