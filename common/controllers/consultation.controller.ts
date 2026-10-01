import type { ApiRequest } from '../api/transport';
import type { Appointment } from '../models/customer';
export function createConsultationController(apiRequest: ApiRequest) {
    const fetchAppointments = (id: number, signal?: AbortSignal) => apiRequest<Appointment[]>("lambdaAPI/BookingConsultation/PendingAndSuccessConsultationList", {
        body: { CustomerId: id },
        signal,
    });
    return { fetchAppointments };
}
