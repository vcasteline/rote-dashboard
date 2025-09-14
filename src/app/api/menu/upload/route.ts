import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  console.log('=== DEBUG MENU UPLOAD ===');
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const menuItemId = formData.get('id') as string;

    console.log('File:', file?.name, file?.size, file?.type);
    console.log('Menu Item ID:', menuItemId);

    if (!file || !menuItemId) {
      console.log('Missing file or menuItemId');
      return NextResponse.json({ 
        success: false, 
        error: 'Archivo y ID del ítem son requeridos' 
      }, { status: 400 });
    }

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Solo se permiten archivos de imagen' 
      }, { status: 400 });
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        success: false, 
        error: 'El archivo es demasiado grande (máximo 5MB)' 
      }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar que el ítem del menú existe
    const { data: menuItem, error: menuError } = await supabase
      .from('menu')
      .select('id, image')
      .eq('id', menuItemId)
      .single();

    if (menuError || !menuItem) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ítem del menú no encontrado' 
      }, { status: 404 });
    }

    // Si ya tiene una imagen, eliminar la anterior
    if (menuItem.image) {
      await supabase.storage
        .from('menu')
        .remove([menuItem.image]);
    }

    // Generar nombre único para el archivo
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${menuItemId}.${fileExtension}`;

    // Subir nueva imagen
    console.log('Uploading file:', fileName, 'to bucket: menu');
    const { error: uploadError } = await supabase.storage
      .from('menu')
      .upload(fileName, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return NextResponse.json({ 
        success: false, 
        error: `Error al subir la imagen: ${uploadError.message}` 
      }, { status: 500 });
    }

    // Actualizar la tabla menu con el path de la imagen
    const { data: updatedItem, error: updateError } = await supabase
      .from('menu')
      .update({ image: fileName })
      .eq('id', menuItemId)
      .select('id, name, description, in_stock, price, image')
      .single();

    if (updateError) {
      console.error('Error updating menu item:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Error al actualizar el ítem del menú' 
      }, { status: 500 });
    }

    // Formatear la respuesta
    const formattedItem = {
      id: updatedItem.id,
      name: updatedItem.name,
      description: updatedItem.description || null,
      in_stock: Boolean(updatedItem.in_stock),
      price: typeof updatedItem.price === 'string' ? parseFloat(updatedItem.price) : updatedItem.price,
      image: updatedItem.image || null,
    };

    return NextResponse.json({
      success: true,
      item: formattedItem,
      message: 'Imagen subida correctamente'
    });

  } catch (error) {
    console.error('Error in upload route:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
