# ⏰ Configuración de Cron Jobs para Rote Dashboard

Este documento explica cómo configurar y desplegar los cron jobs automatizados para el sistema de Rote.

## 📋 **Cron Jobs Implementados**

### 1. **Complete Past Classes** 
- **Función**: `complete-past-classes`
- **Frecuencia**: Cada 30 minutos
- **Propósito**: Marcar reservaciones como "completed" y cancelar waitlist de clases que ya terminaron
- **Horario Ecuador**: Horario de Ecuador (UTC-5)

### 2. **Generate Weekly Classes**
- **Función**: `generate-weekly-classes` 
- **Frecuencia**: Domingos a las 12:00 PM (Ecuador)
- **Propósito**: Crear automáticamente las clases de la próxima semana
- **Lógica**: Busca el próximo lunes y genera clases basadas en `class_schedules`

### 3. **Cleanup Data**
- **Función**: `cleanup-data`
- **Frecuencia**: Diario a las 2:00 AM (Ecuador)
- **Propósito**: Limpiar datos antiguos y mantener la base de datos optimizada
- **Incluye**:
  - Reservaciones canceladas (>6 meses)
  - Créditos expirados
  - Notificaciones enviadas (>3 meses)
  - Fotos huérfanas de instructores
  - Clases antiguas sin reservaciones (>1 año)

### 4. **Class Reminders**
- **Función**: `class-reminders`
- **Frecuencia**: Cada hora
- **Propósito**: Crear recordatorios para clases que empiezan en las próximas 2 horas
- **Funcionalidad**: Crea notificaciones en la tabla `notifications`

### 5. **Send Push Notifications** ⭐ **NUEVO**
- **Función**: `send-push-notifications`
- **Frecuencia**: Cada 5 minutos
- **Propósito**: Enviar push notifications a través de Expo a usuarios con notificaciones pendientes
- **Funcionalidad**: Lee notificaciones con `sent=false` y las envía como push notifications

## 🚀 **Pasos para Desplegar**

### 1. Instalar Supabase CLI
```bash
npm install -g supabase
supabase login
```

### 2. Inicializar proyecto (si no está hecho)
```bash
cd rote-admin-dashboard
supabase init
```

### 3. Configurar las funciones
```bash
# Desplegar todas las Edge Functions
supabase functions deploy complete-past-classes
supabase functions deploy generate-weekly-classes  
supabase functions deploy cleanup-data
supabase functions deploy class-reminders
supabase functions deploy send-push-notifications
```

### 4. Actualizar schema de usuarios
```sql
-- Agregar campo para push tokens
ALTER TABLE users ADD COLUMN push_token TEXT;
```

### 5. Configurar Cron Jobs en Supabase

Ve a tu **Dashboard de Supabase** > **Database** > **Extensions** y habilita `pg_cron`.

Luego ejecuta estos SQL commands:

```sql
-- 1. Complete Past Classes (cada 30 minutos)
SELECT cron.schedule(
  'complete-past-classes',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/complete-past-classes',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 'YOUR_SERVICE_ROLE_KEY' || '"}',
      body := '{}'
    ) as request_id;
  $$
);

-- 2. Generate Weekly Classes (domingos 12:00 PM Ecuador = 17:00 UTC)
SELECT cron.schedule(
  'generate-weekly-classes',
  '0 17 * * 0',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/generate-weekly-classes',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 'YOUR_SERVICE_ROLE_KEY' || '"}',
      body := '{}'
    ) as request_id;
  $$
);

-- 3. Cleanup Data (diario 2:00 AM Ecuador = 7:00 AM UTC)
SELECT cron.schedule(
  'cleanup-data',
  '0 7 * * *',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/cleanup-data',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 'YOUR_SERVICE_ROLE_KEY' || '"}',
      body := '{}'
    ) as request_id;
  $$
);

-- 4. Class Reminders (cada hora)
SELECT cron.schedule(
  'class-reminders',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/class-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 'YOUR_SERVICE_ROLE_KEY' || '"}',
      body := '{}'
    ) as request_id;
  $$
);

-- 5. Send Push Notifications (cada 5 minutos)
SELECT cron.schedule(
  'send-push-notifications',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-push-notifications',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 'YOUR_SERVICE_ROLE_KEY' || '"}',
      body := '{}'
    ) as request_id;
  $$
);
```

### 6. Reemplazar Variables
- `YOUR_PROJECT_ID`: Tu ID de proyecto de Supabase
- `YOUR_SERVICE_ROLE_KEY`: Tu service role key (Secret, no anon key)

## ⚙️ **Gestión de Cron Jobs**

### Ver cron jobs activos:
```sql
SELECT * FROM cron.job;
```

### Eliminar un cron job:
```sql
SELECT cron.unschedule('nombre-del-job');
```

### Ver logs de ejecución:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'nombre-del-job' 
ORDER BY start_time DESC 
LIMIT 10;
```

### Ejecutar manualmente:
```sql
-- Ejemplo para complete-past-classes
SELECT net.http_post(
  url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/complete-past-classes',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}',
  body := '{}'
);
```

## 🔍 **Monitoreo**

### Logs de Edge Functions
```bash
# Ver logs en tiempo real
supabase functions logs complete-past-classes --follow
```

### Dashboard de Monitoreo
Ve a **Supabase Dashboard** > **Edge Functions** para ver:
- Invocaciones por función
- Errores y timeouts
- Logs detallados

## 🛠️ **Troubleshooting**

### Problemas Comunes:

1. **Zona horaria incorrecta**
   - Verifica que las funciones usen `America/Guayaquil`
   - Los cron schedules están en UTC, ajusta según Ecuador

2. **Permisos insuficientes**
   - Asegúrate de usar el SERVICE_ROLE_KEY, no el anon key
   - Verifica que las políticas RLS permitan las operaciones

3. **Función no se ejecuta**
   - Verifica que la función esté desplegada: `supabase functions list`
   - Checa los logs: `supabase functions logs nombre-funcion`

4. **Base de datos connection issues**
   - Verifica las variables de entorno en las Edge Functions
   - Asegúrate que `pg_cron` esté habilitado

## 📊 **Métricas Esperadas**

- **complete-past-classes**: 0-50 reservaciones procesadas por ejecución
- **generate-weekly-classes**: 15-30 clases creadas los domingos
- **cleanup-data**: Varía según el volumen de datos antiguos
- **class-reminders**: 0-100 recordatorios por hora (según ocupación)

## 🔄 **Actualizaciones**

Para actualizar una función:
```bash
supabase functions deploy nombre-funcion
```

Los cron jobs continuarán funcionando con la nueva versión automáticamente.

## 🚨 **Alertas Recomendadas**

Configura alertas para:
- Errores en Edge Functions (>5% error rate)
- Cron jobs que no se ejecutan por >24 horas
- Funciones con timeout consistente
- Volumen inusual de datos procesados

---

**💡 Tip**: Empieza con frecuencias más altas para probar, luego ajusta a los horarios de producción. 