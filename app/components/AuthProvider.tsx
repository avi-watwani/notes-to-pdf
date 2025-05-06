'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';

// Define the props type, expecting children
interface AuthProviderProps { children: React.ReactNode; }

export default function AuthProvider({ children }: AuthProviderProps) {
  // Wrap the children with SessionProvider
  return <SessionProvider>{children}</SessionProvider>;
}
