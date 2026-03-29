'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/app/components/AuthProvider';
import { getFirebaseFirestore } from '@/lib/firebase/client';
import { authInputClass, authLinkAccentClass, authPrimaryButtonClass } from '@/app/components/auth-ui';

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
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="text-lg text-neutral-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-white px-5 py-8 sm:px-6 lg:px-12 lg:py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-row items-start justify-between gap-4">
          <h1 className="min-w-0 flex-1 text-2xl font-bold tracking-tight text-neutral-900 pr-2">
            AWS S3 Settings
          </h1>
          <div className="flex shrink-0 gap-x-4 text-sm">
            <Link href="/calendar" className={`${authLinkAccentClass} hidden sm:inline`}>
              Calendar
            </Link>
            <Link href="/" className={authLinkAccentClass}>
              Back to Journal
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="awsAccessKeyId" className="mb-1.5 block text-sm font-medium text-neutral-700">
              AWS Access Key ID
            </label>
            <input
              id="awsAccessKeyId"
              name="awsAccessKeyId"
              type="text"
              value={awsAccessKeyId}
              onChange={(e) => setAwsAccessKeyId(e.target.value)}
              required
              className={authInputClass}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              disabled={isLoading}
            />
          </div>

          <div className="mb-5">
            <label htmlFor="awsSecretAccessKey" className="mb-1.5 block text-sm font-medium text-neutral-700">
              AWS Secret Access Key
            </label>
            <input
              id="awsSecretAccessKey"
              name="awsSecretAccessKey"
              type="password"
              value={awsSecretAccessKey}
              onChange={(e) => setAwsSecretAccessKey(e.target.value)}
              required
              className={authInputClass}
              placeholder="Secret access key"
              disabled={isLoading}
            />
          </div>

          <div className="mb-5">
            <label htmlFor="awsRegion" className="mb-1.5 block text-sm font-medium text-neutral-700">
              AWS Region
            </label>
            <input
              id="awsRegion"
              name="awsRegion"
              type="text"
              value={awsRegion}
              onChange={(e) => setAwsRegion(e.target.value)}
              required
              className={authInputClass}
              placeholder="us-east-1"
              disabled={isLoading}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="s3BucketName" className="mb-1.5 block text-sm font-medium text-neutral-700">
              S3 Bucket Name
            </label>
            <input
              id="s3BucketName"
              name="s3BucketName"
              type="text"
              value={s3BucketName}
              onChange={(e) => setS3BucketName(e.target.value)}
              required
              className={authInputClass}
              placeholder="my-journal-bucket"
              disabled={isLoading}
            />
          </div>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          {successMessage && <p className="mb-4 text-sm text-emerald-700">{successMessage}</p>}

          <button type="submit" disabled={isLoading} className={authPrimaryButtonClass}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
