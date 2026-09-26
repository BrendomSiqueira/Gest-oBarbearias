
export interface Client {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  lastVisit?: string;
  photo?: string; // Base64 string
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
}

export interface Material {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  supplierLink?: string;
}

export interface Drink {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface BalanceAdjustment {
  id: string;
  amount: number;
  reason: string;
  date: string;
}

export interface Sale {
  id: string;
  itemId: string;
  itemName: string;
  price: number;
  date: string; // ISO date
}

export enum AppointmentStatus {
  Confirmed = 'confirmed',
  Pending = 'pending',
  Rejected = 'rejected'
}

export interface AppointmentHistoryEntry {
  id: string;
  action: 'created' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'auto_cancelled' | 'price_updated' | 'edited' | 'dismissed_from_view' | 'restored_to_view' | 'status_changed';
  timestamp: string;
  actor: string;
  details?: string;
  previousValue?: string;
  newValue?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  date: string;
  time: string;
  completed: boolean;
  paid: boolean;
  finalPrice: number; 
  pricePending?: boolean;
  notes?: string;
  status: AppointmentStatus | 'cancelled';
  clientName?: string; // For pending requests or direct display
  clientPhone?: string; // For pending requests or direct display
  createdAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  history?: AppointmentHistoryEntry[];
  archived?: boolean;
  dismissedFromAgenda?: boolean;
  dismissedAt?: string;
  dismissedBy?: string;
  originalDate?: string;
  originalTime?: string;
  updatedAt?: string;
}

export interface BusinessHours {
  open: string; // HH:mm
  close: string; // HH:mm
  days: number[]; // 0-6 (Sunday to Saturday)
  intervalStart?: string; // HH:mm
  intervalEnd?: string; // HH:mm
}

export interface UnavailableSlot {
  date: string; // YYYY-MM-DD
  reason?: string;
}

export interface UserSession {
  username: string;
  shopName: string;
  phone: string;
  profileImage?: string;
  monthlyGoal?: number;
  businessHours?: BusinessHours;
  unavailableSlots?: UnavailableSlot[];
  autoCancelExpired?: boolean;
  autoCancelMinutes?: number;
  linkedGoogleEmail?: string;
  linkedGoogleUid?: string;
  googleLinked?: boolean;
  linkedAt?: string;
}

export enum Tab {
  Dashboard = 'Painel',
  Agenda = 'Agenda',
  Clients = 'Clientes',
  Services = 'Serviços',
  Drinks = 'Bebidas',
  Inventory = 'Estoque',
  Finance = 'Financeiro',
  Marketing = 'Marketing',
  Reports = 'Relatórios',
  OnlineBooking = 'Agendamento Online',
  Profile = 'Perfil',
  Admin = 'Admin'
}
