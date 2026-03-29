'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { AuthSplitLayout } from '@/app/components/AuthSplitLayout';
import {
  authInputClass,
  authLinkAccentClass,
  authLinkMutedClass,
  authPrimaryButtonClass,
} from '@/app/components/auth-ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const auth = getFirebaseAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const idToken = await userCredential.user.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      router.push('/');
    } catch (err: unknown) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setError(err.message || 'Login failed. Please check your credentials.');
      } else {
        setError('Login failed. Please check your credentials.');
      }
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetMessage('');
    
    if (!resetEmail.trim()) {
      setResetMessage('Please enter your email address.');
      return;
    }

    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage('If an account exists, you will receive a password reset email.');
    } catch (err) {
      console.error('Password reset error:', err);
      setResetMessage('If an account exists, you will receive a password reset email.');
    }
  };

  if (showForgotPassword) {
    return (
      <AuthSplitLayout>
        <div className="w-full">
          <h1 className="mb-8 text-center text-2xl font-bold tracking-tight text-neutral-900">
            Reset Password
          </h1>
          <form onSubmit={handlePasswordReset}>
            <div className="mb-5">
              <label
                htmlFor="resetEmail"
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                Email Address
              </label>
              <input
                id="resetEmail"
                name="resetEmail"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className={authInputClass}
                placeholder="Email Address"
              />
            </div>

            {resetMessage && (
              <p className="mb-4 text-sm text-neutral-600">{resetMessage}</p>
            )}

            <button type="submit" className={authPrimaryButtonClass}>
              Send Reset Email
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className={authLinkMutedClass}
            >
              Back to login
            </button>
          </div>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout>
      <div className="w-full">
        <h1 className="mb-8 text-center text-2xl font-bold tracking-tight text-neutral-900">
          Welcome Back!
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={authInputClass}
              placeholder="Email Address"
              disabled={isLoading}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
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
              className={authInputClass}
              placeholder="Password"
              disabled={isLoading}
            />
          </div>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={isLoading} className={authPrimaryButtonClass}>
            {isLoading ? 'Logging In...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 space-y-4 text-center">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className={`${authLinkMutedClass} block w-full`}
          >
            Forgot your password
          </button>
          <p className="text-sm text-neutral-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className={authLinkAccentClass}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
