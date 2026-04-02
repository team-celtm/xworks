import { Suspense } from 'react';
import AuthScreen from '@/app/components/AuthScreen';

export default function RegistrationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthScreen defaultTab="up" />
    </Suspense>
  );
}
