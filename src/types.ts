/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  SUPER_ADMIN = "Super Admin",
  ADMIN = "Admin",
  AGENT = "Booking Agent",
  HOUSEKEEPER = "Housekeeper",
  MAINTENANCE = "Maintenance",
  GUEST = "Guest"
}

export enum RoomStatus {
  CLEAN = "Clean",
  DIRTY = "Dirty",
  IN_PROGRESS = "In Progress",
  INSPECTED = "Inspected",
  OUT_OF_ORDER = "Out of Order"
}

export enum RoomCategory {
  EXECUTIVE = "Executive",
  STANDARD = "Standard",
  SUITE = "Suite",
  STUDIO = "Studio",
  APARTMENT = "Apartment"
}

export interface Room {
  id: string; // e.g., "101", "202"
  name: string; // Room Name or Number
  type: RoomCategory;
  floor: number;
  capacity: number;
  description: string;
  amenities: string[];
  baseRate: number;
  weekendRate: number;
  hourlyRate: number;
  status: RoomStatus;
  housekeeperId?: string;
  images?: string[];
  airbnbImportUrl?: string;
  isApartment?: boolean;
  parentId?: string;
  tenantId?: string;
}

export enum BookingStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CHECKED_IN = "CHECKED_IN",
  CHECKED_OUT = "CHECKED_OUT",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
  NO_SHOW = "NO_SHOW"
}

export enum BookingType {
  DAILY = "Daily",
  HOURLY = "Hourly",
  BLOCK = "Block" // for maintenance/owner use
}

export interface GuestProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  idNumber?: string;
  nationality: string;
  address?: string;
  tag: "Regular" | "VIP" | "Blacklisted" | "Corporate";
  notes?: string;
  tenantId?: string;
}

export interface Payment {
  id: string;
  amount: number;
  method: "Cash" | "Bank Transfer" | "Mobile Banking" | "Card";
  timestamp: string;
  notes?: string;
}

export interface Booking {
  id: string; // e.g., UH-1001
  roomId: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  checkInTime?: string; // HH:MM
  checkOutTime?: string; // HH:MM
  status: BookingStatus;
  type: BookingType;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  source: "Walk-In" | "Website" | "Airbnb" | "Booking.com" | "Agent";
  agentName?: string;
  payments: Payment[];
  timeline: { status: BookingStatus; timestamp: string; actor: string; notes?: string }[];
  identityVerified: boolean;
  documents: { name: string; url: string }[];
  createdAt: string;
  googleEventId?: string;
  tenantId?: string;
}

export interface HousekeepingTask {
  id: string;
  roomId: string;
  type: "Checkout Clean" | "Stayover Clean" | "Deep Clean" | "Touch Up";
  status: "Pending" | "In Progress" | "Done" | "Inspected";
  assignedTo?: string; // Housekeeper name
  priority: "Low" | "Medium" | "High";
  notes?: string;
  photoUrl?: string;
  timestamp: string;
  tenantId?: string;
}

export interface MaintenanceRequest {
  id: string;
  roomId: string;
  category: "Plumbing" | "Electrical" | "AC" | "Furniture" | "Other";
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  description: string;
  photoUrl?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  resolvedAt?: string;
  tenantId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  details: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  passwordHash?: string;
  resetCode?: string;
  resetCodeExpires?: number;
  tenantId?: string;
}

export interface AppState {
  rooms: Room[];
  bookings: Booking[];
  guests: GuestProfile[];
  housekeepingTasks: HousekeepingTask[];
  maintenanceRequests: MaintenanceRequest[];
  auditLogs: AuditLog[];
  users: User[];
  settings: {
    businessName: string;
    address: string;
    phone: string;
    email: string;
    checkInTime: string;
    checkOutTime: string;
    currency: string;
    taxRate: number; // percentage
    googleCalendar?: {
      calendarId: string;
      connected: boolean;
      accessToken?: string;
      lastSyncTime?: string;
      syncInterval?: number; // frequency in minutes, e.g., 15, 30, 60
    };
  };
}
