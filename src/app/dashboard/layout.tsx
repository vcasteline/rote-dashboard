import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LogoutButton from './_components/LogoutButton';
import Image from 'next/image';

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111619] text-white p-4 flex flex-col">
        <Image src="/logo-white.png" alt="Giro Logo" width={100} height={100} />
        <nav className="flex-grow">
          <ul>
            <li className="mb-2">
              <Link href="/dashboard" className="block py-2 px-3 rounded hover:bg-gray-700">
                Próximas Clases
              </Link>
            </li>
            <li className="mb-2">
              <Link href="/dashboard/schedule" className="block py-2 px-3 rounded hover:bg-gray-700">
                Gestionar Horario
              </Link>
            </li>
            <li className="mb-2">
              <Link href="/dashboard/instructors" className="block py-2 px-3 rounded hover:bg-gray-700">
                Instructores
              </Link>
            </li>
            <li className="mb-2">
              <Link href="/dashboard/banners" className="block py-2 px-3 rounded hover:bg-gray-700">
                Banners Promocionales
              </Link>
            </li>
            <li className="mb-2">
              <Link href="/dashboard/packages" className="block py-2 px-3 rounded hover:bg-gray-700">
                Paquetes Comprados
              </Link>
            </li>
            <li className="mb-2">
              <Link href="/dashboard/reservations" className="block py-2 px-3 rounded hover:bg-gray-700">
                Reservaciones
              </Link>
            </li>
          </ul>
        </nav>
        <div className="mt-auto">
           <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
} 