'use client';

import { useMemo, useState, useTransition, useEffect } from 'react';
import { format } from 'date-fns';
import { type ReservationData } from '../page'; // Importar tipo
import { cancelReservation, updateReservationBikes, getAvailableBikes } from '../actions';

// Helper para formatear hora HH:MM
const formatTime = (timeString: string | null | undefined) => {
  if (!timeString) return 'N/A';
  const [hours, minutes] = timeString.split(':');
  return `${hours}:${minutes}`;
};

// Tipo para el objeto agrupado
type GroupedReservations = {
  [classId: string]: {
    classInfo: ReservationData['classes'];
    reservations: ReservationData[];
  };
};

// Tipo para las bicicletas disponibles
type BikeOption = {
  id: string;
  static_bike_id: number;
};

// Componente para seleccionar bicicletas
function BikeSelector({ 
  classId, 
  reservationId, 
  selectedBikes, 
  onBikesChange, 
  disabled 
}: {
  classId: string;
  reservationId: string;
  selectedBikes: number[];
  onBikesChange: (bikes: number[]) => void;
  disabled: boolean;
}) {
  const [availableBikes, setAvailableBikes] = useState<BikeOption[]>([]);
  const [currentBikes, setCurrentBikes] = useState<BikeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBikes() {
      setLoading(true);
      setError(null);
      const result = await getAvailableBikes(classId, reservationId);
      
      if (result.error) {
        setError(result.error);
      } else {
        setAvailableBikes(result.availableBikes || []);
        setCurrentBikes(result.currentBikes || []);
      }
      setLoading(false);
    }

    fetchBikes();
  }, [classId, reservationId]);

  // Combinar bicicletas disponibles con las actuales para mostrar todas las opciones
  const allBikeOptions = useMemo(() => {
    const combined = [...availableBikes, ...currentBikes];
    // Eliminar duplicados basado en static_bike_id
    const unique = combined.filter((bike, index, self) => 
      index === self.findIndex(b => b.static_bike_id === bike.static_bike_id)
    );
    return unique.sort((a, b) => a.static_bike_id - b.static_bike_id);
  }, [availableBikes, currentBikes]);

  const handleBikeToggle = (staticBikeId: number) => {
    const newSelection = selectedBikes.includes(staticBikeId)
      ? selectedBikes.filter(id => id !== staticBikeId)
      : [...selectedBikes, staticBikeId];
    
    onBikesChange(newSelection.sort((a, b) => a - b));
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Cargando bicicletas...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-600 mb-2">
        Selecciona las bicicletas (disponibles: {availableBikes.length})
      </div>
      <div className="max-h-32 overflow-y-auto border border-gray-300 rounded p-2 bg-white">
        {allBikeOptions.length === 0 ? (
          <div className="text-sm text-gray-500">No hay bicicletas disponibles</div>
        ) : (
          <div className="grid grid-cols-5 gap-1">
            {allBikeOptions.map((bike) => {
              const isSelected = selectedBikes.includes(bike.static_bike_id);
              const isCurrentlyReserved = currentBikes.some(cb => cb.static_bike_id === bike.static_bike_id);
              const isAvailable = availableBikes.some(ab => ab.static_bike_id === bike.static_bike_id);
              
              return (
                <label 
                  key={bike.static_bike_id}
                  className={`
                    flex items-center justify-center p-1 text-xs border rounded cursor-pointer transition-colors
                    ${isSelected 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : isAvailable || isCurrentlyReserved
                        ? 'bg-gray-50 border-gray-300 hover:bg-gray-100' 
                        : 'bg-red-50 border-red-300 text-red-500 cursor-not-allowed'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleBikeToggle(bike.static_bike_id)}
                    disabled={disabled || (!isAvailable && !isCurrentlyReserved)}
                    className="sr-only"
                  />
                  {bike.static_bike_id}
                </label>
              );
            })}
          </div>
        )}
      </div>
      {selectedBikes.length > 0 && (
        <div className="text-xs text-gray-600">
          Seleccionadas: {selectedBikes.join(', ')}
        </div>
      )}
    </div>
  );
}

export default function ReservationsClient({ initialReservations }: { initialReservations: ReservationData[] }) {
  const [isPending, startTransition] = useTransition();
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [selectedBikes, setSelectedBikes] = useState<number[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Agrupar reservaciones por clase usando useMemo para eficiencia
  const groupedReservations = useMemo(() => {
    return initialReservations.reduce<GroupedReservations>((acc, res) => {
      const classId = res.classes?.id;
      if (!classId) return acc; // Ignorar si no hay info de clase

      if (!acc[classId]) {
        acc[classId] = {
          classInfo: res.classes,
          reservations: [],
        };
      }
      acc[classId].reservations.push(res);
      return acc;
    }, {});
  }, [initialReservations]);

  const handleCancel = (reservationId: string) => {
    if (confirm('¿Estás seguro de cancelar esta reservación? Esta acción no se puede deshacer y los créditos serán devueltos al usuario.')) {
      startTransition(async () => {
        setCancelError(null);
        setEditError(null);
        setSuccessMessage(null);
        const result = await cancelReservation(reservationId);
        if (result?.error) {
          setCancelError(result.error);
        } else {
          setSuccessMessage(result.message || 'Reservación cancelada exitosamente.');
        }
      });
    }
  };

  const handleEdit = (reservation: ReservationData) => {
    setEditingReservationId(reservation.id);
    const currentBikes = reservation.reservation_bikes?.map(rb => rb.bikes?.static_bike_id).filter((id): id is number => id !== undefined) || [];
    setSelectedBikes(currentBikes);
    setCancelError(null);
    setEditError(null);
    setSuccessMessage(null);
  };

  const handleCancelEditMode = () => {
    setEditingReservationId(null);
    setSelectedBikes([]);
    setEditError(null);
  };

  const handleSaveEdit = (reservationId: string) => {
    if (editingReservationId !== reservationId) return;

    // Validación del lado del cliente
    if (selectedBikes.length === 0) {
      setEditError('Debes seleccionar al menos una bicicleta.');
      return;
    }

    startTransition(async () => {
      setEditError(null);
      setCancelError(null);
      setSuccessMessage(null);
      const result = await updateReservationBikes(reservationId, selectedBikes);
      if (result?.error) {
        setEditError(result.error);
      } else {
        setEditingReservationId(null);
        setSelectedBikes([]);
        setSuccessMessage(result.message || 'Bicicletas actualizadas exitosamente.');
      }
    });
  };

  // Obtener las claves (class IDs) y ordenarlas para mostrar las clases en orden
  const sortedClassIds = useMemo(() => Object.keys(groupedReservations).sort((a, b) => {
    const classA = groupedReservations[a].classInfo;
    const classB = groupedReservations[b].classInfo;
    if (!classA || !classB) return 0;
    // Ordenar por fecha y luego por hora de inicio
    const dateComparison = new Date(classA.date).getTime() - new Date(classB.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    // Comparar horas (puede necesitar ajuste si el formato varía)
    return (classA.start_time || '').localeCompare(classB.start_time || '');
  }), [groupedReservations]);

  // Función para obtener los números de bici como string
  const getBikeNumbers = (reservation: ReservationData): string => {
    return reservation.reservation_bikes
        ?.map(rb => rb.bikes?.static_bike_id)
        .filter(num => num !== undefined && num !== null)
        .sort((a, b) => a! - b!) // Ordenar números
        .join(', ') || 'N/A';
  }

  return (
    <div>
      {/* Warning sobre modificaciones de reservaciones */}
      <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Importante: Modificaciones de Reservaciones
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Al modificar o cancelar reservaciones, el sistema automáticamente:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><strong>Cancelar:</strong> Devuelve los créditos utilizados al usuario</li>
                <li><strong>Modificar bicicletas:</strong> Puede ajustar créditos si cambia la cantidad de bicicletas reservadas</li>
                <li>Los cambios en créditos se reflejan inmediatamente en la cuenta del usuario</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {cancelError && <p className="mb-4 text-red-600">Error de cancelación: {cancelError}</p>}
      {editError && <p className="mb-4 text-red-600">Error de edición: {editError}</p>}
      {successMessage && <p className="mb-4 text-green-600">{successMessage}</p>}

      {sortedClassIds.length === 0 && <p>No se encontraron reservaciones activas.</p>}

      {sortedClassIds.map((classId) => {
        const group = groupedReservations[classId];
        const classInfo = group.classInfo;
        if (!classInfo) return null; // Seguridad

        return (
          <div key={classId} className="mb-8 bg-white shadow-md rounded overflow-hidden">
            {/* Cabecera de la Clase */}
            <div className="bg-gray-100 p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                {format(new Date(classInfo.date + 'T00:00:00'), 'EEEE, dd MMM yyyy')} -
                {` ${formatTime(classInfo.start_time)}`}
              </h2>
              <p className="text-sm text-gray-600">Instructor: {classInfo.instructors?.name ?? 'N/D'}</p>
            </div>

            {/* Tabla de Reservaciones para esta Clase */}
            <div className="overflow-x-auto">
                <table className="min-w-full leading-normal">
                <thead>
                    <tr className="bg-gray-50 text-gray-600 uppercase text-sm leading-tight">
                    <th className="py-2 px-4 text-left">Bicis</th>
                    <th className="py-2 px-4 text-left">Nombre Usuario</th>
                    <th className="py-2 px-4 text-left">Email Usuario</th>
                    <th className="py-2 px-4 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="text-gray-700 text-sm">
                    {group.reservations.map((res) => (
                    <tr key={res.id} className="border-b border-gray-200 hover:bg-gray-50">
                        {editingReservationId === res.id ? (
                         <td className="py-2 px-4 text-left whitespace-nowrap">
                           <BikeSelector
                             classId={classId}
                             reservationId={res.id}
                             selectedBikes={selectedBikes}
                             onBikesChange={(bikes) => {
                               setSelectedBikes(bikes);
                             }}
                             disabled={isPending}
                           />
                           {editError && editingReservationId === res.id && (
                             <div className="text-xs text-red-600 mt-1">{editError}</div>
                           )}
                         </td>
                       ) : (
                         <td className="py-2 px-4 text-left font-medium whitespace-nowrap">{getBikeNumbers(res)}</td>
                       )}
                        <td className="py-2 px-4 text-left">{res.users?.name ?? 'N/D'}</td>
                        <td className="py-2 px-4 text-left">{res.users?.email ?? 'N/D'}</td>
                        <td className="py-2 px-4 text-center">
                        {editingReservationId === res.id ? (
                           <>
                             <button
                               onClick={() => handleSaveEdit(res.id)}
                               disabled={isPending}
                               className="text-green-600 hover:text-green-800 disabled:opacity-50 mr-2 text-xs font-semibold"
                             >
                               {isPending ? 'Guardando...' : 'Guardar'}
                             </button>
                             <button
                               onClick={handleCancelEditMode}
                               disabled={isPending}
                               className="text-gray-500 hover:text-gray-700 disabled:opacity-50 text-xs font-semibold"
                             >
                               Descartar
                             </button>
                           </>
                         ) : (
                           <>
                             <button
                               onClick={() => handleEdit(res)}
                               disabled={isPending && editingReservationId !== res.id}
                               className="text-blue-500 hover:text-blue-700 disabled:opacity-50 mr-2 text-xs font-semibold"
                             >
                               Editar
                             </button>
                             <button
                               onClick={() => handleCancel(res.id)}
                               disabled={isPending && editingReservationId !== res.id}
                               className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold"
                             >
                               {isPending && !editingReservationId ? 'Cancelando...' : 'Cancelar'}
                             </button>
                           </>
                         )}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </div>
        );
      })}
    </div>
  );
} 