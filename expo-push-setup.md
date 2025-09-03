# 📱 Configuración de Push Notifications con Expo

## 1. **Instalar dependencias en tu app React Native**

```bash
npx expo install expo-notifications expo-device expo-constants
```

## 2. **Configurar app.json**

```json
{
  "expo": {
    "name": "Volta App",
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#6366f1",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

## 3. **Código para manejar notifications en React Native**

```typescript
// hooks/useNotifications.ts
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { createClient } from '@/lib/supabase/client';

// Configurar comportamiento de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const supabase = createClient();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Guardar token en Supabase para el usuario actual
        saveTokenToSupabase(token);
      }
    });

    // Listener para notificaciones recibidas
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listener para cuando el usuario toca la notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Aquí puedes navegar a una pantalla específica
      console.log('Notification tapped:', response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const saveTokenToSupabase = async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Actualizar o insertar el push token del usuario
        await supabase
          .from('users')
          .update({ push_token: token })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  return {
    expoPushToken,
    notification,
  };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('¡Necesitamos permisos para enviarte notificaciones de las clases!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId,
    })).data;
  } else {
    alert('Debes usar un dispositivo físico para las push notifications');
  }

  return token;
}
```

## 4. **Usar el hook en tu App**

```typescript
// App.tsx o en tu componente principal
import { useNotifications } from './hooks/useNotifications';

export default function App() {
  const { expoPushToken, notification } = useNotifications();

  return (
    // Tu app...
  );
}
```

## 5. **Actualizar schema de Supabase**

Agrega el campo push_token a la tabla users:

```sql
ALTER TABLE users ADD COLUMN push_token TEXT;
``` 