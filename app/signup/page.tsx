'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase/client';
import { AuthSplitLayout } from '@/app/components/AuthSplitLayout';
import {
  authInputClass,
  authInputCompactClass,
  authLinkAccentClass,
  authPrimaryButtonClass,
} from '@/app/components/auth-ui';

type Step = 1 | 2;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [s3BucketName, setS3BucketName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const goToStepTwo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

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

  const fieldGap = 'mb-3.5 sm:mb-4';
  const fieldGapTight = 'mb-2.5 sm:mb-3';

  return (
    <AuthSplitLayout wideForm fitViewport>
      <div className="flex w-full flex-col">
        <h1 className="mb-5 text-center text-xl font-bold tracking-tight text-neutral-900 sm:mb-6 sm:text-2xl">
          {step === 1 ? 'Create Account' : 'AWS S3'}
        </h1>

        {step === 1 ? (
          <form onSubmit={goToStepTwo} className="flex flex-col">
            <div className={fieldGap}>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={authInputClass}
                placeholder="Email Address"
              />
            </div>

            <div className={fieldGap}>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={authInputClass}
                placeholder="Password"
              />
            </div>

            <div className={fieldGap}>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-neutral-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={authInputClass}
                placeholder="Confirm Password"
              />
            </div>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <button type="submit" className={`${authPrimaryButtonClass} mt-1`}>
              Continue
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <p className="mb-2.5 text-center text-xs text-neutral-600 sm:mb-3 sm:text-sm">
              Connect your bucket to store journal PDFs.
            </p>

            <div className={fieldGapTight}>
              <label htmlFor="awsAccessKeyId" className="mb-0.5 block text-sm font-medium text-neutral-700">
                AWS Access Key ID
              </label>
              <input
                id="awsAccessKeyId"
                name="awsAccessKeyId"
                type="text"
                autoComplete="off"
                value={awsAccessKeyId}
                onChange={(e) => setAwsAccessKeyId(e.target.value)}
                required
                className={authInputCompactClass}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                disabled={isLoading}
              />
            </div>

            <div className={fieldGapTight}>
              <label htmlFor="awsSecretAccessKey" className="mb-0.5 block text-sm font-medium text-neutral-700">
                AWS Secret Access Key
              </label>
              <input
                id="awsSecretAccessKey"
                name="awsSecretAccessKey"
                type="password"
                autoComplete="new-password"
                value={awsSecretAccessKey}
                onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                required
                className={authInputCompactClass}
                placeholder="Secret access key"
                disabled={isLoading}
              />
            </div>

            <div className={fieldGapTight}>
              <label htmlFor="awsRegion" className="mb-0.5 block text-sm font-medium text-neutral-700">
                AWS Region
              </label>
              <input
                id="awsRegion"
                name="awsRegion"
                type="text"
                value={awsRegion}
                onChange={(e) => setAwsRegion(e.target.value)}
                required
                className={authInputCompactClass}
                placeholder="us-east-1"
                disabled={isLoading}
              />
            </div>

            <div className={fieldGapTight}>
              <label htmlFor="s3BucketName" className="mb-0.5 block text-sm font-medium text-neutral-700">
                S3 Bucket Name
              </label>
              <input
                id="s3BucketName"
                name="s3BucketName"
                type="text"
                autoComplete="off"
                value={s3BucketName}
                onChange={(e) => setS3BucketName(e.target.value)}
                required
                className={authInputCompactClass}
                placeholder="my-journal-bucket"
                disabled={isLoading}
              />
            </div>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <div className="mt-1 flex flex-col gap-3">
              <button type="submit" disabled={isLoading} className={authPrimaryButtonClass}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setError('');
                  setStep(1);
                }}
                className="text-center text-sm text-neutral-500 hover:text-neutral-800 hover:underline"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {step === 1 && (
          <div className="mt-6 text-center sm:mt-8">
            <p className="text-sm text-neutral-600">
              Already have an account?{' '}
              <Link href="/login" className={authLinkAccentClass}>
                Login
              </Link>
            </p>
          </div>
        )}
      </div>
    </AuthSplitLayout>
  );
}
