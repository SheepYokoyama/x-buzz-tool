import { Sidebar } from '@/components/layout/Sidebar';
import { AppProviders } from '@/components/layout/AppProviders';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <Sidebar />
      <main className="md:pl-[260px] min-h-screen">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 lg:px-12 py-10 lg:py-12">
          {children}
        </div>
      </main>
    </AppProviders>
  );
}
