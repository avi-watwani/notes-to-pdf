'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isSameDay
} from 'date-fns';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { useAuth } from '@/app/components/AuthProvider';
import { getFirebaseFirestore } from '@/lib/firebase/client';
import { appButtonGhost, appSegmentAccent, appSegmentButton, appSegmentGroup } from '@/app/components/auth-ui';

export default function CalendarPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [anchorMonth, setAnchorMonth] = useState<Date>(startOfMonth(new Date()));
  const [journalDates, setJournalDates] = useState<Set<string>>(new Set());
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!user) return;

    const loadJournalDates = async () => {
      setIsLoadingData(true);
      try {
        const db = getFirebaseFirestore();
        
        const prevMonth = subMonths(anchorMonth, 1);
        const nextMonth = addMonths(anchorMonth, 1);
        
        const rangeStart = format(startOfMonth(prevMonth), 'yyyy-MM-dd');
        const rangeEnd = format(endOfMonth(nextMonth), 'yyyy-MM-dd');

        const journalDaysRef = collection(db, 'users', user.uid, 'journalDays');
        const q = query(
          journalDaysRef,
          where(documentId(), '>=', rangeStart),
          where(documentId(), '<=', rangeEnd)
        );

        const snapshot = await getDocs(q);
        const dates = new Set<string>();
        snapshot.forEach(doc => {
          dates.add(doc.id);
        });

        setJournalDates(dates);
      } catch (error) {
        console.error('Failed to load journal dates:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadJournalDates();
  }, [user, anchorMonth]);

  const renderMonth = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="rounded-lg bg-white p-3 shadow-md sm:p-4">
        <h2 className="mb-3 text-center text-lg font-bold text-black sm:mb-4 sm:text-xl">
          {format(monthDate, 'MMMM yyyy')}
        </h2>

        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {weekdays.map(day => (
            <div key={day} className="py-1 text-center text-[10px] font-semibold text-gray-600 sm:py-2 sm:text-sm">
              {day}
            </div>
          ))}
          
          {days.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, monthDate);
            const isToday = isCurrentMonth && isSameDay(day, new Date());
            const dateKey = format(day, 'yyyy-MM-dd');
            const hasEntry = journalDates.has(dateKey);

            return (
              <div
                key={idx}
                className={`
                  flex aspect-square items-center justify-center rounded text-xs sm:text-sm
                  ${!isCurrentMonth ? 'text-gray-300' : 'text-black'}
                  ${isToday ? 'bg-blue-100 font-bold' : ''}
                  ${hasEntry && isCurrentMonth ? 'bg-green-200 font-semibold' : ''}
                `}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>
      </div>
    );
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

  const prevMonth = subMonths(anchorMonth, 1);
  const nextMonth = addMonths(anchorMonth, 1);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-start md:justify-between md:gap-4">
          <div className="flex w-full min-w-0 items-center gap-2 md:contents">
            <h1 className="min-w-0 flex-1 text-2xl font-bold text-black sm:text-3xl md:flex-none">
              Journal Calendar
            </h1>
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
                      href="/"
                      role="menuitem"
                      className="flex w-full px-4 py-3 text-left text-sm font-medium text-neutral-800 transition hover:bg-neutral-100"
                      onClick={() => setNavMenuOpen(false)}
                    >
                      Back to Journal
                    </Link>
                    <Link
                      href="/settings"
                      role="menuitem"
                      className="flex w-full px-4 py-3 text-left text-sm font-medium text-neutral-800 transition hover:bg-neutral-100"
                      onClick={() => setNavMenuOpen(false)}
                    >
                      Settings
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <Link href="/" className={appButtonGhost}>
              Back to Journal
            </Link>
            <Link href="/settings" className={appButtonGhost}>
              Settings
            </Link>
          </div>
        </div>

        <div className="mb-6 flex justify-center sm:mb-8">
          <div className={appSegmentGroup}>
            <button
              type="button"
              onClick={() => setAnchorMonth((prev) => subMonths(prev, 1))}
              className={appSegmentButton}
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => setAnchorMonth(startOfMonth(new Date()))}
              className={appSegmentAccent}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setAnchorMonth((prev) => addMonths(prev, 1))}
              className={appSegmentButton}
            >
              Next →
            </button>
          </div>
        </div>

        {isLoadingData && (
          <div className="mb-4 text-center text-gray-600">Loading entries...</div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="hidden lg:contents">
            <div className="mx-auto w-full max-w-sm sm:max-w-md lg:mx-0 lg:max-w-none">
              {renderMonth(prevMonth)}
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm sm:max-w-md lg:mx-0 lg:max-w-none">
            {renderMonth(anchorMonth)}
          </div>
          <div className="hidden lg:contents">
            <div className="mx-auto w-full max-w-sm sm:max-w-md lg:mx-0 lg:max-w-none">
              {renderMonth(nextMonth)}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-600 sm:mt-8 sm:text-sm">
          <p className="mb-2">Days with journal entries are highlighted in green.</p>
          <p>Today is marked with a blue background.</p>
        </div>
      </div>
    </div>
  );
}
