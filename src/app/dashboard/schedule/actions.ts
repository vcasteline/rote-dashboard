'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Acción para añadir una entrada al horario por defecto (actualizada)
export async function addDefaultScheduleEntry(formData: FormData) {
  const cookieStore = cookies();
  const supabase = await createClient();

  const rawFormData = {
    weekday: formData.get('weekday') as string,
    start_time: formData.get('start_time') as string,
    end_time: formData.get('end_time') as string,
    instructor_id: formData.get('instructor_id') as string,
  };

  // Validación básica actualizada
  if (!rawFormData.weekday || !rawFormData.start_time || !rawFormData.end_time || !rawFormData.instructor_id) {
    return { error: 'Missing required fields.' };
  }

  const { error } = await supabase.from('class_schedules').insert(rawFormData);

  if (error) {
    console.error('Error adding default schedule entry:', error);
    return { error: `Database Error: ${error.message}` };
  }

  // Revalidar la ruta para que la tabla se actualice
  revalidatePath('/dashboard/schedule');
  return { message: 'Entry added successfully.' };
}

// Acción para eliminar una entrada del horario por defecto
export async function deleteDefaultScheduleEntry(id: string) {
    const cookieStore = cookies();
    const supabase = await createClient();

    if (!id) {
        return { error: 'Invalid ID.' };
    }

    const { error } = await supabase.from('class_schedules').delete().match({ id });

    if (error) {
        console.error('Error deleting default schedule entry:', error);
        return { error: `Database Error: ${error.message}` };
    }

    revalidatePath('/dashboard/schedule');
    return { message: 'Entry deleted successfully.' };
} 