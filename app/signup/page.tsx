'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [s3BucketName, setS3BucketName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!awsAccessKeyId.trim() || !awsSecretAccessKey.trim() || !awsRegion.trim() || !s3BucketName.trim()) {
      setError('All AWS fields are required.');
      return;
    }

    setIsLoading(true);

    try {
      const auth = getFirebaseAuth();
      const db = getFirebaseFirestore();

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        awsAccessKeyId,
        awsSecretAccessKey,
        awsRegion,
        s3BucketName,
        updatedAt: serverTimestamp(),
      });

      const idToken = await user.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      router.push('/');
    } catch (err: unknown) {
      console.error('Signup error:', err);
      if (err instanceof Error) {
        setError(err.message || 'Signup failed. Please try again.');
      } else {
        setError('Signup failed. Please try again.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 py-8">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-black">Create Account</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="your@email.com"
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="Create a password"
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="Confirm your password"
              disabled={isLoading}
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">AWS S3 Configuration</h2>
            
            <div className="mb-3">
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

            <div className="mb-3">
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

            <div className="mb-3">
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
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
