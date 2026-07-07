import { Metadata } from 'next';
import { Suspense } from 'react';
import AuthScreen from '@/app/components/AuthScreen';

export const metadata: Metadata = {
  title: "XWORKS — Sign Up",
  description: "Create your XWORKS account to start attending curated live workshops.",
};

export default function RegistrationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthScreen defaultTab="up" />
    </Suspense>
  );
}
