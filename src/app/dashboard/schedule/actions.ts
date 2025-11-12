'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Acción para generar clases semanales usando service role key (admin)
export async function generateWeeklyClasses(startDateISO: string) {
  const supabase = createAdminClient();

  if (!startDateISO) {
    return { error: 'Fecha de inicio inválida.' };
  }

  const { error } = await supabase.rpc('generate_weekly_classes', {
    start_date_input: startDateISO,
  });

  if (error) {
    console.error('Error al generar clases semanales:', error);
    return { error: `Error de base de datos: ${error.message}` };
  }

  // Revalidar para reflejar cualquier cambio derivado
  revalidatePath('/dashboard/schedule');
  return { message: `Clases generadas o ya existentes para la semana que inicia en ${startDateISO}.` };
}

// Acción para añadir una entrada al horario por defecto (actualizada)
export async function addDefaultScheduleEntry(formData: FormData) {
  const supabase = createAdminClient();

  const rawFormData = {
    weekday: formData.get('weekday') as string,
    start_time: formData.get('start_time') as string,
    end_time: formData.get('end_time') as string,
    instructor_id: formData.get('instructor_id') as string,
    location_id: formData.get('location_id') as string | null,
    class_name: formData.get('class_name') as string | null,
  };

  // Validación básica actualizada
  if (!rawFormData.weekday || !rawFormData.start_time || !rawFormData.end_time || !rawFormData.instructor_id) {
    return { error: 'Missing required fields.' };
  }

  const insertData: any = {
    weekday: rawFormData.weekday,
    start_time: rawFormData.start_time,
    end_time: rawFormData.end_time,
    instructor_id: rawFormData.instructor_id,
  };

  if (rawFormData.location_id) {
    insertData.location_id = rawFormData.location_id;
  }

  if (rawFormData.class_name) {
    insertData.class_name = rawFormData.class_name;
  }

  const { error } = await supabase.from('class_schedules').insert(insertData);

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
    const supabase = createAdminClient();

    if (!id) {
        return { error: 'Invalid ID.' };
    }

    // Eliminar el horario directamente
    // Ya no hay foreign key constraint porque las clases no referencian schedule_id
    const { error } = await supabase.from('class_schedules').delete().match({ id });

    if (error) {
        console.error('Error deleting default schedule entry:', error);
        return { error: `Database Error: ${error.message}` };
    }

    revalidatePath('/dashboard/schedule');
    return { message: 'Horario eliminado correctamente.' };
}

// Acción para actualizar una entrada del horario por defecto
export async function updateDefaultScheduleEntry(id: string, formData: FormData) {
  const supabase = createAdminClient();

  if (!id) {
    return { error: 'ID inválido.' };
  }

  const rawFormData = {
    weekday: formData.get('weekday') as string,
    start_time: formData.get('start_time') as string,
    end_time: formData.get('end_time') as string,
    instructor_id: formData.get('instructor_id') as string,
    location_id: formData.get('location_id') as string | null,
    class_name: formData.get('class_name') as string | null,
  };

  // Validación básica
  if (!rawFormData.weekday || !rawFormData.start_time || !rawFormData.end_time || !rawFormData.instructor_id) {
    return { error: 'Todos los campos son obligatorios.' };
  }

  const updateData: any = {
    weekday: rawFormData.weekday,
    start_time: rawFormData.start_time,
    end_time: rawFormData.end_time,
    instructor_id: rawFormData.instructor_id,
  };

  if (rawFormData.location_id) {
    updateData.location_id = rawFormData.location_id;
  } else {
    updateData.location_id = null;
  }

  if (rawFormData.class_name) {
    updateData.class_name = rawFormData.class_name;
  } else {
    updateData.class_name = null;
  }

  const { error } = await supabase
    .from('class_schedules')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating schedule entry:', error);
    return { error: `Error de base de datos: ${error.message}` };
  }

  revalidatePath('/dashboard/schedule');
  return { message: 'Horario actualizado correctamente.' };
} 