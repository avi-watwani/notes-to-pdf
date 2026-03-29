'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

export default function CalendarPage() {
  const { user, loading } = useAuth();

  const [anchorMonth, setAnchorMonth] = useState<Date>(startOfMonth(new Date()));
  const [journalDates, setJournalDates] = useState<Set<string>>(new Set());
  const [isLoadingData, setIsLoadingData] = useState(false);

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
                  ${hasEntry && !isCurrentMonth ? 'bg-green-100' : ''}
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">You are not logged in. Please log in to access the calendar.</p>
      </div>
    );
  }

  const prevMonth = subMonths(anchorMonth, 1);
  const nextMonth = addMonths(anchorMonth, 1);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-black sm:text-3xl">Journal Calendar</h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded bg-gray-600 px-3 py-2 text-center text-sm text-white hover:bg-gray-700 sm:px-4"
            >
              Back to Journal
            </Link>
            <Link
              href="/settings"
              className="rounded bg-gray-600 px-3 py-2 text-center text-sm text-white hover:bg-gray-700 sm:px-4"
            >
              Settings
            </Link>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-center gap-2 sm:mb-8 sm:gap-4">
          <button
            type="button"
            onClick={() => setAnchorMonth((prev) => subMonths(prev, 1))}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:px-6"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={() => setAnchorMonth(startOfMonth(new Date()))}
            className="rounded-lg bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700 sm:px-6"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setAnchorMonth((prev) => addMonths(prev, 1))}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:px-6"
          >
            Next →
          </button>
        </div>

        {isLoadingData && (
          <div className="mb-4 text-center text-gray-600">Loading entries...</div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="hidden lg:block">{renderMonth(prevMonth)}</div>
          {renderMonth(anchorMonth)}
          <div className="hidden lg:block">{renderMonth(nextMonth)}</div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-600 sm:mt-8 sm:text-sm">
          <p className="mb-2">Days with journal entries are highlighted in green.</p>
          <p>Today is marked with a blue background.</p>
        </div>
      </div>
    </div>
  );
}
