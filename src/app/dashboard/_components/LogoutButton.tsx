'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Forzar refresh para que el middleware detecte el cambio de sesión
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full py-2 px-3 text-left text-sm text-gray-300 hover:bg-red-700 hover:text-white rounded"
    >
      Cerrar Sesión
    </button>
  );
} 