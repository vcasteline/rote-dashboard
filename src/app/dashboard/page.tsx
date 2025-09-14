import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import ClassesClient from './_components/ClassesClient';
import { getNowInEcuador, toISOString } from '@/lib/utils/dateUtils';

// Tipo actualizado para los datos de la clase
export type ClassData = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  name: string | null;
  instructor_id: string;
  instructors: {
    name: string;
  } | null;
};

// Tipo para instructores
export type Instructor = {
  id: string;
  name: string;
};

export default async function DashboardPage() {
  const supabase = createAdminClient();

  // Obtener la fecha actual en Ecuador (solo la fecha, sin hora)
  const todayInEcuador = toISOString(getNowInEcuador()).split('T')[0];

  console.log('Fecha actual en Ecuador:', todayInEcuador); // Para debug

  // Obtener clases desde hoy en adelante (solo las no canceladas)
  const { data: classes, error } = await supabase
    .from('classes')
    .select(`
      id,
      date,
      start_time,
      end_time,
      name,
      instructor_id,
      instructors ( name )
    `)
    .gte('date', todayInEcuador) // Cambiar a desde hoy en adelante
    .eq('is_cancelled', false)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .returns<ClassData[]>();

  // Obtener instructores para el formulario
  const { data: instructors, error: instructorsError } = await supabase
    .from('instructors')
    .select('id, name')
    .order('name')
    .returns<Instructor[]>();

  if (error) {
    console.error('Error fetching classes:', error);
  }

  if (instructorsError) {
    console.error('Error fetching instructors:', instructorsError);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Próximas Clases</h1>
      {error ? (
        <p className="text-red-500">No se pudieron cargar las clases. Intenta más tarde.</p>
      ) : (
        <ClassesClient 
          initialClasses={classes ?? []} 
          instructors={instructors ?? []}
        />
      )}
    </div>
  );
} 