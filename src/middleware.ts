import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // createSupabaseClient necesita acceso a las cookies
  // para poder leer/escribir la sesión
  const supabase = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Si se usa server-side rendering, necesitamos establecer
          // la cookie tanto en el request como en la response
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Si se usa server-side rendering, necesitamos eliminar
          // la cookie tanto del request como de la response
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresca la sesión si ha expirado - importante para Server Components
  // ¡Asegúrate de manejar el caso donde getUser() puede lanzar un error!
  try {
      await supabase.auth.getUser();
  } catch (error) {
      console.error("Error fetching user in middleware:", error);
      // Opcional: redirigir a una página de error o login si falla la obtención del usuario
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Rutas protegidas
  const protectedPaths = ['/dashboard'];
  const currentPath = request.nextUrl.pathname;

  // Si no hay usuario y la ruta es protegida, redirige a /login
  if (!user && protectedPaths.some(path => currentPath.startsWith(path))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si hay usuario, verificar si está autorizado para acceder al dashboard
  if (user && protectedPaths.some(path => currentPath.startsWith(path))) {
    const authorizedEmails = process.env.AUTHORIZED_EMAILS?.split(',').map(email => email.trim()) || [];
    const userEmail = user.email;

    if (!userEmail || !authorizedEmails.includes(userEmail)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Si hay usuario autorizado y está en /login, redirige a /dashboard
  if (user && currentPath === '/login') {
    const authorizedEmails = process.env.AUTHORIZED_EMAILS?.split(',').map(email => email.trim()) || [];
    const userEmail = user.email;

    // Solo redirigir al dashboard si el usuario está autorizado
    if (userEmail && authorizedEmails.includes(userEmail)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Si no está autorizado, permitir que permanezca en /login
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 