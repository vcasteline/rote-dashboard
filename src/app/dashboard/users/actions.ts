'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  birthday: string | null;
  cedula: string | null;
  created_at: string;
  shoe_size: string | null;
  purchase_count: number;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  class_credits: number;
  expiration_days: number | null;
}

export async function getUsersWithPurchaseCount(params?: {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
}): Promise<{ users: User[]; total: number }> {
  const supabase = createAdminClient();

  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, Math.min(200, params?.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    let query = supabase
      .rpc('get_users_with_purchase_count', {}, { count: 'exact' as const })
      .order('created_at', { ascending: false })
      .range(from, to);

    const term = (params?.searchTerm || '').trim();
    if (term) {
      const like = `%${term}%`;
      // Buscar por múltiples columnas
      query = query.or(
        [
          `name.ilike.${like}`,
          `email.ilike.${like}`,
          `phone.ilike.${like}`,
          `address.ilike.${like}`,
          `cedula.ilike.${like}`,
          `shoe_size.ilike.${like}`,
        ].join(',')
      );
    }

    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching users with purchase count:', error);
      return { users: [], total: 0 };
    }
    
    return { users: (data as User[]) || [], total: count ?? 0 };
  } catch (error) {
    console.error('Error in getUsersWithPurchaseCount:', error);
    return { users: [], total: 0 };
  }
}

export async function getAvailablePackages(): Promise<Package[]> {
  const supabase = createAdminClient();
  
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching packages:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getAvailablePackages:', error);
    return [];
  }
}

// Función para generar contraseña automática
function generatePassword(fullName: string): string {
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : firstName;
  const initial = firstName.charAt(0).toUpperCase();
  
  // Formato: apellido-<inicial>25
  return `${lastName.toLowerCase()}-${initial}25`;
}

export async function createUser(userData: {
  email: string;
  name: string;
  phone?: string;
  address?: string;
  birthday?: string;
  cedula?: string;
  shoe_size?: string;
}): Promise<{ success: boolean; user?: User; error?: string; password?: string }> {
  const supabase = createAdminClient();
  const adminClient = createAdminClient();
  
  try {
    // Verificar si el usuario ya existe en la tabla users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single();
    
    if (existingUser) {
      return { success: false, error: 'Ya existe un usuario con este email' };
    }

    // Generar contraseña automática
    const generatedPassword = generatePassword(userData.name);
    
    // Crear usuario en Supabase Auth (el trigger automáticamente creará en tabla pública)
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: userData.email,
      password: generatedPassword,
      email_confirm: true, // Auto-confirmar el email
      user_metadata: {
        name: userData.name,
        phone: userData.phone || null,
        address: userData.address || null,
        birthday: userData.birthday || null,
        cedula: userData.cedula || null,
        shoe_size: userData.shoe_size || null,
      }
    });
    
    if (authError) {
      console.error('Error creating auth user:', authError);
      if (authError.message.includes('already registered')) {
        return { success: false, error: 'Ya existe un usuario con este email en el sistema de autenticación' };
      }
      return { success: false, error: 'Error al crear el usuario en el sistema de autenticación' };
    }

    // El trigger automáticamente crea el usuario en la tabla pública (incluyendo shoe_size)
    // Esperar un momento para que el trigger se ejecute
    await new Promise(resolve => setTimeout(resolve, 500));

    // Obtener el usuario creado por el trigger
    const { data: newUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.user.id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching created user:', fetchError);
      return { success: false, error: 'Usuario creado pero error al obtener datos' };
    }
    
    // Revalidate the users page
    revalidatePath('/dashboard/users');
    
    return { 
      success: true, 
      user: {
        ...newUser,
        purchase_count: 0
      },
      password: generatedPassword
    };
  } catch (error) {
    console.error('Error in createUser:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

export async function assignPackageToUser(userData: {
  user_id: string;
  package_id: string;
  transaction_id?: string;
  authorization_code?: string;
  contabilidad?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  
  try {
    // Obtener información del paquete
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', userData.package_id)
      .single();
    
    if (packageError || !packageData) {
      return { success: false, error: 'Paquete no encontrado' };
    }
    
    // Calcular fecha de expiración
    let expirationDate = null;
    if (packageData.expiration_days) {
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + packageData.expiration_days);
      expirationDate = expiration.toISOString();
    }
    
    // Crear la compra
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert([{
        user_id: userData.user_id,
        package_id: userData.package_id,
        credits_remaining: packageData.class_credits,
        expiration_date: expirationDate,
        transaction_id: userData.transaction_id || null,
        authorization_code: userData.authorization_code || null,
        contabilidad: userData.contabilidad || false,
      }])
      .select()
      .single();
    
    if (purchaseError) {
      console.error('Error creating purchase:', purchaseError);
      return { success: false, error: 'Error al asignar el paquete' };
    }
    
    // Revalidate related pages
    revalidatePath('/dashboard/users');
    revalidatePath('/dashboard/packages');
    
    return { success: true };
  } catch (error) {
    console.error('Error in assignPackageToUser:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

export async function createUserWithPackage(userData: {
  email: string;
  name: string;
  phone?: string;
  address?: string;
  birthday?: string;
  cedula?: string;
  shoe_size?: string;
}, packageData: {
  package_id: string;
  transaction_id?: string;
  authorization_code?: string;
  contabilidad?: boolean;
}): Promise<{ success: boolean; user?: User; error?: string; password?: string }> {
  const supabase = createAdminClient();
  const adminClient = createAdminClient();
  
  try {
    // Verificar si el usuario ya existe en la tabla users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single();
    
    if (existingUser) {
      return { success: false, error: 'Ya existe un usuario con este email' };
    }
    
    // Generar contraseña automática
    const generatedPassword = generatePassword(userData.name);
    
    // Crear usuario en Supabase Auth (el trigger automáticamente creará en tabla pública)
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: userData.email,
      password: generatedPassword,
      email_confirm: true, // Auto-confirmar el email
      user_metadata: {
        name: userData.name,
        phone: userData.phone || null,
        address: userData.address || null,
        birthday: userData.birthday || null,
        cedula: userData.cedula || null,
        shoe_size: userData.shoe_size || null,
      }
    });
    
    if (authError) {
      console.error('Error creating auth user:', authError);
      if (authError.message.includes('already registered')) {
        return { success: false, error: 'Ya existe un usuario con este email en el sistema de autenticación' };
      }
      return { success: false, error: 'Error al crear el usuario en el sistema de autenticación' };
    }
    
    // El trigger automáticamente crea el usuario en la tabla pública (incluyendo shoe_size)
    // Esperar un momento para que el trigger se ejecute
    await new Promise(resolve => setTimeout(resolve, 500));

    // Obtener el usuario creado por el trigger
    const { data: newUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.user.id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching created user:', fetchError);
      return { success: false, error: 'Usuario creado pero error al obtener datos' };
    }
    
    // Asignar el paquete al usuario
    const packageResult = await assignPackageToUser({
      user_id: newUser.id,
      package_id: packageData.package_id,
      transaction_id: packageData.transaction_id,
      authorization_code: packageData.authorization_code,
      contabilidad: packageData.contabilidad,
    });
    
    if (!packageResult.success) {
      // Si falla la asignación del paquete, eliminar el usuario creado
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      await supabase.from('users').delete().eq('id', newUser.id);
      return { success: false, error: packageResult.error };
    }
    
    // Revalidate related pages
    revalidatePath('/dashboard/users');
    revalidatePath('/dashboard/packages');
    
    return { 
      success: true, 
      user: {
        ...newUser,
        purchase_count: 1
      },
      password: generatedPassword
    };
  } catch (error) {
    console.error('Error in createUserWithPackage:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
} 

export async function getTodaysBirthdays(): Promise<User[]> {
  const supabase = createAdminClient();
  
  try {
    // Obtener fecha actual en zona horaria de Ecuador
    const now = new Date();
    const ecuadorTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    
    const [year, month, day] = ecuadorTime.split('-');
    const currentMonth = parseInt(month);
    const currentDay = parseInt(day);
    
    // Buscar usuarios cuyo cumpleaños sea hoy
    // Usamos una consulta SQL personalizada para manejar diferentes formatos de fecha
    const { data, error } = await supabase.rpc('get_todays_birthdays', {
      target_month: currentMonth,
      target_day: currentDay
    });
    
    if (error) {
      console.error('Error fetching birthdays:', error);
      // Si el RPC no existe, hacemos la consulta manualmente
      return await getTodaysBirthdaysManual(currentMonth, currentDay);
    }
    
    return (data as User[]) || [];
  } catch (error) {
    console.error('Error in getTodaysBirthdays:', error);
    return [];
  }
}

async function getTodaysBirthdaysManual(currentMonth: number, currentDay: number): Promise<User[]> {
  const supabase = createAdminClient();
  
  try {
    // Obtener todos los usuarios con fechas de nacimiento
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, phone, address, birthday, cedula, created_at, shoe_size')
      .not('birthday', 'is', null);
    
    if (error) {
      console.error('Error fetching users for birthday check:', error);
      return [];
    }
    
    // Filtrar en el servidor los usuarios que cumplen años hoy
    const birthdayUsers = (users || []).filter(user => {
      if (!user.birthday) return false;
      
      try {
        const cleanDate = user.birthday.trim();
        let month: number, day: number;
        
        // Parsear diferentes formatos de fecha
        if (/^\d{8}$/.test(cleanDate)) {
          // Formato DDMMYYYY
          day = parseInt(cleanDate.substring(0, 2));
          month = parseInt(cleanDate.substring(2, 4));
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanDate)) {
          // Formato DD/MM/YYYY
          const parts = cleanDate.split('/');
          day = parseInt(parts[0]);
          month = parseInt(parts[1]);
        } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleanDate)) {
          // Formato DD-MM-YYYY
          const parts = cleanDate.split('-');
          day = parseInt(parts[0]);
          month = parseInt(parts[1]);
        } else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(cleanDate)) {
          // Formato DD.MM.YYYY
          const parts = cleanDate.split('.');
          day = parseInt(parts[0]);
          month = parseInt(parts[1]);
        } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleanDate)) {
          // Formato YYYY-MM-DD
          const parts = cleanDate.split('-');
          day = parseInt(parts[2]);
          month = parseInt(parts[1]);
        } else if (/^\d{4}-\d{2}-\d{2}T/.test(cleanDate)) {
          // Formato ISO con tiempo
          const date = new Date(cleanDate);
          day = date.getUTCDate();
          month = date.getUTCMonth() + 1;
        } else {
          return false;
        }
        
        return day === currentDay && month === currentMonth;
      } catch (error) {
        return false;
      }
    });
    
    // Agregar purchase_count = 0 para mantener compatibilidad con el tipo User
    return birthdayUsers.map(user => ({
      ...user,
      purchase_count: 0
    }));
  } catch (error) {
    console.error('Error in getTodaysBirthdaysManual:', error);
    return [];
  }
}

export async function updateUser(userId: string, userData: {
  name?: string;
  phone?: string;
  address?: string;
  birthday?: string;
  cedula?: string;
  shoe_size?: string;
}): Promise<{ success: boolean; user?: User; error?: string }> {
  const supabase = createAdminClient();
  const adminClient = createAdminClient();
  
  try {
    // Primero obtener el usuario actual
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (fetchError || !currentUser) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Actualizar en la tabla users
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        name: userData.name || currentUser.name,
        phone: userData.phone || null,
        address: userData.address || null,
        birthday: userData.birthday || null,
        cedula: userData.cedula || null,
        shoe_size: userData.shoe_size || null,
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating user in public table:', updateError);
      return { success: false, error: 'Error al actualizar el usuario' };
    }

    // También actualizar en Auth user metadata
    try {
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          name: userData.name || currentUser.name,
          phone: userData.phone || null,
          address: userData.address || null,
          birthday: userData.birthday || null,
          cedula: userData.cedula || null,
          shoe_size: userData.shoe_size || null,
        }
      });
    } catch (authError) {
      console.error('Error updating auth user metadata:', authError);
      // No fallar si el update de auth falla, ya que el usuario ya está actualizado en la tabla pública
    }
    
    // Revalidate the users page
    revalidatePath('/dashboard/users');
    
    return { 
      success: true, 
      user: {
        ...updatedUser,
        purchase_count: currentUser.purchase_count || 0
      }
    };
  } catch (error) {
    console.error('Error in updateUser:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

 