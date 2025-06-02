'use client';

import { useState, useTransition, useRef } from 'react';
import { format } from 'date-fns';
import { type ClassData } from '../page'; // Importar tipo desde la página
import { updateClassName } from '../actions';

// Helper para formatear hora HH:MM
const formatTime = (timeString: string) => {
  if (!timeString) return 'N/A';
  const [hours, minutes] = timeString.split(':');
  return `${hours}:${minutes}`;
};

// Componente para manejar la edición inline del nombre
function EditableClassName({ cls, isPending }: { cls: ClassData; isPending: boolean }) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(cls.name || '');
    const inputRef = useRef<HTMLInputElement>(null);
    const [localIsPending, startTransition] = useTransition();

    const handleSave = () => {
        startTransition(async () => {
            // Llama a la Server Action para guardar
            await updateClassName(cls.id, name);
            setIsEditing(false);
            // La UI se actualizará por revalidatePath
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setName(cls.name || ''); // Revertir cambios
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSave} // Guardar al perder foco
                onKeyDown={handleKeyDown}
                disabled={localIsPending || isPending}
                className="px-1 py-0.5 border rounded bg-white w-full text-sm"
                autoFocus
            />
        );
    }

    return (
        <span onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-gray-200 px-1 rounded">
            {cls.name || <span className="text-gray-400 italic">Clic para añadir nombre</span>}
        </span>
    );
}

// Componente principal del cliente
export default function ClassesClient({ initialClasses }: { initialClasses: ClassData[] }) {
  const [isPendingName, startTransitionName] = useTransition(); // Para el componente hijo

  return (
    <div className="bg-white shadow-md rounded overflow-hidden">
      <table className="min-w-full leading-normal">
        <thead>
          <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
            <th className="py-3 px-5 text-left">Fecha</th>
            <th className="py-3 px-5 text-left">Hora</th>
            <th className="py-3 px-5 text-left">Instructor</th>
            <th className="py-3 px-5 text-left">Nombre Clase</th>
          </tr>
        </thead>
        <tbody className="text-gray-700 text-sm font-light">
          {initialClasses.length > 0 ? (
            initialClasses.map((cls) => (
              <tr key={cls.id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-5 text-left whitespace-nowrap">
                  {format(new Date(cls.date + 'T00:00:00'), 'EEEE, dd MMM yyyy')}
                </td>
                <td className="py-3 px-5 text-left whitespace-nowrap">
                  {`${formatTime(cls.start_time)} - ${formatTime(cls.end_time)}`}
                </td>
                <td className="py-3 px-5 text-left">
                  {cls.instructors?.name ?? 'N/A'}
                </td>
                <td className="py-3 px-5 text-left">
                    <EditableClassName cls={cls} isPending={isPendingName} />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="py-3 px-5 text-center">No se encontraron próximas clases.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
} 