import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  User,
  Sparkles,
  Wifi,
  Tv,
  Coffee,
  Wind,
  Layers,
  DollarSign,
  Calendar,
  X,
  Compass,
  ArrowUpDown,
  Utensils,
  CheckCircle,
  Clock,
  Shield,
  Percent,
  Check,
  BadgeAlert,
  Info,
  Maximize2,
  VolumeX,
  Ban,
  HeartHandshake,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AppState, Room, RoomCategory, RoomStatus, Booking, BookingStatus } from "../types";

interface RoomCatalogProps {
  state: AppState;
  onBookRoom: (roomId: string, checkIn?: string, checkOut?: string) => void;
}

export const RoomCatalog: React.FC<RoomCatalogProps> = ({ state, onBookRoom }) => {
  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<RoomCategory | "ALL">("ALL");
  const [guestCount, setGuestCount] = useState<number>(1);
  const [maxPrice, setMaxPrice] = useState<number>(500);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"rate-asc" | "rate-desc" | "capacity-desc" | "name-asc">("rate-asc");
  
  // Date-based Availability check
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");

  // Selected room for detailed view modal
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Gallery interactive indexes
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  // Dynamic cost estimation state inside detail modal
  const [calcCheckIn, setCalcCheckIn] = useState<string>("");
  const [calcCheckOut, setCalcCheckOut] = useState<string>("");

  // Predefined image mappings for immersive card feel
  const roomCategoryImages: Record<RoomCategory, string[]> = {
    [RoomCategory.STANDARD]: [
      "https://images.unsplash.com/photo-1611891405178-49b317cb0a67?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800"
    ],
    [RoomCategory.EXECUTIVE]: [
      "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=800"
    ],
    [RoomCategory.SUITE]: [
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&q=80&w=800"
    ],
    [RoomCategory.STUDIO]: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=800"
    ],
    [RoomCategory.APARTMENT]: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800"
    ]
  };

  const getAmenitiesIcons = (amenityName: string) => {
    const norm = amenityName.toLowerCase();
    if (norm.includes("wifi") || norm.includes("internet")) return <Wifi className="w-3.5 h-3.5" />;
    if (norm.includes("tv") || norm.includes("netflix") || norm.includes("screen")) return <Tv className="w-3.5 h-3.5" />;
    if (norm.includes("coffee") || norm.includes("espresso") || norm.includes("tea")) return <Coffee className="w-3.5 h-3.5" />;
    if (norm.includes("ac") || norm.includes("air") || norm.includes("condition")) return <Wind className="w-3.5 h-3.5" />;
    if (norm.includes("kitchen") || norm.includes("microwave") || norm.includes("fridge")) return <Utensils className="w-3.5 h-3.5" />;
    return <Sparkles className="w-3.5 h-3.5" />;
  };

  // Dynamically set max rate filter slider bounds
  const ratesBoundaries = useMemo(() => {
    if (state.rooms.length === 0) return { min: 0, max: 500 };
    const rates = state.rooms.map(r => r.baseRate);
    return {
      min: Math.min(...rates),
      max: Math.max(...rates)
    };
  }, [state.rooms]);

  // Set the default slider max based on rates on component mount
  useEffect(() => {
    if (ratesBoundaries.max > 0) {
      setMaxPrice(ratesBoundaries.max);
    }
  }, [ratesBoundaries]);

  // Set calculator dates when opening modal
  useEffect(() => {
    if (selectedRoom) {
      setCalcCheckIn(checkIn || new Date().toISOString().split("T")[0]);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCalcCheckOut(checkOut || tomorrow.toISOString().split("T")[0]);
      setActivePhotoIndex(0);
      setIsLightboxOpen(false);
    }
  }, [selectedRoom, checkIn, checkOut]);

  // Function to check if a room is available during selected dates
  const isRoomAvailable = (room: Room, start: string, end: string): boolean => {
    if (!start || !end) return true;
    if (start >= end) return false;

    // Build locked unit IDs for parent/child check
    const lockedUnitIds = new Set<string>([room.id]);
    if (room.parentId) {
      lockedUnitIds.add(room.parentId);
    }
    if (room.isApartment || room.type === RoomCategory.APARTMENT) {
      state.rooms.forEach(r => {
        if (r.parentId === room.id) {
          lockedUnitIds.add(r.id);
        }
      });
    }

    // Filter existing bookings for overlapping dates
    const conflicts = state.bookings.filter(b => {
      if (!lockedUnitIds.has(b.roomId)) return false;
      // Skip cancelled or rejected bookings
      if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED) return false;

      // Overlap check
      const bStart = b.checkInDate;
      const bEnd = b.checkOutDate;
      return (start < bEnd && end > bStart);
    });

    return conflicts.length === 0;
  };

  // Filter & Sort Rooms
  const filteredRooms = useMemo(() => {
    let result = [...state.rooms];

    // Filter by Category
    if (selectedCategory !== "ALL") {
      result = result.filter(r => r.type === selectedCategory);
    }

    // Filter by Capacity
    result = result.filter(r => r.capacity >= guestCount);

    // Filter by Max Price
    result = result.filter(r => r.baseRate <= maxPrice);

    // Filter by Search Query (name or description or amenities)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.description.toLowerCase().includes(q) ||
        r.amenities.some(a => a.toLowerCase().includes(q))
      );
    }

    // Filter by Date Availability
    if (checkIn && checkOut && checkIn < checkOut) {
      result = result.filter(r => isRoomAvailable(r, checkIn, checkOut));
    }

    // Sort Rooms
    result.sort((a, b) => {
      switch (sortBy) {
        case "rate-asc":
          return a.baseRate - b.baseRate;
        case "rate-desc":
          return b.baseRate - a.baseRate;
        case "capacity-desc":
          return b.capacity - a.capacity;
        case "name-asc":
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [state.rooms, state.bookings, selectedCategory, guestCount, maxPrice, searchQuery, sortBy, checkIn, checkOut]);

  // Calculate weekend vs weekday nights and estimate charges
  const costEstimation = useMemo(() => {
    if (!selectedRoom || !calcCheckIn || !calcCheckOut || calcCheckIn >= calcCheckOut) {
      return null;
    }

    const start = new Date(calcCheckIn);
    const end = new Date(calcCheckOut);
    const totalNights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (totalNights <= 0) return null;

    let weekdayNights = 0;
    let weekendNights = 0;
    let current = new Date(start);

    for (let i = 0; i < totalNights; i++) {
      const day = current.getDay();
      // 5 = Friday, 6 = Saturday
      if (day === 5 || day === 6) {
        weekendNights++;
      } else {
        weekdayNights++;
      }
      current.setDate(current.getDate() + 1);
    }

    const weekdaySubtotal = weekdayNights * selectedRoom.baseRate;
    const weekendSubtotal = weekendNights * (selectedRoom.weekendRate || selectedRoom.baseRate * 1.15);
    const subtotal = weekdaySubtotal + weekendSubtotal;
    
    const taxRate = state.settings.taxRate || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    return {
      totalNights,
      weekdayNights,
      weekendNights,
      weekdaySubtotal,
      weekendSubtotal,
      subtotal,
      taxAmount,
      taxRate,
      total,
      isAvailable: isRoomAvailable(selectedRoom, calcCheckIn, calcCheckOut)
    };
  }, [selectedRoom, calcCheckIn, calcCheckOut, state.bookings]);

  const handleResetFilters = () => {
    setSelectedCategory("ALL");
    setGuestCount(1);
    setMaxPrice(ratesBoundaries.max || 500);
    setSearchQuery("");
    setCheckIn("");
    setCheckOut("");
    setSortBy("rate-asc");
  };

  const handleExportCSV = () => {
    const headers = ["Room ID", "Name", "Category", "Capacity", "Base Rate", "Status", "Description"];
    const rows = filteredRooms.map(r => [
      r.id,
      r.name,
      r.type,
      r.capacity,
      r.baseRate,
      r.status,
      `"${r.description.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "room_catalog.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Urban Haven - Room Catalog", 14, 15);
    
    const tableData = filteredRooms.map(r => [
      r.id,
      r.name,
      r.type,
      r.capacity.toString(),
      `$${r.baseRate}`,
      r.status
    ]);

    autoTable(doc, {
      startY: 20,
      head: [["ID", "Name", "Category", "Capacity", "Rate", "Status"]],
      body: tableData,
    });

    doc.save("room_catalog.pdf");
  };

  return (
    <div className="space-y-6">
      
      {/* Immersive Header Banner */}
      <div className="bg-linear-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden border border-indigo-800/20">
        <div className="absolute top-6 right-8 flex gap-3 z-20">
          <button onClick={handleExportCSV} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border border-white/20 cursor-pointer">
            Export CSV
          </button>
          <button onClick={handleExportPDF} className="bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-900/50">
            Export PDF
          </button>
        </div>
        <div className="max-w-2xl space-y-3 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
            <Compass className="w-3.5 h-3.5 text-indigo-400" /> Guest Room Browser
          </span>
          <h2 className="text-3xl font-black tracking-tight md:text-4xl text-white">Find Your Perfect Stay</h2>
          <p className="text-xs text-indigo-200/80 leading-relaxed md:text-sm">
            Experience absolute comfort at Urban Haven. Filter by live availability, customize your capacity requirements, and preview complete pricing breakdowns including local weekend premiums instantly.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none transform translate-y-10 translate-x-10">
          <Layers className="w-80 h-80 text-indigo-400" />
        </div>
      </div>

      {/* Date Search & Availability Filter Panel */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Check-In Date
          </label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold outline-hidden transition-all text-gray-700"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Check-Out Date
          </label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={checkIn || new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 bg-slate-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold outline-hidden transition-all text-gray-700"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-indigo-500" /> Search Keyword
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="WiFi, Suite, Pool, Kitchen..."
            className="w-full px-3.5 py-2 bg-slate-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-medium outline-hidden transition-all text-gray-700"
          />
        </div>

        <div className="flex gap-2">
          {(checkIn || checkOut || searchQuery) && (
            <button
              onClick={() => {
                setCheckIn("");
                setCheckOut("");
                setSearchQuery("");
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-600 rounded-xl text-xs font-bold transition-all cursor-pointer grow flex items-center justify-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear Dates
            </button>
          )}
          <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-[10px] text-indigo-800 font-bold leading-normal flex-1 text-center">
            {checkIn && checkOut ? (
              checkIn >= checkOut ? (
                <span className="text-red-600">Invalid Date Range</span>
              ) : (
                <span>Filtering available units</span>
              )
            ) : (
              <span>Showing all units</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Catalog View: Side Filters + Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Filters Sidebar */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" /> Filters
            </h3>
            <button
              onClick={handleResetFilters}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold uppercase tracking-wide cursor-pointer hover:underline"
            >
              Reset All
            </button>
          </div>

          {/* Category Quick Filter */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Room Category</label>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setSelectedCategory("ALL")}
                className={`w-full px-3 py-2 text-left rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                  selectedCategory === "ALL"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-gray-700"
                }`}
              >
                <span>All Categories</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${selectedCategory === "ALL" ? "bg-indigo-700 text-indigo-100" : "bg-gray-200 text-gray-600"}`}>
                  {state.rooms.length}
                </span>
              </button>
              {Object.values(RoomCategory).map((cat) => {
                const count = state.rooms.filter(r => r.type === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full px-3 py-2 text-left rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      selectedCategory === cat
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-gray-700"
                    }`}
                  >
                    <span>{cat}s</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${selectedCategory === cat ? "bg-indigo-700 text-indigo-100" : "bg-gray-200 text-gray-600"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guest capacity Filter */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Minimum Capacity</span>
              <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs">{guestCount} Guests</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                className="w-10 h-10 border border-gray-200 hover:border-gray-300 rounded-xl text-gray-600 font-extrabold text-sm transition-all bg-slate-50 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                disabled={guestCount <= 1}
              >
                -
              </button>
              <div className="flex-1 text-center font-bold text-xs">
                {guestCount} Guest{guestCount > 1 ? "s" : ""}
              </div>
              <button
                onClick={() => setGuestCount(Math.min(6, guestCount + 1))}
                className="w-10 h-10 border border-gray-200 hover:border-gray-300 rounded-xl text-gray-600 font-extrabold text-sm transition-all bg-slate-50 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                disabled={guestCount >= 6}
              >
                +
              </button>
            </div>
          </div>

          {/* Pricing slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Max Nightly Rate</label>
              <span className="font-mono font-black text-indigo-600 text-xs">৳{maxPrice} / night</span>
            </div>
            <input
              type="range"
              min={ratesBoundaries.min}
              max={ratesBoundaries.max || 500}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-bold">
              <span>৳{ratesBoundaries.min}</span>
              <span>৳{ratesBoundaries.max}</span>
            </div>
          </div>

          {/* Sort selection */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" /> Sort Results By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold outline-hidden cursor-pointer"
            >
              <option value="rate-asc">Price: Low to High</option>
              <option value="rate-desc">Price: High to Low</option>
              <option value="capacity-desc">Capacity: Large to Small</option>
              <option value="name-asc">Room Number: Ascending</option>
            </select>
          </div>
        </div>

        {/* Room Listings Grid */}
        <div className="lg:col-span-3 space-y-6">
          
          <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
            <p>Showing {filteredRooms.length} of {state.rooms.length} Units Available</p>
            {sortBy && <p className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-black">Sorted</p>}
          </div>

          {filteredRooms.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-gray-200 shadow-2xs space-y-4">
              <span className="p-4 bg-indigo-50 text-indigo-600 rounded-full inline-block">
                <BadgeAlert className="w-8 h-8" />
              </span>
              <h4 className="text-sm font-black text-gray-800">No rooms match your filters</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                Try widening your price boundaries, reducing guest counts, or clearing your reservation check-in dates to see full list.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredRooms.map((room) => {
                const photos = (room.images && room.images.length > 0) ? room.images : (roomCategoryImages[room.type] || roomCategoryImages[RoomCategory.STANDARD]);
                const available = checkIn && checkOut ? isRoomAvailable(room, checkIn, checkOut) : true;
                
                return (
                  <div
                    key={room.id}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col group"
                  >
                    {/* Immersive Image Header */}
                    <div className="relative h-48 overflow-hidden bg-slate-900">
                      <img
                        src={photos[0]}
                        alt={room.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Live availability Tag */}
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider backdrop-blur-md bg-slate-900/80 text-white border border-white/10">
                          Room {room.name}
                        </span>
                        
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider backdrop-blur-md border ${
                          available
                            ? "bg-emerald-500/80 text-white border-emerald-400/20"
                            : "bg-red-500/80 text-white border-red-400/20"
                        }`}>
                          {available ? "Instant Booking" : "Dates Unavailable"}
                        </span>
                      </div>

                      {/* Bottom Category Tag */}
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-white">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-indigo-600">
                          {room.type}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-bold bg-slate-900/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                          <User className="w-3.5 h-3.5" /> Max {room.capacity}
                        </div>
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-800">
                            {room.type} Escape (Unit {room.name})
                          </h4>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            Floor {room.floor}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                          {room.description}
                        </p>
                      </div>

                      {/* Amenities Icons Row */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {room.amenities.slice(0, 4).map((amenity, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 text-gray-500 text-[10px] font-semibold rounded-lg"
                          >
                            {getAmenitiesIcons(amenity)}
                            {amenity}
                          </span>
                        ))}
                        {room.amenities.length > 4 && (
                          <span className="text-[10px] font-bold text-gray-400 self-center px-1">
                            +{room.amenities.length - 4} more
                          </span>
                        )}
                      </div>

                      {/* Rates Row & Booking Action */}
                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Nightly Base Rate</p>
                          <p className="text-lg font-black text-indigo-600">৳{room.baseRate}<span className="text-[10px] font-bold text-gray-400">/night</span></p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedRoom(room)}
                            className="px-3.5 py-2 hover:bg-slate-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Details
                          </button>
                          
                          <button
                            onClick={() => onBookRoom(room.id, checkIn, checkOut)}
                            disabled={!available}
                            className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                              available
                                ? "bg-indigo-600 hover:bg-indigo-700 hover:shadow-md"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            Book Stay
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Side-Drawer Backdrop Blur Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-45 transition-opacity duration-300 ${
          selectedRoom ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSelectedRoom(null)}
      />

      {/* Details Side-Drawer */}
      {selectedRoom && (
        <div 
          className={`fixed right-0 top-0 bottom-0 max-w-2xl w-full bg-white shadow-2xl z-50 border-l border-gray-200 flex flex-col h-full transition-transform duration-300 ease-out transform translate-x-0`}
        >
          {/* Header section with category and unit title */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
            <div>
              <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider">
                {selectedRoom.type} Escape
              </span>
              <h3 className="text-base font-black text-gray-900 mt-1.5">Detailed Room Profile — Unit {selectedRoom.name}</h3>
            </div>
            <button
              onClick={() => setSelectedRoom(null)}
              className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Main body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* Immersive Photo Gallery Component */}
            <div className="space-y-3">
              {(() => {
                const photos = (selectedRoom.images && selectedRoom.images.length > 0) ? selectedRoom.images : (roomCategoryImages[selectedRoom.type] || roomCategoryImages[RoomCategory.STANDARD]);
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Photo Gallery</h4>
                      <p className="text-[10px] text-gray-400 font-bold">Image {activePhotoIndex + 1} of {photos.length}</p>
                    </div>
                    
                    {/* Featured main image with next/prev overlays */}
                    <div className="relative h-72 rounded-2xl overflow-hidden bg-slate-900 group">
                      <img
                        src={photos[activePhotoIndex]}
                        alt={`${selectedRoom.name} featured`}
                        className="w-full h-full object-cover transition-all duration-300"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Previous Image arrow on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/10"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {/* Next Image arrow on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/10"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Lightbox Trigger button */}
                      <button 
                        onClick={() => setIsLightboxOpen(true)}
                        className="absolute bottom-3 right-3 p-2 bg-slate-900/75 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs transition-all text-[10px] font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer border border-white/10"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Fullscreen View
                      </button>
                    </div>

                    {/* Thumbnail Strip Selector */}
                    <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                      {photos.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`relative w-24 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                            activePhotoIndex === idx 
                              ? "border-indigo-600 ring-2 ring-indigo-600/20 scale-95" 
                              : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Room Specifications Dashboard */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                <Layers className="w-4 h-4 mx-auto text-indigo-500 mb-1" />
                <p className="text-[10px] text-gray-400 font-bold uppercase">Floor Level</p>
                <p className="text-xs font-black text-slate-800">Floor {selectedRoom.floor}</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                <User className="w-4 h-4 mx-auto text-indigo-500 mb-1" />
                <p className="text-[10px] text-gray-400 font-bold uppercase">Capacity</p>
                <p className="text-xs font-black text-slate-800">{selectedRoom.capacity} Guests</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                <Shield className="w-4 h-4 mx-auto text-indigo-500 mb-1" />
                <p className="text-[10px] text-gray-400 font-bold uppercase">Room State</p>
                <p className="text-xs font-black text-emerald-600">{selectedRoom.status}</p>
              </div>
            </div>

            {/* Room description panel */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Detailed Description</h4>
              <p className="text-xs text-gray-600 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100 font-medium">
                {selectedRoom.description}
              </p>
            </div>

            {/* Specific Dynamic House Rules Panel */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-indigo-500" /> Specific House Rules & Stay Policies
              </h4>
              <div className="space-y-2">
                {[
                  {
                    icon: <VolumeX className="w-4 h-4 text-rose-500" />,
                    title: "Quiet Hours Enforced",
                    desc: "Quiet hours strictly observed from 10:00 PM to 8:00 AM to preserve a peaceful premium stay environment."
                  },
                  {
                    icon: <Ban className="w-4 h-4 text-rose-500" />,
                    title: "Strict No Party Policy",
                    desc: "Loud gatherings, commercial photo/video shoots, or unregistered overnight visitors are strictly forbidden."
                  },
                  {
                    icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
                    title: "No-Smoking Facility",
                    desc: "100% smoke-free and vape-free environment inside the room and balconies (৳25,000 fine applies)."
                  },
                  {
                    icon: <Clock className="w-4 h-4 text-indigo-500" />,
                    title: "Check-In / Check-Out",
                    desc: "Check-in begins at 3:00 PM; check-out is prompt at 11:00 AM to allow for intensive housekeeping cycles."
                  },
                  ...(selectedRoom.type === RoomCategory.SUITE || selectedRoom.type === RoomCategory.EXECUTIVE ? [{
                    icon: <HeartHandshake className="w-4 h-4 text-amber-500" />,
                    title: "Elite Experience Guard",
                    desc: "Complimentary workspace access and premium espresso provisions included. Please care for sensitive electronics."
                  }] : [{
                    icon: <Shield className="w-4 h-4 text-indigo-500" />,
                    title: "Standard Capacity Cap",
                    desc: "No pets allowed, and visitor count cannot exceed standard capacity without prior staff registration."
                  }])
                ].map((rule, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 flex gap-3 transition-colors">
                    <span className="p-2 bg-white rounded-lg border border-slate-200 self-start shadow-2xs">
                      {rule.icon}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-gray-800">{rule.title}</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{rule.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Standard Room Amenities panel */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Standard Room Amenities</h4>
              <div className="grid grid-cols-2 gap-2">
                {selectedRoom.amenities.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 font-medium">
                    <span className="p-1.5 bg-indigo-50 rounded text-indigo-600">
                      {getAmenitiesIcons(amenity)}
                    </span>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Standard Rates Information & Live Estimator Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
              
              {/* Left Column: Standard Pricing Matrix */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between">
                <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-indigo-500" /> Pricing Matrix
                </h4>
                <div className="grid grid-cols-2 gap-2 py-1">
                  <div className="text-center bg-white p-2 rounded-xl border border-slate-100">
                    <p className="text-[8px] text-gray-400 font-extrabold uppercase">Weekday</p>
                    <p className="text-sm font-black text-indigo-600">৳{selectedRoom.baseRate}<span className="text-[9px] font-normal text-gray-400">/night</span></p>
                  </div>
                  <div className="text-center bg-white p-2 rounded-xl border border-slate-100">
                    <p className="text-[8px] text-gray-400 font-extrabold uppercase">Weekend</p>
                    <p className="text-sm font-black text-amber-600">৳{selectedRoom.weekendRate || Math.round(selectedRoom.baseRate * 1.15)}<span className="text-[9px] font-normal text-gray-400">/night</span></p>
                  </div>
                </div>
                <p className="text-[9px] text-gray-400 leading-relaxed italic">Weekend pricing automatically applies to Friday and Saturday bookings.</p>
              </div>

              {/* Right Column: Live Estimator */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" /> Live Estimator
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-wider">Check-In</label>
                    <input
                      type="date"
                      value={calcCheckIn}
                      onChange={(e) => setCalcCheckIn(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-wider">Check-Out</label>
                    <input
                      type="date"
                      value={calcCheckOut}
                      onChange={(e) => setCalcCheckOut(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-semibold"
                    />
                  </div>
                </div>

                {costEstimation ? (
                  <div className="space-y-3 pt-2 border-t border-slate-200 text-[11px]">
                    <div className={`p-1.5 rounded-lg text-center text-[9px] font-extrabold border ${
                      costEstimation.isAvailable
                        ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                        : "bg-red-50 text-red-800 border-red-100"
                    }`}>
                      {costEstimation.isAvailable ? `✓ Available` : `⚠ Dates unavailable`}
                    </div>

                    <div className="space-y-1 font-medium">
                      <div className="flex justify-between text-gray-500">
                        <span>Duration:</span>
                        <span className="font-bold text-gray-800">{costEstimation.totalNights} Nights</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-bold">৳{costEstimation.subtotal}</span>
                      </div>
                      <div className="flex justify-between text-indigo-600 font-extrabold">
                        <span>Total (Est):</span>
                        <span>৳{costEstimation.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onBookRoom(selectedRoom.id, calcCheckIn, calcCheckOut);
                        setSelectedRoom(null);
                      }}
                      disabled={!costEstimation.isAvailable}
                      className={`w-full py-1.5 text-center text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all cursor-pointer ${
                        costEstimation.isAvailable
                          ? "bg-indigo-600 hover:bg-indigo-700"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {costEstimation.isAvailable ? "Reserve Now" : "Unavailable"}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400 text-[9px] italic">
                    Specify check-in & check-out dates to compute quotes.
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-slate-50">
            <button
              onClick={() => setSelectedRoom(null)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold bg-white hover:bg-gray-50 transition-all cursor-pointer"
            >
              Close Details
            </button>
          </div>

        </div>
      )}

      {/* Fullscreen Photo Lightbox Component */}
      {selectedRoom && isLightboxOpen && (
        <div className="fixed inset-0 bg-slate-950/95 z-100 flex flex-col justify-between p-6 animate-fade-in">
          {/* Lightbox Header */}
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-xs text-indigo-400 font-black uppercase tracking-widest">{selectedRoom.type} Suite</p>
              <h3 className="text-base font-black">Interactive Gallery — Unit {selectedRoom.name}</h3>
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer border border-white/10 bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Large Main Gallery View with navigation */}
          {(() => {
            const photos = (selectedRoom.images && selectedRoom.images.length > 0) ? selectedRoom.images : (roomCategoryImages[selectedRoom.type] || roomCategoryImages[RoomCategory.STANDARD]);
            return (
              <>
                <div className="flex-1 flex items-center justify-center relative my-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
                    }}
                    className="absolute left-4 p-4 bg-white/5 hover:bg-white/15 text-white rounded-full backdrop-blur-md transition-all cursor-pointer border border-white/10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <img
                    src={photos[activePhotoIndex]}
                    alt={`${selectedRoom.name} Fullscreen`}
                    className="max-h-[70vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl"
                    referrerPolicy="no-referrer"
                  />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
                    }}
                    className="absolute right-4 p-4 bg-white/5 hover:bg-white/15 text-white rounded-full backdrop-blur-md transition-all cursor-pointer border border-white/10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                {/* Lightbox Thumbnail Strip Selector */}
                <div className="flex justify-center gap-3 overflow-x-auto py-2">
                  {photos.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative w-24 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0 ${
                        activePhotoIndex === idx 
                          ? "border-indigo-500 scale-105" 
                          : "border-transparent opacity-40 hover:opacity-100"
                      }`}
                    >
                      <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}

    </div>
  );
};
