import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import ScheduleClient from './_components/ScheduleClient'; // Crearemos este componente cliente

// Tipos actualizados
export type Instructor = {
  id: string;
  name: string;
};

export type DefaultScheduleEntry = {
  id: string;
  weekday: string;
  start_time: string;
  end_time: string;
  instructor_id: string;
  location_id: string | null;
  instructors: {
    name: string;
  } | null;
  locations: {
    name: string;
  } | null;
};

export default async function SchedulePage() {
  const supabase = createAdminClient();

  // Fetch instructores para el formulario
  const { data: instructors, error: instructorsError } = await supabase
    .from('instructors')
    .select('id, name')
    .order('name', { ascending: true })
    .returns<Instructor[]>();

  // Fetch default schedule actual con orden correcto de días
  const { data: defaultSchedule, error: scheduleError } = await supabase
    .from('class_schedules')
    .select(`
      id,
      weekday,
      start_time,
      end_time,
      instructor_id,
      location_id,
      instructors ( name ),
      locations ( name )
    `)
    .returns<DefaultScheduleEntry[]>();

  // Ordenar los datos en el cliente para asegurar el orden correcto
  let orderedSchedule = defaultSchedule;
  
  if (defaultSchedule && !scheduleError) {
    // Definir el orden correcto de los días
    const dayOrder = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 7,
      'Lunes': 1,
      'Martes': 2,
      'Miércoles': 3,
      'Jueves': 4,
      'Viernes': 5,
      'Sábado': 6,
      'Domingo': 7
    };

    // Ordenar en el cliente para asegurar el orden correcto
    orderedSchedule = [...defaultSchedule].sort((a, b) => {
      const dayA = dayOrder[a.weekday as keyof typeof dayOrder] || 999;
      const dayB = dayOrder[b.weekday as keyof typeof dayOrder] || 999;
      
      if (dayA !== dayB) {
        return dayA - dayB;
      }
      
      // Si es el mismo día, ordenar por hora
      return a.start_time.localeCompare(b.start_time);
    });
  }

  if (instructorsError) {
    console.error("Error fetching instructors:", instructorsError);
    // Manejar error
  }
  if (scheduleError) {
    console.error("Error fetching default schedule:", scheduleError);
    // Manejar error
  }

  return (
    <ScheduleClient
      initialDefaultSchedule={orderedSchedule ?? []}
      instructors={instructors ?? []}
    />
  );
} 