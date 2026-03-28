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
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-bold text-center mb-4 text-black">
          {format(monthDate, 'MMMM yyyy')}
        </h2>
        
        <div className="grid grid-cols-7 gap-1">
          {weekdays.map(day => (
            <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
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
                  aspect-square flex items-center justify-center text-sm rounded
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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-black">Journal Calendar</h1>
          <div className="flex gap-2">
            <Link
              href="/"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Back to Journal
            </Link>
            <Link
              href="/settings"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Settings
            </Link>
          </div>
        </div>

        <div className="flex justify-center items-center gap-4 mb-8">
          <button
            onClick={() => setAnchorMonth(prev => subMonths(prev, 1))}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            ← Previous
          </button>
          <button
            onClick={() => setAnchorMonth(startOfMonth(new Date()))}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Today
          </button>
          <button
            onClick={() => setAnchorMonth(prev => addMonths(prev, 1))}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Next →
          </button>
        </div>

        {isLoadingData && (
          <div className="text-center text-gray-600 mb-4">Loading entries...</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {renderMonth(prevMonth)}
          {renderMonth(anchorMonth)}
          {renderMonth(nextMonth)}
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="mb-2">Days with journal entries are highlighted in green.</p>
          <p>Today is marked with a blue background.</p>
        </div>
      </div>
    </div>
  );
}
