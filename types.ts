
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
  status: AppointmentStatus;
  clientName?: string; // For pending requests from non-registered clients
  clientPhone?: string; // For pending requests from non-registered clients
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
