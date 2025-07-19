'use client';

import { useMemo, useState, useTransition, useEffect } from 'react';
import { format } from 'date-fns';
import { type ReservationData } from '../page'; // Importar tipo
import { cancelReservation, updateReservationBikes, getAvailableBikes, getUsersWithCredits, getAvailableClasses, createReservation, type UserWithCredits, type AvailableClass } from '../actions';
import { Plus, X, User, Calendar, Clock, Users, Bike } from 'lucide-react';

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
    confirmedReservations: ReservationData[];
    waitlistReservations: ReservationData[];
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Bike className="h-3 w-3 text-blue-400 mt-0.5" />
          </div>
          <div className="ml-2">
            <p className="text-xs text-blue-700">
              <strong>Nota:</strong> El layout físico de las bicicletas puedes verlo en la app móvil de Giro.
            </p>
          </div>
        </div>
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
                        ? 'bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-800' 
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

// Componente para crear nueva reservación
function CreateReservationModal({
  isOpen,
  onClose,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [step, setStep] = useState(1); // 1: Seleccionar usuario, 2: Seleccionar clase, 3: Seleccionar bicicletas
     const [selectedUser, setSelectedUser] = useState<UserWithCredits | null>(null);
   const [selectedClass, setSelectedClass] = useState<AvailableClass | null>(null);
   const [selectedBikes, setSelectedBikes] = useState<number[]>([]);

  const [users, setUsers] = useState<UserWithCredits[]>([]);
  const [classes, setClasses] = useState<AvailableClass[]>([]);
  const [availableBikes, setAvailableBikes] = useState<BikeOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar usuarios cuando se abre el modal
  useEffect(() => {
    if (isOpen && step === 1) {
      setLoading(true);
      getUsersWithCredits().then(result => {
        if (result.success) {
          setUsers(result.users || []);
        } else {
          setError(result.error || 'Error al cargar usuarios');
        }
        setLoading(false);
      });
    }
  }, [isOpen, step]);

  // Cargar clases cuando se selecciona un usuario
  useEffect(() => {
    if (step === 2 && selectedUser) {
      setLoading(true);
      getAvailableClasses().then(result => {
        if (result.success) {
          setClasses(result.classes || []);
        } else {
          setError(result.error || 'Error al cargar clases');
        }
        setLoading(false);
      });
    }
  }, [step, selectedUser]);

  // Cargar bicicletas cuando se selecciona una clase
  useEffect(() => {
    if (step === 3 && selectedClass) {
      setLoading(true);
      getAvailableBikes(selectedClass.id).then(result => {
        if (result.error) {
          setError(result.error);
        } else {
          setAvailableBikes(result.availableBikes || []);
        }
        setLoading(false);
      });
    }
  }, [step, selectedClass]);

     const handleClose = () => {
     setStep(1);
     setSelectedUser(null);
     setSelectedClass(null);
     setSelectedBikes([]);
     setError(null);
     onClose();
   };

  const handleNextStep = () => {
    setError(null);
    if (step === 1 && selectedUser) {
      setStep(2);
    } else if (step === 2 && selectedClass) {
      setSelectedBikes([]);
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setError(null);
    if (step === 2) {
      setStep(1);
      setSelectedClass(null);
    } else if (step === 3) {
      setStep(2);
      setSelectedBikes([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser || !selectedClass || selectedBikes.length === 0) {
      setError('Faltan datos requeridos');
      return;
    }

    setIsSubmitting(true);
    setError(null);

         const result = await createReservation({
       user_id: selectedUser.id,
       class_id: selectedClass.id,
       bike_static_ids: selectedBikes,
       credits_to_use: 1 // Por ahora usar 1 crédito por defecto
     });

    if (result.success) {
      onSuccess(result.message || 'Reservación creada exitosamente');
      handleClose();
    } else {
      setError(result.error || 'Error al crear reservación');
    }

    setIsSubmitting(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return format(date, 'EEEE, dd MMM yyyy');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">
            Crear Nueva Reservación - Paso {step} de 3
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

                 {/* Progress bar */}
         <div className="mb-6">
           <div className="flex items-center w-full relative">
             {[1, 2, 3].map((i) => (
               <div key={i} className="flex flex-col items-center flex-1 relative">
                 <div
                   className={`rounded-full h-8 w-8 flex items-center justify-center text-sm font-semibold relative z-10 ${
                     i <= step
                       ? 'bg-[#6758C2] text-white'
                       : 'bg-gray-200 text-gray-600'
                   }`}
                 >
                   {i}
                 </div>
                 <span className="text-center text-xs text-gray-600 mt-3">
                   {i === 1 && 'Seleccionar Usuario'}
                   {i === 2 && 'Seleccionar Clase'}
                   {i === 3 && 'Seleccionar Bicicletas'}
                 </span>
               </div>
             ))}
             {/* Líneas de conexión */}
             <div className="absolute top-4 left-1/6 right-1/6 flex items-center">
               <div
                 className={`flex-1 h-1 ${
                   1 < step ? 'bg-[#6758C2]' : 'bg-gray-200'
                 }`}
               />
               <div className="w-8"></div>
               <div
                 className={`flex-1 h-1 ${
                   2 < step ? 'bg-[#6758C2]' : 'bg-gray-200'
                 }`}
               />
             </div>
           </div>
         </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Seleccionar Usuario */}
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-gray-800 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Seleccionar Usuario con Créditos
            </h4>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Cargando usuarios...</div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">No hay usuarios con créditos disponibles</div>
              </div>
            ) : (
              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? 'border-[#6758C2] bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium text-gray-900">{user.name || 'Sin nombre'}</h5>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.phone && (
                          <p className="text-sm text-gray-500">{user.phone}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#6758C2]">
                          {user.activeCredits} créditos
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.activePurchases.length} paquete{user.activePurchases.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    
                    {selectedUser?.id === user.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <h6 className="text-xs font-medium text-gray-700 mb-2">Paquetes Activos:</h6>
                        <div className="space-y-1">
                          {user.activePurchases.map((purchase) => (
                            <div key={purchase.id} className="text-xs text-gray-600 flex justify-between">
                              <span>{purchase.package_name}</span>
                              <span>{purchase.credits_remaining} créditos</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Seleccionar Clase */}
        {step === 2 && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-gray-800 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Seleccionar Clase para {selectedUser?.name}
            </h4>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Cargando clases...</div>
              </div>
            ) : classes.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">No hay clases disponibles</div>
              </div>
            ) : (
              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClass(cls)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedClass?.id === cls.id
                        ? 'border-[#6758C2] bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium text-gray-900">
                          {formatDate(cls.date)}
                        </h5>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                        </div>
                        {cls.instructor_name && (
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <User className="h-4 w-4 mr-1" />
                            {cls.instructor_name}
                          </div>
                        )}
                        {cls.name && (
                          <p className="text-sm text-gray-700 mt-1">{cls.name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-sm text-green-600">
                          <Users className="h-4 w-4 mr-1" />
                          {cls.availableSpots} disponibles
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Seleccionar Bicicletas */}
        {step === 3 && selectedClass && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-gray-800 flex items-center">
              <Bike className="h-5 w-5 mr-2" />
              Seleccionar Bicicletas para {selectedUser?.name}
            </h4>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h5 className="font-medium text-gray-800">Clase Seleccionada:</h5>
              <p className="text-sm text-gray-600">
                {formatDate(selectedClass.date)} - {formatTime(selectedClass.start_time)} - {formatTime(selectedClass.end_time)}
              </p>
              {selectedClass.instructor_name && (
                <p className="text-sm text-gray-600">Instructor: {selectedClass.instructor_name}</p>
              )}
            </div>

            

                         {loading ? (
               <div className="text-center py-4">
                 <div className="text-gray-500">Cargando bicicletas...</div>
               </div>
             ) : (
               <div className="space-y-2">
                 <div className="text-sm text-gray-600">
                   Selecciona las bicicletas (disponibles: {availableBikes.length})
                 </div>
                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                   <div className="flex items-start">
                     <div className="flex-shrink-0">
                       <Bike className="h-4 w-4 text-blue-400 mt-0.5" />
                     </div>
                     <div className="ml-2">
                       <p className="text-xs text-blue-700">
                         <strong>Nota:</strong> El layout físico de las bicicletas en el estudio puedes verlo en la app móvil de Giro.
                       </p>
                     </div>
                   </div>
                 </div>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-4 bg-white">
                  {availableBikes.length === 0 ? (
                    <div className="text-sm text-gray-500">No hay bicicletas disponibles</div>
                  ) : (
                    <div className="grid grid-cols-8 gap-2">
                      {availableBikes.map((bike) => {
                        const isSelected = selectedBikes.includes(bike.static_bike_id);
                        return (
                          <label
                            key={bike.static_bike_id}
                            className={`
                              flex items-center justify-center p-2 text-sm border rounded cursor-pointer transition-colors
                              ${isSelected
                                ? 'bg-[#6758C2] text-white border-[#6758C2]'
                                : 'bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-800'
                              }
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedBikes(selectedBikes.filter(id => id !== bike.static_bike_id));
                                } else {
                                  setSelectedBikes([...selectedBikes, bike.static_bike_id].sort((a, b) => a - b));
                                }
                              }}
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
                  <div className="text-sm text-gray-600">
                    Bicicletas seleccionadas: {selectedBikes.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
          <div>
            {step > 1 && (
              <button
                onClick={handlePrevStep}
                disabled={loading}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Anterior
              </button>
            )}
          </div>
          
          <div className="space-x-2">
            <button
              onClick={handleClose}
              disabled={loading || isSubmitting}
              className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Cancelar
            </button>
            
            {step < 3 ? (
              <button
                onClick={handleNextStep}
                disabled={
                  loading ||
                  (step === 1 && !selectedUser) ||
                  (step === 2 && !selectedClass)
                }
                className="px-4 py-2 bg-[#6758C2] text-white rounded-md hover:bg-[#5A4AB8] disabled:opacity-50"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedBikes.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creando...' : 'Crear Reservación'}
              </button>
            )}
          </div>
        </div>
      </div>
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
  
  // Estados para el modal de crear reservación
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateSuccess = (message: string) => {
    setSuccessMessage(message);
    setCancelError(null);
    setEditError(null);
  };

  // Agrupar reservaciones por clase, separando confirmadas de waitlist
  const groupedReservations = useMemo(() => {
    return initialReservations.reduce<GroupedReservations>((acc, res) => {
      const classId = res.classes?.id;
      if (!classId) return acc; // Ignorar si no hay info de clase

      if (!acc[classId]) {
        acc[classId] = {
          classInfo: res.classes,
          confirmedReservations: [],
          waitlistReservations: [],
        };
      }
      
      // Separar por status
      if (res.status === 'waitlist') {
        acc[classId].waitlistReservations.push(res);
      } else if (res.status === 'confirmed') {
        acc[classId].confirmedReservations.push(res);
      }
      
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
      {/* Botón para crear nueva reservación */}
      <div className="mb-6 flex justify-between items-center">
        <p className="text-gray-600">
          Gestiona las reservaciones existentes y crea nuevas reservaciones para tus usuarios
        </p>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-[#6758C2] text-white rounded-md hover:bg-[#5A4AB8] flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Reservación
        </button>
      </div>

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
                <li><strong>Waitlist:</strong> Si se cancela una reserva confirmada, la primera persona en lista de espera será promovida automáticamente</li>
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

        const hasConfirmed = group.confirmedReservations.length > 0;
        const hasWaitlist = group.waitlistReservations.length > 0;

        return (
          <div key={classId} className="mb-8 bg-white shadow-md rounded overflow-hidden">
            {/* Cabecera de la Clase */}
            <div className="bg-gray-100 p-4 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {format(new Date(classInfo.date + 'T00:00:00'), 'EEEE, dd MMM yyyy')} -
                    {` ${formatTime(classInfo.start_time)}`}
                  </h2>
                  <p className="text-sm text-gray-600">Instructor: {classInfo.instructors?.name ?? 'N/D'}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-green-600">{group.confirmedReservations.length}</span> confirmadas
                    {hasWaitlist && (
                      <>
                        {' • '}
                        <span className="font-medium text-orange-600">{group.waitlistReservations.length}</span> en espera
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Reservaciones Confirmadas */}
            {hasConfirmed && (
              <div>
                <div className="bg-green-50 px-4 py-2 border-b">
                  <h3 className="text-sm font-semibold text-green-800 flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    Reservaciones Confirmadas ({group.confirmedReservations.length})
                  </h3>
                </div>
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
                      {group.confirmedReservations.map((res) => (
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
            )}

            {/* Lista de Espera (Waitlist) */}
            {hasWaitlist && (
              <div>
                <div className="bg-orange-50 px-4 py-2 border-b">
                  <h3 className="text-sm font-semibold text-orange-800 flex items-center">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                    Lista de Espera ({group.waitlistReservations.length})
                    {/* <span className="ml-2 text-xs text-orange-600 font-normal">
                      (en orden de llegada)
                    </span> */}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full leading-normal">
                                         <thead>
                       <tr className="bg-orange-50 text-orange-700 uppercase text-sm leading-tight">
                         <th className="py-2 px-4 text-center w-16">#</th>
                         <th className="py-2 px-4 text-left">Nombre Usuario</th>
                         <th className="py-2 px-4 text-left">Email Usuario</th>
                         <th className="py-2 px-4 text-center">Estado</th>
                       </tr>
                     </thead>
                     <tbody className="text-gray-700 text-sm">
                       {group.waitlistReservations.map((res, index) => (
                         <tr key={res.id} className="border-b border-orange-100 hover:bg-orange-50/50">
                           <td className="py-2 px-4 text-center font-bold text-orange-600">
                             {index + 1}
                           </td>
                           <td className="py-2 px-4 text-left">{res.users?.name ?? 'N/D'}</td>
                           <td className="py-2 px-4 text-left">{res.users?.email ?? 'N/D'}</td>
                           <td className="py-2 px-4 text-center">
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                               En espera
                             </span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
                </div>
                
                {/* Información adicional sobre el waitlist */}
                <div className="bg-orange-50 px-4 py-3 border-t border-orange-100">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-4 w-4 text-orange-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-2">
                      <p className="text-xs text-orange-700">
                        <strong>Info:</strong> Si alguien cancela su reserva confirmada, la primera persona en lista de espera será automáticamente promovida y notificada.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Modal para crear nueva reservación */}
      <CreateReservationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
} 