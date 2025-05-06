'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission
    setError('');
    setIsLoading(true);

    try {
      // Attempt to sign in using the 'credentials' provider
      const result = await signIn('credentials', {
          redirect: false, // Prevent NextAuth from automatically redirecting
          password: password,
      });

      if (result?.error) {
        // Handle sign-in errors (e.g., wrong password)
        setError('Login failed. Please check your password.');
        setIsLoading(false);
      } else if (result?.ok) {
        router.push('/');
      } else {
        // Handle unexpected cases, though usually covered by result.error
        setError('An unexpected error occurred during login.');
        setIsLoading(false);
      }
    } catch (err) {
      // Catch any unexpected errors during the fetch/process
      console.error('Login submission error:', err);
      setError('An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-black">Journal Login</h1>
        <form onSubmit={handleSubmit}>
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
              placeholder="Enter your journal password"
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Logging In...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
