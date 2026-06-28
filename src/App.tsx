/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppState, Booking, BookingStatus, GuestProfile, RoomStatus, UserRole, User } from "./types";
import DashboardOverview from "./components/DashboardOverview";
import CalendarTimeline from "./components/CalendarTimeline";
import HousekeepingBoard from "./components/HousekeepingBoard";
import MaintenanceBoard from "./components/MaintenanceBoard";
import GuestCRM from "./components/GuestCRM";
import MigrationTool from "./components/MigrationTool";
import BookingFormModal from "./components/BookingFormModal";
import { GoogleCalendarSync } from "./components/GoogleCalendarSync";
import { RoomCatalog } from "./components/RoomCatalog";
import { RoomManager } from "./components/RoomManager";
import { UserManager } from "./components/UserManager";
import { AirbnbSync } from "./components/AirbnbSync";
import LoginScreen from "./components/LoginScreen";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { seedDatabase, subscribeToAppState } from "./lib/dataService";
import { doc, getDoc, updateDoc, addDoc, collection, setDoc } from "firebase/firestore";
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  Wrench,
  Users,
  FileSpreadsheet,
  Plus,
  Shield,
  Activity,
  LogOut,
  Globe,
  Bell,
  RefreshCw,
  Clock,
  Heart,
  Calendar,
  Sliders,
  ShieldCheck,
  ArrowLeftRight,
  Menu,
  X
} from "lucide-react";

export default function App() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.SUPER_ADMIN);
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: UserRole; tenantId: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Modals state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [prefilledRoomId, setPrefilledRoomId] = useState("");
  const [prefilledStart, setPrefilledStart] = useState("");
  const [prefilledEnd, setPrefilledEnd] = useState("");

  useEffect(() => {
    // Check if database needs seeding, only run once
    seedDatabase().catch(console.error);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user role from users collection
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        let role = UserRole.SUPER_ADMIN;
        let tenantId = "default";
        
        if (userDoc.exists()) {
          role = userDoc.data().role as UserRole;
          tenantId = userDoc.data().tenantId || "default";
        } else {
          // New user, create them in default tenant for now. 
          // In a real app, they would go through a workspace signup flow.
          await setDoc(doc(db, "users", firebaseUser.uid), {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || "Staff Member",
            email: firebaseUser.email || "",
            role: role,
            tenantId: tenantId,
            createdAt: new Date().toISOString()
          });
        }

        const userObj = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || "Staff Member",
          email: firebaseUser.email || "",
          role: role,
          tenantId: tenantId
        };
        
        setCurrentUser(userObj);
        setActiveRole(role);
      } else {
        setCurrentUser(null);
      }
      setAuthChecked(true);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let unsubscribeState: (() => void) | undefined;
    if (currentUser) {
      unsubscribeState = subscribeToAppState(currentUser.tenantId, (newState) => {
        setAppState(newState);
      });
    }
    return () => {
      if (unsubscribeState) unsubscribeState();
    };
  }, [currentUser]);

  const handleLoginSuccess = async (token: string, user: any) => {
    // Auth state is handled by onAuthStateChanged listener
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout request failed", e);
    }
    setLoading(false);
  };

  // Force active tab matching the role's allowed modules
  useEffect(() => {
    if (activeRole === UserRole.HOUSEKEEPER) {
      setActiveTab("Housekeeping");
    } else if (activeRole === UserRole.MAINTENANCE) {
      setActiveTab("Maintenance");
    } else if (activeRole === UserRole.GUEST) {
      setActiveTab("Guest Portal");
    } else {
      if (activeTab === "Housekeeping" || activeTab === "Maintenance" || activeTab === "Guest Portal") {
        setActiveTab("Dashboard");
      }
    }
  }, [activeRole]);

  // Trigger Booking creation
  const handleBookingSubmit = async (formData: any) => {
    // Check if guest exists by phone (simple matching for demo)
    let guestId = formData.guestId;
    if (!guestId) {
      const existingGuest = appState?.guests.find(g => g.phone === formData.guestPhone);
      if (existingGuest) {
        guestId = existingGuest.id;
      } else {
        guestId = `G-${Date.now()}`;
        const newGuest: GuestProfile = {
          id: guestId,
          name: formData.guestName,
          phone: formData.guestPhone,
          email: formData.guestEmail,
          nationality: "Unknown",
          tag: "Regular",
          tenantId: currentUser?.tenantId || "default"
        };
        await setDoc(doc(db, "guests", guestId), newGuest);
      }
    }

    const bookingId = `UH-${Date.now()}`;
    const newBooking: Booking = {
      ...formData,
      id: bookingId,
      guestId: guestId,
      status: BookingStatus.CONFIRMED,
      type: formData.type || "Daily",
      payments: formData.payments || [],
      timeline: [
        {
          status: BookingStatus.CONFIRMED,
          timestamp: new Date().toISOString(),
          actor: `Staff (${activeRole})`
        }
      ],
      identityVerified: false,
      documents: [],
      createdAt: new Date().toISOString(),
      tenantId: currentUser?.tenantId || "default"
    };
    await setDoc(doc(db, "bookings", bookingId), newBooking);
  };

  // Trigger Check-In API
  const handleCheckIn = async (bookingId: string) => {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) return;
    const data = bookingSnap.data() as Booking;
    
    await updateDoc(bookingRef, {
      status: BookingStatus.CHECKED_IN,
      timeline: [...data.timeline, {
        status: BookingStatus.CHECKED_IN,
        timestamp: new Date().toISOString(),
        actor: `Staff (${activeRole})`
      }]
    });
  };

  // Trigger Check-Out API (spawns Dirty room & clean task)
  const handleCheckOut = async (bookingId: string, lateFee: number, notes: string) => {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) return;
    const data = bookingSnap.data() as Booking;
    
    await updateDoc(bookingRef, {
      status: BookingStatus.CHECKED_OUT,
      totalAmount: data.totalAmount + lateFee,
      timeline: [...data.timeline, {
        status: BookingStatus.CHECKED_OUT,
        timestamp: new Date().toISOString(),
        actor: `Staff (${activeRole})`,
        notes: notes
      }]
    });

    // Mark room as dirty and spawn cleaning task
    const roomRef = doc(db, "rooms", data.roomId);
    await updateDoc(roomRef, {
      status: RoomStatus.DIRTY
    });

    const taskId = `HK-${Date.now()}`;
    await setDoc(doc(db, "housekeepingTasks", taskId), {
      id: taskId,
      roomId: data.roomId,
      type: "Checkout Clean",
      status: "Pending",
      priority: "High",
      timestamp: new Date().toISOString(),
      tenantId: currentUser?.tenantId || "default"
    });
  };

  // Trigger Housekeeping task update API
  const handleUpdateHousekeepingTask = async (taskData: any) => {
    const taskRef = doc(db, "housekeepingTasks", taskData.id);
    await updateDoc(taskRef, {
      status: taskData.status,
      assignedTo: taskData.assignedTo
    });

    if (taskData.status === "Inspected" || taskData.status === "Done") {
      const roomRef = doc(db, "rooms", taskData.roomId);
      await updateDoc(roomRef, {
        status: RoomStatus.CLEAN
      });
    }
  };

  // Trigger Maintenance raising API
  const handleRaiseMaintenance = async (maintData: any) => {
    const maintId = `M-${Date.now()}`;
    await setDoc(doc(db, "maintenanceRequests", maintId), {
      ...maintData,
      id: maintId,
      status: "Open",
      createdAt: new Date().toISOString(),
      tenantId: currentUser?.tenantId || "default"
    });
    
    const roomRef = doc(db, "rooms", maintData.roomId);
    await updateDoc(roomRef, {
      status: RoomStatus.OUT_OF_ORDER
    });
  };

  // Trigger Maintenance resolved update API
  const handleUpdateMaintenance = async (maintData: any) => {
    const maintRef = doc(db, "maintenanceRequests", maintData.id);
    await updateDoc(maintRef, {
      status: maintData.status,
      resolvedAt: maintData.status === "Resolved" ? new Date().toISOString() : undefined
    });

    if (maintData.status === "Resolved") {
      const roomRef = doc(db, "rooms", maintData.roomId);
      await updateDoc(roomRef, {
        status: RoomStatus.CLEAN // Assuming it needs cleaning or is clean after maintenance
      });
    }
  };

  // Trigger Google Sheets Migration simulation API
  const handleRunMigration = async () => {
    // Simulate migration by adding a mock booking to Firebase
    const bookingId = `UH-MIG-${Date.now()}`;
    const newBooking: Booking = {
      id: bookingId,
      roomId: "103",
      guestId: "G-MIG-1",
      guestName: "Migrated Guest",
      guestPhone: "+123456789",
      guestEmail: "migrated@example.com",
      checkInDate: new Date().toISOString().split("T")[0],
      checkOutDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      status: BookingStatus.CONFIRMED,
      type: BookingType.DAILY,
      totalAmount: 150,
      paidAmount: 150,
      source: "Google Sheets",
      payments: [],
      timeline: [],
      identityVerified: false,
      documents: [],
      createdAt: new Date().toISOString(),
      tenantId: currentUser?.tenantId || "default"
    };
    
    await setDoc(doc(db, "bookings", bookingId), newBooking);
    return {
      success: true,
      importCount: 1,
      conflictCount: 0,
      failCount: 0,
      reports: ["Successfully imported reservation from Sheets simulation."]
    };
  };

  // Trigger Gemini API price recommendation helper
  const handleTriggerAIInsights = async (): Promise<string> => {
    const roomCount = appState?.rooms.length || 0;
    const activeBookings = appState?.bookings.filter(b => b.status === BookingStatus.CHECKED_IN || b.status === BookingStatus.CONFIRMED) || [];
    const occupancyRate = roomCount > 0 ? Math.round((activeBookings.length / roomCount) * 100) : 0;
    
    const summaryContext = {
      occupancyRate: `${occupancyRate}%`,
      totalRooms: roomCount,
      activeBookings: activeBookings.length,
      roomsList: appState?.rooms.map(r => ({ id: r.id, type: r.type, status: r.status, baseRate: r.baseRate })) || [],
      maintenanceCount: appState?.maintenanceRequests.filter(m => m.status !== "Closed" && m.status !== "Resolved").length || 0,
      dirtyRooms: appState?.rooms.filter(r => r.status === RoomStatus.DIRTY).length || 0,
    };

    const res = await fetch("/api/gemini/price-recommendation", { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summaryContext })
    });
    if (!res.ok) throw new Error("Gemini AI offline");
    const data = await res.json();
    return data.recommendation;
  };

  // Update CRM guest details
  const handleUpdateGuest = async (updatedGuest: GuestProfile) => {
    const guestRef = doc(db, "guests", updatedGuest.id);
    await updateDoc(guestRef, {
      ...updatedGuest
    });
  };

  // Gantt click handler
  const handleSelectTimelineCell = (roomId: string, date: string) => {
    setPrefilledRoomId(roomId);
    setPrefilledStart(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    setPrefilledEnd(end.toISOString().split("T")[0]);
    setIsBookingOpen(true);
  };

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-sm font-bold text-gray-800">Verifying System Integrity...</h2>
        <p className="text-xs text-gray-450 mt-1 max-w-xs leading-normal font-medium font-sans">Connecting to secure Express backend and initializing auth handshakes...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (!appState) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-sm font-bold text-gray-800">Synchronizing Local Database Workspace...</h2>
        <p className="text-xs text-gray-455 mt-1 max-w-xs leading-normal font-medium font-sans">Loading encrypted data records and configuring role schemas...</p>
      </div>
    );
  }

  // Sidebar navigation options
  const sidebarItems = [
    { name: "Dashboard", icon: LayoutDashboard, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.AGENT] },
    { name: "Availability Grid", icon: CalendarDays, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.AGENT] },
    { name: "Manage Rooms", icon: Sliders, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { name: "Manage Users", icon: ShieldCheck, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { name: "Airbnb Channel Sync", icon: ArrowLeftRight, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.AGENT] },
    { name: "Housekeeping", icon: Sparkles, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HOUSEKEEPER] },
    { name: "Maintenance", icon: Wrench, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MAINTENANCE] },
    { name: "Guest CRM", icon: Users, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { name: "Google Sheets Migration", icon: FileSpreadsheet, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { name: "Google Calendar", icon: Calendar, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { name: "Guest Portal", icon: Globe, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.GUEST] },
  ];

  const allowedTabs = sidebarItems.filter(item => item.roles.includes(activeRole));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-gray-800">
      
      {/* Top Header bar optimized for mobile with single row layout */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-4 md:px-6 py-3.5 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Hamburger menu button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 -ml-1 text-gray-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <span className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-100 shrink-0">
            <Activity className="w-4 h-4 animate-pulse" />
          </span>
          <div>
            <h1 className="text-sm md:text-base font-extrabold text-gray-900 tracking-tight leading-tight">Urban Haven</h1>
            <p className="text-[9px] md:text-[10px] text-gray-400 font-bold leading-none uppercase tracking-wider mt-0.5 hidden sm:block">Short-Stay PMS</p>
          </div>
        </div>

        {/* Header Right Utilities */}
        <div className="flex items-center gap-2 md:gap-3">
          
          {/* Date Widget */}
          <div className="hidden lg:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-xs">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-mono font-bold text-gray-700">Date: {new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>

          {/* Active User display */}
          {currentUser && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-950">
              <span className="px-1.5 py-1 bg-indigo-600 text-white rounded-md text-[10px] uppercase font-black shrink-0 tracking-widest">{activeRole}</span>
              <span className="truncate max-w-[120px]">{currentUser?.name}</span>
            </div>
          )}

          {/* Secure Sign Out Button */}
          {currentUser && (
            <button
              onClick={handleLogout}
              className="p-2 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50/20 bg-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-bold text-xs"
              title="Sign Out of Workstation"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}

          {/* New reservation trigger - hidden on mobile header */}
          {activeRole !== UserRole.HOUSEKEEPER && activeRole !== UserRole.MAINTENANCE && (
            <button
              onClick={() => {
                setPrefilledRoomId("");
                setPrefilledStart("");
                setPrefilledEnd("");
                setIsBookingOpen(true);
              }}
              className="hidden md:flex px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 hover:shadow-indigo-100 transition-all items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Book Room
            </button>
          )}

        </div>
      </header>

      {/* Mobile Navigation Drawer Overlay & Panel */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 md:hidden transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer content */}
          <aside className="fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 flex flex-col p-6 z-55 shadow-2xl md:hidden animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-indigo-600 rounded-xl text-white shadow-md">
                  <Activity className="w-4 h-4 animate-pulse" />
                </span>
                <div>
                  <h1 className="text-sm font-extrabold text-white tracking-tight">Urban Haven</h1>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Short-Stay PMS</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick stats / Sim Date inside mobile drawer */}
            <div className="my-4 p-3 bg-slate-850/60 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold text-slate-300">System Date</span>
              </div>
              <span className="font-mono font-bold text-indigo-400">{new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              <div>
                <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-3 px-3">Primary Navigation</p>
                <nav className="space-y-1">
                  {allowedTabs.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.name;
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          setActiveTab(item.name);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold tracking-tight transition-all cursor-pointer ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                        {item.name}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Book Room inside drawer for easy mobile discoverability */}
              {activeRole !== UserRole.HOUSEKEEPER && activeRole !== UserRole.MAINTENANCE && (
                <div className="px-3">
                  <button
                    onClick={() => {
                      setPrefilledRoomId("");
                      setPrefilledStart("");
                      setPrefilledEnd("");
                      setIsMobileMenuOpen(false);
                      setIsBookingOpen(true);
                    }}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Book New Room
                  </button>
                </div>
              )}
            </div>

            {/* Profile card at the bottom of drawer */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center gap-3 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800/60">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white uppercase">
                  {(currentUser?.name || "??").substring(0, 2)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{currentUser?.name || "Staff Member"}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-wider">{activeRole}</p>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main dashboard body */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Navigation Sidebar (Desktop view) */}
        <aside className="hidden md:flex w-full md:w-64 bg-slate-900 text-slate-300 flex-col border-r border-slate-800 px-4 py-6 shrink-0 justify-between">
          <div className="space-y-6">
            <div>
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-4 px-3">Primary Navigation</p>
              <nav className="space-y-1">
                {allowedTabs.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => setActiveTab(item.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold tracking-tight transition-all cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                      {item.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* User profile card at the bottom of the sidebar */}
          <div className="pt-6 border-t border-slate-850 mt-6">
            <div className="flex items-center gap-3 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800/60">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white uppercase shadow-inner">
                {(currentUser?.name || "??").substring(0, 2)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{currentUser?.name || "Staff Member"}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-wider">{activeRole}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Display workspace tab area. Adjusted padding-bottom (pb-24) to avoid bottom mobile tab-bar interference */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full space-y-6">
          
          {/* Header Card showing Acting role and permissions context */}
          <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base md:text-lg font-black text-slate-800">{activeTab} Workstation</h2>
              <p className="text-xs text-slate-500 mt-1">
                Currently acting as <span className="font-bold text-indigo-600">{activeRole}</span>. Permitted actions are restricted automatically below.
              </p>
            </div>
            
            {/* Quick stats indicator */}
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1 md:px-3.5 md:py-1.5 rounded-lg text-xs font-bold text-indigo-950">
              <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Full compliance & secure SSL Active</span>
            </div>
          </div>

          {/* Workspaces router mapping */}
          {activeTab === "Dashboard" && (
            <DashboardOverview
              state={appState}
              activeRole={activeRole}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onTriggerAIInsights={handleTriggerAIInsights}
              onBookRoom={(roomId, checkIn, checkOut) => {
                setPrefilledRoomId(roomId);
                setPrefilledStart(checkIn);
                setPrefilledEnd(checkOut);
                setIsBookingOpen(true);
              }}
            />
          )}

          {activeTab === "Availability Grid" && (
            <CalendarTimeline
              state={appState}
              onSelectCell={handleSelectTimelineCell}
            />
          )}

          {activeTab === "Manage Rooms" && (
            <RoomManager
              state={appState}
              activeRole={activeRole}
              onRefresh={() => {}}
              tenantId={currentUser?.tenantId}
            />
          )}

          {activeTab === "Manage Users" && (
            <UserManager
              state={appState}
              activeRole={activeRole}
              onRefresh={() => {}}
              tenantId={currentUser?.tenantId}
            />
          )}

          {activeTab === "Airbnb Channel Sync" && (
            <AirbnbSync
              state={appState}
              activeRole={activeRole}
              onRefresh={() => {}}
            />
          )}

          {activeTab === "Housekeeping" && (
            <HousekeepingBoard
              state={appState}
              activeRole={activeRole}
              onUpdateTask={handleUpdateHousekeepingTask}
            />
          )}

          {activeTab === "Maintenance" && (
            <MaintenanceBoard
              state={appState}
              activeRole={activeRole}
              onRaiseRequest={handleRaiseMaintenance}
              onUpdateRequest={handleUpdateMaintenance}
            />
          )}

          {activeTab === "Guest CRM" && (
            <GuestCRM
              state={appState}
              activeRole={activeRole}
              onUpdateGuest={handleUpdateGuest}
            />
          )}

          {activeTab === "Google Sheets Migration" && (
            <MigrationTool
              state={appState}
              onRunMigration={handleRunMigration}
            />
          )}

          {activeTab === "Google Calendar" && (
            <GoogleCalendarSync
              state={appState}
              onRefresh={fetchState}
            />
          )}

          {activeTab === "Guest Portal" && (
            <RoomCatalog
              state={appState}
              onBookRoom={(roomId, checkIn, checkOut) => {
                setPrefilledRoomId(roomId);
                setPrefilledStart(checkIn || "");
                setPrefilledEnd(checkOut || "");
                setIsBookingOpen(true);
              }}
            />
          )}

        </main>
      </div>

      {/* Floating global footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4 pb-24 md:pb-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 font-bold uppercase tracking-wider shadow-inner mt-auto">
        <p>© 2026 Urban Haven Hospitality Network.</p>
        <p className="flex items-center gap-1">Made with <Heart className="w-3.5 h-3.5 text-red-500 shrink-0 fill-red-500" /> rafsanbillah@gmail.com</p>
      </footer>

      {/* Mobile Floating Action Button (FAB) for Booking */}
      {activeRole !== UserRole.HOUSEKEEPER && activeRole !== UserRole.MAINTENANCE && (
        <button
          onClick={() => {
            setPrefilledRoomId("");
            setPrefilledStart("");
            setPrefilledEnd("");
            setIsBookingOpen(true);
          }}
          className="md:hidden fixed bottom-20 right-4 w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all z-40 cursor-pointer border border-indigo-500"
          aria-label="Book room"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Bottom Tab Bar for Mobile Touch Devices */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40 md:hidden flex items-center justify-around h-16 shadow-lg px-2 pb-safe">
        {(() => {
          const maxVisible = 4;
          const showMoreButton = allowedTabs.length > maxVisible;
          const visibleTabs = showMoreButton ? allowedTabs.slice(0, maxVisible - 1) : allowedTabs;

          return (
            <>
              {visibleTabs.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveTab(item.name)}
                    className={`flex flex-col items-center justify-center gap-1 flex-1 h-full py-1 text-[10px] font-bold tracking-tight transition-all cursor-pointer ${
                      isActive ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                    <span className="truncate max-w-[70px]">{item.name}</span>
                  </button>
                );
              })}

              {showMoreButton && (
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="flex flex-col items-center justify-center gap-1 flex-1 h-full py-1 text-[10px] font-bold tracking-tight text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <Menu className="w-5 h-5 text-gray-400" />
                  <span>More</span>
                </button>
              )}
            </>
          );
        })()}
      </nav>

      {/* Primary Booking Form Modal */}
      <BookingFormModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        state={appState}
        onSubmit={handleBookingSubmit}
        prefilledRoomId={prefilledRoomId}
        prefilledStartDate={prefilledStart}
        prefilledEndDate={prefilledEnd}
        activeRole={activeRole}
      />

    </div>
  );
}
