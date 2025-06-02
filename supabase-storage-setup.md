# Configuración de Supabase Storage para Fotos de Instructores

## 1. Crear el Bucket

Ve a tu dashboard de Supabase > Storage > Create a new bucket

**Configuración del bucket:**
- **Name:** `instructor-photos`
- **Public bucket:** ✅ Activado (para que las imágenes sean accesibles públicamente)
- **File size limit:** 5MB
- **Allowed MIME types:** `image/jpeg,image/jpg,image/png,image/webp`

## 2. Configurar Políticas de Seguridad (RLS)

Ve a Storage > instructor-photos > Policies

### Política para SELECT (ver imágenes) - Pública
```sql
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'instructor-photos');
```

### Política para INSERT (subir imágenes) - Solo autenticados
```sql
CREATE POLICY "Authenticated users can upload instructor photos" ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'instructor-photos');
```

### Política para UPDATE (actualizar imágenes) - Solo autenticados
```sql
CREATE POLICY "Authenticated users can update instructor photos" ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'instructor-photos');
```

### Política para DELETE (eliminar imágenes) - Solo autenticados
```sql
CREATE POLICY "Authenticated users can delete instructor photos" ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'instructor-photos');
```

## 3. Configuración Alternativa (Manual)

Si prefieres crear el bucket manualmente desde SQL:

```sql
-- Crear el bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('instructor-photos', 'instructor-photos', true);

-- Aplicar todas las políticas
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'instructor-photos');

CREATE POLICY "Authenticated users can upload instructor photos" ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'instructor-photos');

CREATE POLICY "Authenticated users can update instructor photos" ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'instructor-photos');

CREATE POLICY "Authenticated users can delete instructor photos" ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'instructor-photos');
```

## 4. Verificación

Después de crear el bucket y las políticas, verifica que:

1. ✅ El bucket `instructor-photos` aparece en tu Storage
2. ✅ Las políticas están activas
3. ✅ El bucket está configurado como público
4. ✅ Los usuarios autenticados pueden subir archivos

## 5. URL de las Imágenes

Las imágenes se guardarán con URLs en este formato:
```
https://[tu-project-id].supabase.co/storage/v1/object/public/instructor-photos/[nombre-archivo]
```

## 6. Limpieza de Archivos Huérfanos (Opcional)

Para eliminar archivos que ya no estén referenciados en la base de datos, puedes crear una función:

```sql
CREATE OR REPLACE FUNCTION clean_orphaned_instructor_photos()
RETURNS void AS $$
DECLARE
    orphaned_file text;
BEGIN
    FOR orphaned_file IN 
        SELECT name FROM storage.objects 
        WHERE bucket_id = 'instructor-photos' 
        AND name NOT IN (
            SELECT substring(profile_picture_url from '[^/]+$') 
            FROM instructors 
            WHERE profile_picture_url IS NOT NULL 
            AND profile_picture_url LIKE '%instructor-photos%'
        )
    LOOP
        DELETE FROM storage.objects 
        WHERE bucket_id = 'instructor-photos' AND name = orphaned_file;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
``` 