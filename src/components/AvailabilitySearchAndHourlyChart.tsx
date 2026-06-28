/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, Room, Booking, BookingStatus, BookingType, RoomCategory } from "../types";
import { Search, Calendar, Clock, Filter, Check, ArrowRight, Sparkles, AlertCircle } from "lucide-react";

interface AvailabilitySearchAndHourlyChartProps {
  state: AppState;
  onBookRoom: (roomId: string, checkInDate: string, checkOutDate: string) => void;
}

export default function AvailabilitySearchAndHourlyChart({
  state,
  onBookRoom
}: AvailabilitySearchAndHourlyChartProps) {
  const [activeTab, setActiveTab] = useState<"search" | "hourly">("search");

  // Search State
  const [searchCheckIn, setSearchCheckIn] = useState("2026-06-24");
  const [searchCheckOut, setSearchCheckOut] = useState("2026-06-25");
  const [searchCategory, setSearchCategory] = useState<string>("All");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  // Hourly Chart State
  const [hourlyDate, setHourlyDate] = useState("2026-06-24");

  // Perform availability search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCheckIn >= searchCheckOut) {
      alert("Check-out date must be after check-in date.");
      return;
    }

    const results: any[] = [];

    state.rooms.forEach((room) => {
      // Filter by category if needed
      if (searchCategory !== "All" && room.type !== searchCategory) {
        return;
      }

      // Check parent-child clashes
      const lockedUnitIds = new Set<string>([room.id]);
      if (room.parentId) {
        lockedUnitIds.add(room.parentId);
      }
      if (room.isApartment || room.type === RoomCategory.APARTMENT) {
        state.rooms.forEach((r) => {
          if (r.parentId === room.id) {
            lockedUnitIds.add(r.id);
          }
        });
      }

      const clashingBooking = state.bookings.find((b) => {
        if (!lockedUnitIds.has(b.roomId)) return false;
        if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED) return false;
        return searchCheckIn < b.checkOutDate && searchCheckOut > b.checkInDate;
      });

      const isAvailable = !clashingBooking;

      // Calculate total stay price
      let baseRateTotal = 0;
      const start = new Date(searchCheckIn);
      const end = new Date(searchCheckOut);
      const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      let currentDate = new Date(start);
      for (let i = 0; i < nights; i++) {
        const day = currentDate.getDay();
        const isWeekend = day === 5 || day === 6;
        baseRateTotal += isWeekend ? room.weekendRate : room.baseRate;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const taxFactor = 1 + (state.settings.taxRate / 100);
      const estimatedTotal = Math.round(baseRateTotal * taxFactor * 100) / 100;

      results.push({
        room,
        isAvailable,
        clashingBooking,
        nights,
        estimatedTotal
      });
    });

    setSearchResults(results);
  };

  // Helper to map booking hourly blocks for chart rendering
  const getHourlyBlocks = (room: Room, dateStr: string) => {
    // 24 blocks (0-23 hours)
    const blocks = Array(24).fill(false);
    
    // Find any bookings overlapping this room (and connected clashing parent/children) on this day
    const lockedUnitIds = new Set<string>([room.id]);
    if (room.parentId) {
      lockedUnitIds.add(room.parentId);
    }
    if (room.isApartment || room.type === RoomCategory.APARTMENT) {
      state.rooms.forEach((r) => {
        if (r.parentId === room.id) {
          lockedUnitIds.add(r.id);
        }
      });
    }

    state.bookings.forEach((b) => {
      if (!lockedUnitIds.has(b.roomId)) return;
      if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED) return;

      // Check if dateStr overlaps the stay
      if (dateStr >= b.checkInDate && dateStr <= b.checkOutDate) {
        const isCheckInDay = dateStr === b.checkInDate;
        const isCheckOutDay = dateStr === b.checkOutDate;

        if (b.type === BookingType.HOURLY) {
          // If hourly booking, block specific hours (e.g. 10:00 to 14:00 by default or mock hours)
          // To make it dynamic, let's block from 11:00 to 11:00 + duration
          const checkInHour = 11;
          const duration = b.notes?.includes("Hours Block") 
            ? parseInt(b.notes) 
            : 3;
          
          if (isCheckInDay) {
            for (let h = checkInHour; h < Math.min(24, checkInHour + duration); h++) {
              blocks[h] = b;
            }
          }
        } else {
          // Daily booking blocks full day
          // If check-out day, block up to check-out time (e.g. 11:00 AM)
          // If check-in day, block starting from check-in time (e.g. 2:00 PM / 14:00)
          if (isCheckInDay && isCheckOutDay) {
            for (let h = 14; h < 24; h++) blocks[h] = b;
          } else if (isCheckInDay) {
            for (let h = 14; h < 24; h++) blocks[h] = b;
          } else if (isCheckOutDay) {
            for (let h = 0; h < 11; h++) blocks[h] = b;
          } else {
            for (let h = 0; h < 24; h++) blocks[h] = b;
          }
        }
      }
    });

    return blocks;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col w-full">
      {/* Header Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        <button
          onClick={() => setActiveTab("search")}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-r border-slate-150 transition-all ${
            activeTab === "search"
              ? "bg-white text-indigo-600 border-t-2 border-t-indigo-600"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <Search className="w-4 h-4" />
            Unit Availability Search
          </span>
        </button>
        <button
          onClick={() => setActiveTab("hourly")}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-all ${
            activeTab === "hourly"
              ? "bg-white text-indigo-600 border-t-2 border-t-indigo-600"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            Hourly Availability Scheduler
          </span>
        </button>
      </div>

      {/* Content Panels */}
      <div className="p-6">
        
        {/* TAB 1: SEARCH */}
        {activeTab === "search" && (
          <div className="space-y-6">
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Check-In</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={searchCheckIn}
                    onChange={(e) => setSearchCheckIn(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Check-Out</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={searchCheckOut}
                    onChange={(e) => setSearchCheckOut(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Unit Category</label>
                <div className="relative">
                  <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <select
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="All">All Types</option>
                    <option value={RoomCategory.APARTMENT}>Apartments</option>
                    <option value={RoomCategory.STANDARD}>Standard Rooms</option>
                    <option value={RoomCategory.EXECUTIVE}>Executive Rooms</option>
                    <option value={RoomCategory.SUITE}>Luxury Suites</option>
                    <option value={RoomCategory.STUDIO}>Studios</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer h-[34px]"
              >
                <Search className="w-4 h-4" />
                Find Available Units
              </button>
            </form>

            {/* Results Grid */}
            {searchResults ? (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Search Results ({searchResults.filter(r => r.isAvailable).length} Available Units)
                </h4>
                
                {searchResults.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center italic">No rooms match your filters.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map(({ room, isAvailable, clashingBooking, nights, estimatedTotal }) => (
                      <div
                        key={room.id}
                        className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                          isAvailable
                            ? "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md"
                            : "bg-slate-50/50 border-slate-100 opacity-75"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="text-xs font-black text-slate-800">{room.name}</h5>
                              <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-600 block mt-0.5">{room.type}</span>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isAvailable
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-red-50 text-red-600 border border-red-100"
                            }`}>
                              {isAvailable ? "Available" : "Occupied"}
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">{room.description}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div>
                            {isAvailable ? (
                              <>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Total ({nights} nights)</p>
                                <p className="text-sm font-black text-slate-800 mt-1">৳{estimatedTotal} <span className="text-[9px] text-slate-450 font-normal">tax incl.</span></p>
                              </>
                            ) : (
                              <div className="flex items-center gap-1 text-[9px] font-bold text-red-500">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span>Clash: {clashingBooking?.guestName}</span>
                              </div>
                            )}
                          </div>

                          {isAvailable && (
                            <button
                              onClick={() => onBookRoom(room.id, searchCheckIn, searchCheckOut)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                            >
                              Book Now
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center">
                <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse mb-3" />
                <h5 className="text-xs font-bold text-slate-700">Explore Room & Apartment Availability</h5>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-normal">Enter check-in & check-out dates and tap search to view available rentals with real-time price auditing.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HOURLY SCHEDULER */}
        {activeTab === "hourly" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-800">24-Hour Visual Planner Chart</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Visualize morning, afternoon, and evening occupancy profiles across all units.</p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">Selected Day:</label>
                <input
                  type="date"
                  value={hourlyDate}
                  onChange={(e) => setHourlyDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 24-Hour Column Headers */}
            <div className="overflow-x-auto">
              <div className="min-w-[800px] space-y-2">
                
                {/* Timeline Axis */}
                <div className="flex border-b border-slate-100 pb-2">
                  <div className="w-36 shrink-0 font-bold text-[9px] uppercase tracking-wider text-slate-400">Unit ID</div>
                  <div className="flex-1 grid gap-px text-center" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <span key={hour} className="text-[8px] font-mono font-bold text-slate-400">
                        {hour.toString().padStart(2, "0")}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rows for rooms */}
                <div className="divide-y divide-slate-100">
                  {state.rooms.map((room) => {
                    const blocks = getHourlyBlocks(room, hourlyDate);
                    return (
                      <div key={room.id} className="flex items-center py-2.5 hover:bg-slate-50/50">
                        {/* Room label stuck to left */}
                        <div className="w-36 shrink-0 pr-2">
                          <span className="text-[11px] font-bold text-slate-800 block truncate">{room.name}</span>
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 block truncate mt-0.5">{room.type}</span>
                        </div>

                        {/* Interactive Hours grid */}
                        <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                          {blocks.map((booking, hour) => {
                            const isOccupied = !!booking;
                            return (
                              <div
                                key={hour}
                                className={`h-6 rounded-sm relative group cursor-pointer transition-all ${
                                  isOccupied
                                    ? booking.type === BookingType.HOURLY
                                      ? "bg-amber-400 border border-amber-500 hover:bg-amber-500"
                                      : "bg-indigo-600 border border-indigo-700 hover:bg-indigo-700"
                                    : "bg-slate-100 hover:bg-indigo-50 border border-slate-150"
                                }`}
                                title={
                                  isOccupied
                                    ? `Hour: ${hour}:00\nGuest: ${booking.guestName}\nType: ${booking.type}\nStatus: ${booking.status}`
                                    : `Hour: ${hour}:00\nAvailable! Click Room Booking above to reserve.`
                                }
                              >
                                {/* Tooltip hover helper */}
                                {isOccupied && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 text-white text-[9px] font-bold rounded-md px-2.5 py-1.5 shadow-xl whitespace-nowrap z-30">
                                    <p className="leading-none">{booking.guestName}</p>
                                    <p className="text-[8px] text-slate-400 mt-1">{booking.type} stay • Hour {hour}:00</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

            {/* Legend indicators */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[10px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-indigo-600 block border border-indigo-700" /> Daily (Overnight) Bookings
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-400 block border border-amber-500" /> Hourly Short-Rent Bookings
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-slate-100 block border border-slate-150" /> Available Slots
              </span>
              <span className="ml-auto text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                *Times reflect simulation clock index
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
