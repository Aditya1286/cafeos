import React from 'react';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { CustomerMenuPage } from './pages/CustomerMenuPage';
import { CustomerOrderTrackingPage } from './pages/CustomerOrderTrackingPage';
import { CheckoutReturnPage } from './pages/CheckoutReturnPage';
import { MerchantTermsPage } from './pages/MerchantTermsPage';

// 'public'      - anyone, regardless of auth state
// 'guest'       - only signed-out visitors (login/register); signed-in users get bounced to their dashboard
// 'private'     - any active signed-in user
// 'super-admin' - signed-in user with role SUPER_ADMIN
export type AccessLevel = 'public' | 'guest' | 'private' | 'super-admin';

export interface RouteProps {
  user: any;
  onAuthSuccess: (data: any) => void;
}

export interface AppRoute {
  path: string;
  access: AccessLevel;
  element: (props: RouteProps) => React.ReactNode;
}

// Single source of truth for the route table. Add a page here once and it
// picks up auth gating automatically via App.tsx + RequireAuth.
export const routes: AppRoute[] = [
  { path: '/', access: 'public', element: () => <LandingPage /> },
  {
    path: '/login',
    access: 'guest',
    element: ({ onAuthSuccess }) => <LoginPage onLoginSuccess={onAuthSuccess} />,
  },
  {
    path: '/register',
    access: 'guest',
    element: ({ onAuthSuccess }) => <RegisterPage onRegisterSuccess={onAuthSuccess} />,
  },
  { path: '/forgot-password', access: 'guest', element: () => <ForgotPasswordPage /> },
  { path: '/terms', access: 'public', element: () => <MerchantTermsPage /> },
  {
    path: '/admin/*',
    access: 'super-admin',
    element: ({ user }) => <SuperAdminDashboard user={user} />,
  },
  // Owners and staff share this page. What each role can see *inside* it (staff: Kitchen only)
  // is decided by tabsForRole in the dashboard, and enforced by the backend's restrictTo — the
  // dashboard's sections are tab state, not URLs, so there's nothing more to gate here.
  {
    path: '/dashboard/*',
    access: 'private',
    element: ({ user }) => <OwnerDashboard user={user} />,
  },
  { path: '/c/:slug', access: 'public', element: () => <CustomerMenuPage /> },
  { path: '/c/:slug/t/:qrToken', access: 'public', element: () => <CustomerMenuPage /> },
  {
    path: '/c/:slug/order/:orderId',
    access: 'public',
    element: () => <CustomerOrderTrackingPage />,
  },
  // SMEPay's hosted checkout returns the customer here (the checkout session's callback_url).
  { path: '/c/:slug/checkout/:sessionId', access: 'public', element: () => <CheckoutReturnPage /> },
];
