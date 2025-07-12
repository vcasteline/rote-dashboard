'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import LogoutButton from './LogoutButton';
import { 
  Calendar, 
  Clock, 
  Users, 
  ImageIcon, 
  Package, 
  Settings, 
  BookOpen, 
  Bell,
  UserCheck
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', label: 'Próximas Clases', icon: Calendar },
    { href: '/dashboard/schedule', label: 'Gestionar Horario', icon: Clock },
    { href: '/dashboard/instructors', label: 'Instructores', icon: Users },
    { href: '/dashboard/users', label: 'Usuarios', icon: UserCheck },
    { href: '/dashboard/banners', label: 'Banners Promocionales', icon: ImageIcon },
    { href: '/dashboard/packages', label: 'Paquetes Comprados', icon: Package },
    { href: '/dashboard/packages-management', label: 'Gestión de Paquetes', icon: Settings },
    { href: '/dashboard/reservations', label: 'Reservaciones', icon: BookOpen },
    { href: '/dashboard/notifications', label: 'Notificaciones Push', icon: Bell },
  ];

  return (
    <aside className="w-64 bg-[#111619] text-white p-4 flex flex-col">
      <Image src="/logo-white.png" alt="Giro Logo" width={100} height={100} />
      <nav className="flex-grow">
        <ul>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const IconComponent = item.icon;
            return (
              <li key={item.href} className="mb-2">
                <Link 
                  href={item.href} 
                  className={`flex items-center py-2 px-3 rounded transition-colors ${
                    isActive 
                      ? 'bg-[#6758C2] text-white font-medium border-l-4 border-[#8B7EE6]' 
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <IconComponent size={20} className="mr-3" />
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