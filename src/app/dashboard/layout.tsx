import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from './_components/Sidebar';

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-[#f5ebe3]">
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
} 