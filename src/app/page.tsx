import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
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
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Hundred
          </h1>
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
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-gray-900 transition-all duration-200 transform hover:scale-105"
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

      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-600/20 to-cyan-600/20 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
