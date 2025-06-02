import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import InstructorsClient from './_components/InstructorsClient'; // Crearemos este

// Tipo para Instructor (puede ser compartido o redefinido)
export type Instructor = {
  id: string;
  name: string;
  profile_picture_url: string | null;
};

export default async function InstructorsPage() {
  const cookieStore = cookies();
  const supabase = await createClient();

  const { data: instructors, error } = await supabase
    .from('instructors')
    .select('id, name, profile_picture_url')
    .order('name', { ascending: true })
    .returns<Instructor[]>();

  if (error) {
    console.error("Error fetching instructors:", error);
    // Manejar error, tal vez mostrar un mensaje en el cliente
  }

  return (
     <InstructorsClient initialInstructors={instructors ?? []} />
  );
} 