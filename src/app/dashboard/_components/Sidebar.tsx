'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import LogoutButton from './LogoutButton';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', label: 'Próximas Clases' },
    { href: '/dashboard/schedule', label: 'Gestionar Horario' },
    { href: '/dashboard/instructors', label: 'Instructores' },
    { href: '/dashboard/banners', label: 'Banners Promocionales' },
    { href: '/dashboard/packages', label: 'Paquetes Comprados' },
    { href: '/dashboard/packages-management', label: 'Gestión de Paquetes' },
    { href: '/dashboard/reservations', label: 'Reservaciones' },
    { href: '/dashboard/notifications', label: 'Notificaciones Push' },
  ];

  return (
    <aside className="w-64 bg-[#111619] text-white p-4 flex flex-col">
      <Image src="/logo-white.png" alt="Giro Logo" width={100} height={100} />
      <nav className="flex-grow">
        <ul>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href} className="mb-2">
                <Link 
                  href={item.href} 
                  className={`block py-2 px-3 rounded transition-colors ${
                    isActive 
                      ? 'bg-[#6758C2] text-white font-medium border-l-4 border-[#8B7EE6]' 
                      : 'hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto">
        <LogoutButton />
      </div>
    </aside>
  );
} 