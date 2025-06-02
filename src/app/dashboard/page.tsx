import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { format } from 'date-fns'; // Necesitaremos date-fns para formatear
import ClassesClient from './_components/ClassesClient'; // Crearemos este
// Tipo actualizado para los datos de la clase
export type ClassData = {
  id: string;
  date: string;
  start_time: string; // Actualizado
  end_time: string;   // Actualizado
  name: string | null; // Añadido
  instructors: {
    name: string;
  } | null;
};

export default async function DashboardPage() {
  const cookieStore = cookies();
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data: classes, error } = await supabase
    .from('classes')
    .select(`
      id,
      date,
      start_time,
      end_time,
      name,
      instructors ( name )
    `)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .returns<ClassData[]>();

  if (error) {
    console.error('Error fetching classes:', error);
    // Podríamos mostrar un mensaje de error en el cliente
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Próximas Clases</h1>
      {error ? (
        <p className="text-red-500">No se pudieron cargar las clases. Intenta más tarde.</p>
      ) : (
        <ClassesClient initialClasses={classes ?? []} />
      )}
    </div>
  );
} 