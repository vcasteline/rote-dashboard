'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertTriangle, User, Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unauthorizedUser, setUnauthorizedUser] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Función para verificar si un email está autorizado
  const checkEmailAuthorization = async (email: string) => {
    try {
      const response = await fetch('/api/auth/check-authorized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      return data.isAuthorized;
    } catch (error) {
      console.error('Error verificando autorización:', error);
      return false;
    }
  };

  // Verificar si el usuario ya está autenticado pero no autorizado
  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email) {
        const isAuthorized = await checkEmailAuthorization(user.email);
        
        if (!isAuthorized) {
          setUnauthorizedUser(user.email);
        }
      }
    };

    checkAuthStatus();
  }, [supabase]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      // Traducir mensaje común de error de Supabase
      setError(error.message === 'Invalid login credentials' ? 'Credenciales inválidas' : error.message);
    } else {
      // Verificar si el email está autorizado
      const isAuthorized = await checkEmailAuthorization(email);
      
      if (!isAuthorized) {
        setUnauthorizedUser(email);
      } else {
        router.refresh(); // Middleware redirigirá al dashboard
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUnauthorizedUser(null);
    setEmail('');
    setPassword('');
    router.refresh();
  };

  // Si hay un usuario no autorizado, mostrar mensaje con diseño mejorado
  if (unauthorizedUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-white to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
              Acceso Restringido
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-gray-600 mb-2 text-sm">
                Sesión iniciada como:
              </p>
              <div className="flex items-center justify-center space-x-2 bg-white rounded-lg p-3">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-800 text-sm">
                  {unauthorizedUser}
                </span>
              </div>
            </div>
            
            <p className="text-gray-600 mb-8 leading-relaxed">
              Esta cuenta no tiene permisos para acceder al panel de administración de Giro.
            </p>

            <button
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-[#6758C2] to-[#5A4CB8] text-white py-3 px-6 rounded-xl hover:from-[#5A4CB8] hover:to-[#4A3D9A] transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            >
              <LogIn className="w-5 h-5" />
              <span>Intentar con Otra Cuenta</span>
            </button>
            
            <p className="text-xs text-gray-500 mt-6 leading-relaxed">
              Si necesitas acceso, contacta al administrador del sistema
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Panel izquierdo - Branding */}
        <div className="hidden md:block">
          <div className="text-center">
            <div className="mb-8">
              <img 
                src="/logo-purple.png" 
                alt="Giro Indoor Cycling Studio" 
                className="mx-auto h-48 w-auto mb-6"
              />
              <p className="text-xl text-gray-600 leading-relaxed">
                Panel de administración para gestionar tu estudio de spinning
              </p>
            </div>
          </div>
        </div>

        {/* Panel derecho - Formulario de login */}
        <div className="flex justify-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 w-full max-w-md">
            {/* Header del formulario */}
            <div className="text-center mb-8">
              <div className="md:hidden inline-flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#6758C2] to-[#5A4CB8] rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-[#6758C2] to-[#5A4CB8] bg-clip-text text-transparent">
                  Giro Admin
                </span>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Iniciar Sesión
              </h3>
              <p className="text-gray-600">
                Ingresa tus credenciales para acceder
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Campo de email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 text-gray-900 placeholder-gray-500 transition-all duration-200"
                    placeholder="admin@giro.com"
                  />
                </div>
              </div>

              {/* Campo de contraseña */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6758C2] focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 text-gray-900 placeholder-gray-500 transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Botón de login */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#6758C2] to-[#5A4CB8] text-white py-3 px-6 rounded-xl hover:from-[#5A4CB8] hover:to-[#4A3D9A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6758C2] disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Ingresando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Ingresar al Panel</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                Panel exclusivo para administradores autorizados
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 