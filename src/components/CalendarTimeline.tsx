/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, Room, Booking, BookingStatus, RoomCategory } from "../types";
import { ChevronLeft, ChevronRight, Calendar, Users, Filter, Plus } from "lucide-react";

interface CalendarTimelineProps {
  state: AppState;
  onSelectCell: (roomId: string, date: string) => void;
}

export default function CalendarTimeline({ state, onSelectCell }: CalendarTimelineProps) {
  // We'll show a range of 14 days around a central anchor date
  const [anchorDate, setAnchorDate] = useState<Date>(new Date("2026-06-23")); // Anchor near typical simulation time
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const datesList: Date[] = [];
  const startDay = new Date(anchorDate);
  // Let's start 3 days before anchor to give context
  startDay.setDate(startDay.getDate() - 3);

  for (let i = 0; i < 14; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    datesList.push(d);
  }

  const shiftDays = (amount: number) => {
    const newAnchor = new Date(anchorDate);
    newAnchor.setDate(anchorDate.getDate() + amount);
    setAnchorDate(newAnchor);
  };

  const formatDateStr = (d: Date) => {
    return d.toISOString().split("T")[0];
  };

  const getDayName = (d: Date) => {
    return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Dhaka" });
  };

  const getDayNum = (d: Date) => {
    return d.getDate();
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  // Filter rooms
  const filteredRooms = state.rooms.filter(r => categoryFilter === "All" || r.type === categoryFilter);

  // Helper to find a booking on a specific room & date
  const findBookingForCell = (roomId: string, dateStr: string): Booking | undefined => {
    // 1. Direct booking
    const directBooking = state.bookings.find(b => {
      if (b.roomId !== roomId) return false;
      if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED) return false;
      return dateStr >= b.checkInDate && dateStr < b.checkOutDate;
    });
    if (directBooking) return directBooking;

    // 2. Child booking blocking parent apartment
    const room = state.rooms.find(r => r.id === roomId);
    if (room?.isApartment) {
      const childBooking = state.bookings.find(b => {
        if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED) return false;
        const bRoom = state.rooms.find(r => r.id === b.roomId);
        if (bRoom?.parentId !== room.id) return false;
        return dateStr >= b.checkInDate && dateStr < b.checkOutDate;
      });
      if (childBooking) {
        return {
          id: `BLOCKED`,
          roomId,
          guestId: "SYSTEM",
          guestName: `Clash (${childBooking.roomId})`,
          guestPhone: "",
          guestEmail: "",
          checkInDate: childBooking.checkInDate,
          checkOutDate: childBooking.checkOutDate,
          type: "Block" as any,
          notes: "Blocked due to child room booking.",
          totalAmount: 0,
          paidAmount: 0,
          status: BookingStatus.PENDING,
          source: "Walk-In",
          payments: [],
          timeline: [],
          identityVerified: false,
          documents: [],
          createdAt: ""
        } as Booking;
      }
    }

    // 3. Parent booking blocking child room
    if (room?.parentId) {
      const parentBooking = state.bookings.find(b => {
        if (b.roomId !== room.parentId) return false;
        if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED) return false;
        return dateStr >= b.checkInDate && dateStr < b.checkOutDate;
      });
      if (parentBooking) {
        return {
          id: `BLOCKED`,
          roomId,
          guestId: "SYSTEM",
          guestName: `Clash (Apartment)`,
          guestPhone: "",
          guestEmail: "",
          checkInDate: parentBooking.checkInDate,
          checkOutDate: parentBooking.checkOutDate,
          type: "Block" as any,
          notes: "Blocked due to parent apartment booking.",
          totalAmount: 0,
          paidAmount: 0,
          status: BookingStatus.PENDING,
          source: "Walk-In",
          payments: [],
          timeline: [],
          identityVerified: false,
          documents: [],
          createdAt: ""
        } as Booking;
      }
    }

    return undefined;
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CHECKED_IN:
        return "bg-emerald-500 border-emerald-600 text-white";
      case BookingStatus.CONFIRMED:
        return "bg-indigo-500 border-indigo-600 text-white";
      case BookingStatus.CHECKED_OUT:
        return "bg-slate-400 border-slate-500 text-white";
      case BookingStatus.PENDING:
        return "bg-amber-400 border-amber-500 text-gray-900";
      default:
        return "bg-gray-200 border-gray-300 text-gray-700";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      
      {/* Controls Bar */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <div>
            <h4 className="text-sm font-bold text-slate-800">Gantt Availability Timeline</h4>
            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1">
              <span>Click empty cells to trigger booking creation instantly.</span>
              <span className="inline-flex sm:hidden text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-sm">Swipe horizontally to view days</span>
            </p>
          </div>
        </div>

        {/* Filters and Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Category Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-semibold text-slate-750 bg-transparent border-none outline-hidden p-0 cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value={RoomCategory.STANDARD}>Standard Rooms</option>
              <option value={RoomCategory.EXECUTIVE}>Executive Rooms</option>
              <option value={RoomCategory.SUITE}>Luxury Suites</option>
              <option value={RoomCategory.STUDIO}>Studios</option>
            </select>
          </div>

          {/* Date navigate */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shadow-xs bg-white">
            <button
              onClick={() => shiftDays(-7)}
              className="p-1.5 hover:bg-slate-50 border-r border-slate-200 cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4 text-slate-650" />
            </button>
            <span className="px-3 py-1 text-xs font-bold text-slate-700">
              {datesList[0]?.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Dhaka" })} - {datesList[datesList.length - 1]?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Dhaka" })}
            </span>
            <button
              onClick={() => shiftDays(7)}
              className="p-1.5 hover:bg-slate-50 border-l border-slate-200 cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4 text-slate-650" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Timeline Scrollable area */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {/* Table Header Dates Row */}
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="sticky left-0 bg-slate-50/80 backdrop-blur-xs z-20 text-left p-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider w-44 min-w-44 border-r border-slate-100">
                Rooms Matrix
              </th>
              {datesList.map((d, idx) => {
                const isTodayD = isToday(d);
                const isWeekend = d.getDay() === 5 || d.getDay() === 6; // Fri / Sat
                return (
                  <th
                    key={idx}
                    className={`p-2.5 text-center text-xs font-semibold min-w-16 w-16 border-r border-slate-100 ${
                      isTodayD ? "bg-indigo-50 text-indigo-700 font-extrabold" : isWeekend ? "bg-amber-50/30 text-amber-800" : "text-slate-600"
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold tracking-tight opacity-70">{getDayName(d)}</div>
                    <div className={`mt-0.5 text-sm font-black mx-auto w-6 h-6 flex items-center justify-center rounded-full ${isTodayD ? "bg-indigo-600 text-white shadow-xs" : ""}`}>
                      {getDayNum(d)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRooms.map((room) => (
              <tr key={room.id} className="hover:bg-slate-50/40 transition-colors">
                
                {/* Room column details stuck to left */}
                <td className="sticky left-0 bg-white border-r border-slate-100 p-3.5 z-10 w-44 min-w-44 shadow-[4px_0_8px_rgba(0,0,0,0.02)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-slate-800 block">{room.name}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 mt-0.5 block">{room.type}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold border shrink-0 ${
                      room.status === "Clean" ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                      room.status === "Dirty" ? "bg-red-50 border-red-100 text-red-700" :
                      room.status === "In Progress" ? "bg-amber-50 border-amber-100 text-amber-700" :
                      "bg-slate-50 border-slate-105 text-slate-750"
                    }`}>
                      {room.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-slate-400">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span>Cap: {room.capacity}</span>
                    <span className="mx-1">•</span>
                    <span className="font-bold text-slate-600">৳{room.baseRate}</span>
                  </div>
                </td>

                {/* Date slots */}
                {datesList.map((dateObj, colIdx) => {
                  const dateStr = formatDateStr(dateObj);
                  const booking = findBookingForCell(room.id, dateStr);
                  const isCheckInDay = booking?.checkInDate === dateStr;

                  if (booking) {
                    // Span or represent visually
                    // To keep grid symmetric, we put interactive boxes
                    return (
                      <td
                        key={colIdx}
                        className="p-1 border-r border-slate-100 relative min-w-16 w-16 align-middle"
                        title={`${booking.guestName} (${booking.id})\nDates: ${booking.checkInDate} to ${booking.checkOutDate}\nStatus: ${booking.status}`}
                      >
                        <div className={`h-11 rounded-lg border flex flex-col justify-center px-1.5 text-[9px] font-bold shadow-xs overflow-hidden select-none cursor-help ${getStatusColor(booking.status)}`}>
                          {isCheckInDay ? (
                            <>
                              <p className="truncate leading-tight">{booking.guestName.split(" ")[0]}</p>
                              <p className="opacity-90 leading-tight font-mono tracking-tight">{booking.id}</p>
                            </>
                          ) : (
                            <div className="h-2 w-full bg-white/20 rounded-full" />
                          )}
                        </div>
                      </td>
                    );
                  }

                  // Empty Cell is clickable to trigger new reservation on-the-fly!
                  return (
                    <td
                      key={colIdx}
                      onClick={() => onSelectCell(room.id, dateStr)}
                      className="p-1 border-r border-slate-100 min-w-16 w-16 align-middle hover:bg-indigo-50/20 cursor-pointer group transition-colors"
                      title="Available! Click to book."
                    >
                      <div className="h-11 border border-dashed border-slate-100 hover:border-indigo-200 hover:bg-white rounded-lg flex items-center justify-center transition-all">
                        <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-indigo-500 border border-indigo-600 block" /> Confirmed Stay
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-emerald-500 border border-emerald-600 block" /> Checked In
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-slate-400 border border-slate-500 block" /> Checked Out
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-amber-400 border border-amber-500 block" /> Pending Stay
        </span>
        <span className="flex items-center gap-1.5 ml-auto text-[10px] text-slate-400">
          *Grid columns reflect days.
        </span>
      </div>

    </div>
  );
}
