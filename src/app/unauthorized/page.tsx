'use client';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600 mb-6">
            No tienes permisos para acceder al panel de administración. Solo usuarios autorizados pueden ingresar.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full bg-[#D7BAF6] text-black py-2 px-4 rounded-md hover:bg-[#8B7EE6] transition-colors"
          >
            Cerrar Sesión y Volver al Login
          </button>
          
          {/* <Link
            href="/login"
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors inline-block"
          >
            Ir al Login (sin cerrar sesión)
          </Link> */}
          
          <p className="text-sm text-gray-500 mt-4">
            Si crees que deberías tener acceso, contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  );
} 