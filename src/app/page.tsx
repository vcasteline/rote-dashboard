import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#863010] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo de RÔTÈ */}
        <div className="flex justify-center">
          <Image
            src="/rote-logo.png"
            alt="RÔTÈ Logo"
            width={200}
            height={200}
            priority
            className="drop-shadow-lg"
          />
        </div>

        {/* Título y descripción */}
        <div className="space-y-4">
        
          <p className="text-xl text-[#e7ceb9]">
            Panel de Administración
          </p>
          <p className="text-sm text-[#d4bfad] max-w-sm mx-auto">
            Sistema de gestión para clases, reservaciones, instructores y paquetes de RÔTÈ.
          </p>
        </div>

        {/* Botón de acceso */}
        <div className="space-y-4">
          <Link
            href="/login"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-[#330601] bg-[#e7ceb9] hover:bg-[#a75a4a] hover:text-[#e7ceb9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#a75a4a] focus:ring-offset-[#863010] transition-all duration-200 transform hover:scale-105"
          >
            Acceder al Dashboard
          </Link>
          
          <p className="text-xs text-[#8a6b63]">
            Ingresa con tu cuenta de administrador
          </p>
        </div>

        {/* Footer */}
        <div className="pt-8">
         
        </div>
      </div>
    </div>
  );
}
