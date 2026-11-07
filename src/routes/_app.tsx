import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppErrorBoundary } from '../components/AppErrorBoundary';

export const Route = createFileRoute('/_app')({
  ssr: false,
  pendingComponent: () => <div className="min-h-screen bg-[#FAF6F0]" aria-busy="true" />,
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppErrorBoundary>
      <Outlet />
    </AppErrorBoundary>
  );
}