// app/components/AuthProvider.tsx
'use client'; // This directive is essential

import { SessionProvider } from 'next-auth/react';
import React from 'react'; // Import React

// Define the props type, expecting children
interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  // Wrap the children with SessionProvider
  return <SessionProvider>{children}</SessionProvider>;
}
