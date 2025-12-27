'use client';

import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Shield className="h-10 w-10 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">SafeRoute</span>
        </Link>
        
        <SignUp redirectUrl="/home" signInUrl="/auth" />
      </div>
    </div>
  );
}
