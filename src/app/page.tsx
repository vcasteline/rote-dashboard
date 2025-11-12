import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#1d1d1d] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo de Hundred */}
        <div className="flex justify-center">
          <Image
            src="/hundred-logo.png"
            alt="Hundred Logo"
            width={200}
            height={200}
            priority
            className="drop-shadow-lg"
          />
        </div>

        {/* Título y descripción */}
        <div className="space-y-4">
        
          <p className="text-xl text-gray-300">
            Panel de Administración
          </p>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Sistema de gestión para clases, reservaciones, instructores y paquetes de Hundred.
          </p>
        </div>

        {/* Botón de acceso */}
        <div className="space-y-4">
          <Link
            href="/login"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-[#D7BAF6] hover:bg-[#8B7EE6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D7BAF6] focus:ring-offset-[#1d1d1d] transition-all duration-200 transform hover:scale-105"
          >
            Acceder al Dashboard
          </Link>
          
          <p className="text-xs text-gray-500">
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
