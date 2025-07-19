'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createEcuadorDateTime } from '@/lib/utils/dateUtils';

// Esquema de validación para nueva clase
const createClassSchema = z.object({
  date: z.string().min(1, 'La fecha es requerida'),
  start_time: z.string().min(1, 'La hora de inicio es requerida'),
  end_time: z.string().min(1, 'La hora de fin es requerida'),
  instructor_id: z.string().min(1, 'El instructor es requerido'),
  name: z.string().nullable().optional(),
});

// Acción para crear una nueva clase
export async function createClass(formData: FormData) {
  const supabase = createAdminClient();

  // Validar datos de entrada
  const validatedFields = createClassSchema.safeParse({
    date: formData.get('date'),
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
    instructor_id: formData.get('instructor_id'),
    name: formData.get('name') || null,
  });

  if (!validatedFields.success) {
    const errors = validatedFields.error.flatten().fieldErrors;
    return { 
      error: `Errores de validación: ${Object.values(errors).flat().join(', ')}`,
      fieldErrors: errors
    };
  }

  const { date, start_time, end_time, instructor_id, name } = validatedFields.data;

  // Usar Luxon para verificar que la hora de fin sea después de la hora de inicio
  const startDateTime = createEcuadorDateTime(date, start_time);
  const endDateTime = createEcuadorDateTime(date, end_time);
  
  if (endDateTime <= startDateTime) {
    return { error: 'La hora de fin debe ser posterior a la hora de inicio' };
  }

  // Verificar si ya existe una clase en esa fecha y horario con el mismo instructor
  const { data: existingClass } = await supabase
    .from('classes')
    .select('id')
    .eq('date', date)
    .eq('instructor_id', instructor_id)
    .or(`and(start_time.lte.${start_time},end_time.gt.${start_time}),and(start_time.lt.${end_time},end_time.gte.${end_time}),and(start_time.gte.${start_time},end_time.lte.${end_time})`)
    .single();

  if (existingClass) {
    return { error: 'Ya existe una clase programada para este instructor en este horario' };
  }

  // Crear la nueva clase
  const { error } = await supabase
    .from('classes')
    .insert({
      date,
      start_time,
      end_time,
      instructor_id,
      name,
    });

  if (error) {
    console.error('Error creating class:', error);
    return { error: `Error al crear la clase: ${error.message}` };
  }

  revalidatePath('/dashboard');
  return { message: 'Clase creada exitosamente' };
}

// Acción para obtener instructores
export async function getInstructors() {
  const supabase = createAdminClient();

  // Obtener solo instructors activos (no eliminados)
  const { data: instructors, error } = await supabase
    .from('instructors')
    .select('id, name')
    .is('deleted_at', null) // Solo instructors no eliminados
    .order('name');

  if (error) {
    console.error('Error fetching instructors:', error);
    return { error: 'Error al obtener instructores' };
  }

  return { instructors };
}

// Acción para actualizar el nombre de una clase
export async function updateClassName(id: string, newName: string | null) {
  const supabase = createAdminClient();

  if (!id) {
    return { error: 'Invalid Class ID.' };
  }

  // Permitir null o string no vacío para el nombre
  const nameToUpdate = newName?.trim() === '' ? null : newName;

  const { error } = await supabase
    .from('classes')
    .update({ name: nameToUpdate })
    .match({ id });

  if (error) {
    console.error('Error updating class name:', error);
    return { error: `Database Error: ${error.message}` };
  }

  revalidatePath('/dashboard');
  return { message: 'Class name updated.' };
}

// Acción para borrar una clase junto con sus bicis
export async function deleteClass(classId: string) {
  const supabase = createAdminClient();

  if (!classId) {
    return { error: 'ID de clase requerido' };
  }

  try {
    // Llamar a la función de PostgreSQL
    const { data, error } = await supabase.rpc('delete_class_with_bikes', {
      class_id_param: classId
    });

    if (error) {
      console.error('Error calling delete function:', error);
      return { error: `Error al borrar la clase: ${error.message}` };
    }

    // La función retorna un JSON con success y message/error
    if (data.success) {
      revalidatePath('/dashboard');
      
      // Mensaje más específico según la acción realizada
      let message = data.message;
      if (data.action === 'deleted') {
        message = `Clase borrada completamente. ${data.bikes_deleted} bici(s) eliminada(s).`;
      } else if (data.action === 'cancelled') {
        message = `Clase marcada como cancelada (historial preservado). ${data.bikes_deleted} bici(s) eliminada(s).`;
      }
      
      return { message, bikesDeleted: data.bikes_deleted, action: data.action };
    } else {
      return { error: data.error };
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return { error: 'Error interno del servidor' };
  }
} 