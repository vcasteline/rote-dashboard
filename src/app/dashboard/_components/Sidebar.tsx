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
  UserCheck,
  FileText,
  ShoppingCart
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', label: 'Próximas Clases', icon: Calendar },
    { href: '/dashboard/schedule', label: 'Gestionar Horario', icon: Clock },
    { href: '/dashboard/instructors', label: 'Instructores', icon: Users },
    { href: '/dashboard/users', label: 'Usuarios', icon: UserCheck },
    { href: '/dashboard/packages', label: 'Paquetes Comprados', icon: Package },
    { href: '/dashboard/packages-management', label: 'Gestión de Paquetes', icon: Settings },
    { href: '/dashboard/reservations', label: 'Reservaciones', icon: BookOpen },
    { href: '/dashboard/notifications', label: 'Notificaciones Push', icon: Bell },
    { href: '/dashboard/menu-shakes', label: 'Menu Shakes', icon: FileText },
    { href: '/dashboard/menu-orders', label: 'Órdenes del Menú', icon: ShoppingCart },
  ];

  return (
    <aside className="w-64 bg-[#111619] text-white p-4 flex flex-col">
      <Image src="/volta-logo-slogan.png" alt="Volta Logo" className='my-12 mx-auto' width={130} height={130} />
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
                      ? 'bg-[#3D4AF5] text-white font-medium border-l-4 border-[#8B7EE6]' 
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