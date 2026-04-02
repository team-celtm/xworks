import { Suspense } from 'react';
import AuthScreen from '@/app/components/AuthScreen';

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthScreen defaultTab="in" />
    </Suspense>
  );
}
