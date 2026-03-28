'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/app/components/AuthProvider';
import { getFirebaseFirestore } from '@/lib/firebase/client';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('');
  const [s3BucketName, setS3BucketName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    if (user) {
      const fetchUserSettings = async () => {
        try {
          const db = getFirebaseFirestore();
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setAwsAccessKeyId(data.awsAccessKeyId || '');
            setAwsSecretAccessKey(data.awsSecretAccessKey || '');
            setAwsRegion(data.awsRegion || '');
            setS3BucketName(data.s3BucketName || '');
          }
        } catch (err) {
          console.error('Error fetching user settings:', err);
          setError('Failed to load settings.');
        } finally {
          setIsFetching(false);
        }
      };

      fetchUserSettings();
    }
  }, [user, loading, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!awsAccessKeyId.trim() || !awsSecretAccessKey.trim() || !awsRegion.trim() || !s3BucketName.trim()) {
      setError('All AWS fields are required.');
      return;
    }

    if (!user) {
      setError('Not authenticated.');
      return;
    }

    setIsLoading(true);

    try {
      const db = getFirebaseFirestore();
      await updateDoc(doc(db, 'users', user.uid), {
        awsAccessKeyId,
        awsSecretAccessKey,
        awsRegion,
        s3BucketName,
        updatedAt: serverTimestamp(),
      });

      setSuccessMessage('Settings updated successfully!');
    } catch (err: unknown) {
      console.error('Settings update error:', err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to update settings.');
      } else {
        setError('Failed to update settings.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-lg text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 py-8">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-black">AWS S3 Settings</h1>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Journal
          </Link>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="awsAccessKeyId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              AWS Access Key ID
            </label>
            <input
              id="awsAccessKeyId"
              name="awsAccessKeyId"
              type="text"
              value={awsAccessKeyId}
              onChange={(e) => setAwsAccessKeyId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="AKIAIOSFODNN7EXAMPLE"
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="awsSecretAccessKey"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              AWS Secret Access Key
            </label>
            <input
              id="awsSecretAccessKey"
              name="awsSecretAccessKey"
              type="password"
              value={awsSecretAccessKey}
              onChange={(e) => setAwsSecretAccessKey(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="wJalrXUtnFEMI..."
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="awsRegion"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              AWS Region
            </label>
            <input
              id="awsRegion"
              name="awsRegion"
              type="text"
              value={awsRegion}
              onChange={(e) => setAwsRegion(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="us-east-1"
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="s3BucketName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              S3 Bucket Name
            </label>
            <input
              id="s3BucketName"
              name="s3BucketName"
              type="text"
              value={s3BucketName}
              onChange={(e) => setS3BucketName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="my-journal-bucket"
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600">{error}</p>
          )}

          {successMessage && (
            <p className="mb-4 text-sm text-green-600">{successMessage}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
