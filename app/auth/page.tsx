'use client';

import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo.png" alt="SafeNav" className="h-10 w-10" />
          <span className="text-2xl font-bold text-gray-900">SafeRoute</span>
        </Link>
        
        <SignIn redirectUrl="/home" signUpUrl="/auth/sign-up" />
      </div>
    </div>
  );
}

