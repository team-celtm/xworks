import { Metadata } from 'next';
import { Suspense } from 'react';
import AuthScreen from '@/app/components/AuthScreen';

export const metadata: Metadata = {
  title: "XWORKS — Sign In",
  description: "Sign in to your XWORKS account to access workshops and your dashboard.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthScreen defaultTab="in" />
    </Suspense>
  );
}
