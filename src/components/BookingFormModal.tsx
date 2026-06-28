/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppState, Booking, BookingType, Room, RoomStatus, UserRole } from "../types";
import { X, Calendar, DollarSign, User, AlertTriangle, CheckCircle, Calculator } from "lucide-react";

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onSubmit: (formData: any) => Promise<void>;
  prefilledRoomId?: string;
  prefilledStartDate?: string;
  prefilledEndDate?: string;
  activeRole: UserRole;
}

export default function BookingFormModal({
  isOpen,
  onClose,
  state,
  onSubmit,
  prefilledRoomId,
  prefilledStartDate,
  prefilledEndDate,
  activeRole
}: BookingFormModalProps) {
  const [roomId, setRoomId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [bookingType, setBookingType] = useState<BookingType>(BookingType.DAILY);
  const [hoursCount, setHoursCount] = useState<number>(3);
  const [notes, setNotes] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank Transfer" | "Mobile Banking" | "Card">("Cash");
  const [source, setSource] = useState<"Walk-In" | "Website" | "Airbnb" | "Booking.com" | "Agent">("Walk-In");

  // Lookup suggest state
  const [suggestedGuests, setSuggestedGuests] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto set defaults on open/prefill
  useEffect(() => {
    if (isOpen) {
      setRoomId(prefilledRoomId || (state.rooms[0]?.id || ""));
      setCheckInDate(prefilledStartDate || new Date().toISOString().split("T")[0]);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      setCheckOutDate(prefilledEndDate || tomorrowStr);
      
      setGuestName("");
      setGuestPhone("");
      setGuestEmail("");
      setNotes("");
      setPaidAmount("");
      setErrorMsg("");
      setSuccessMsg("");
      setBookingType(BookingType.DAILY);
      setSource(activeRole === UserRole.GUEST ? "Website" : "Walk-In");
    }
  }, [isOpen, prefilledRoomId, prefilledStartDate, prefilledEndDate]);

  // Guest lookup inline as user types
  const handlePhoneChange = (val: string) => {
    setGuestPhone(val);
    if (val.length > 3) {
      const filtered = state.guests.filter(
        g => g.phone.includes(val) || g.name.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestedGuests(filtered);
    } else {
      setSuggestedGuests([]);
    }
  };

  const selectSuggestedGuest = (g: any) => {
    setGuestName(g.name);
    setGuestPhone(g.phone);
    setGuestEmail(g.email);
    setSuggestedGuests([]);
  };

  // Live Conflict and validation calculation
  const getConflictWarning = () => {
    if (!roomId || !checkInDate || !checkOutDate) return null;
    
    // Validate checkout after checkin
    if (checkInDate >= checkOutDate) {
      return "Checkout date must be later than checkin date.";
    }

    const room = state.rooms.find(r => r.id === roomId);
    if (room?.status === RoomStatus.OUT_OF_ORDER && bookingType !== BookingType.BLOCK) {
      return "Warning: This room is currently Out of Order for maintenance. Stays are blocked.";
    }

    if (!room) return null;

    // Build locked/clashing unit ids
    const lockedUnitIds = new Set<string>([roomId]);
    if (room.parentId) {
      lockedUnitIds.add(room.parentId);
    }
    if (room.isApartment) {
      state.rooms.forEach(r => {
        if (r.parentId === room.id) {
          lockedUnitIds.add(r.id);
        }
      });
    }

    const hasConflict = state.bookings.some(b => {
      if (!lockedUnitIds.has(b.roomId)) return false;
      if (b.status === "CANCELLED" || b.status === "REJECTED") return false;
      return (checkInDate < b.checkOutDate) && (checkOutDate > b.checkInDate);
    });

    if (hasConflict) {
      return "Booking clash! This unit or one of its connected rooms/apartments is already occupied during these dates.";
    }

    return null;
  };

  const getEstimatedPrice = () => {
    if (!roomId || !checkInDate || !checkOutDate) return 0;
    const room = state.rooms.find(r => r.id === roomId);
    if (!room) return 0;

    if (bookingType === BookingType.BLOCK) return 0;
    
    let base = 0;
    if (bookingType === BookingType.HOURLY) {
      base = room.hourlyRate * hoursCount;
    } else {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return 0;

      const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      
      let currentDate = new Date(start);
      for (let i = 0; i < nights; i++) {
        const day = currentDate.getDay();
        const isWeekend = day === 5 || day === 6; // Fri/Sat
        base += isWeekend ? room.weekendRate : room.baseRate;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    const taxFactor = 1 + (state.settings.taxRate / 100);
    return Math.round(base * taxFactor * 100) / 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!guestName || !guestPhone) {
      setErrorMsg("Please provide guest name and phone number.");
      return;
    }

    const conflict = getConflictWarning();
    if (conflict && bookingType !== BookingType.BLOCK) {
      setErrorMsg(conflict);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        roomId,
        guestName,
        guestPhone,
        guestEmail,
        checkInDate,
        checkOutDate,
        type: bookingType,
        notes,
        paidAmount: paidAmount ? parseFloat(paidAmount) : 0,
        method: paymentMethod,
        source,
        hoursCount,
        actor: activeRole === UserRole.GUEST ? "Guest Portal" : `Staff (${activeRole})`,
        actorRole: activeRole
      });
      setSuccessMsg("Reservation created successfully!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const warning = getConflictWarning();
  const estimatedCost = getEstimatedPrice();
  const room = state.rooms.find(r => r.id === roomId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {activeRole === UserRole.GUEST ? "Instant Booking Portal" : "New Reservation Form"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Real-time availability conflict resolution & rate auditing</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <p>{successMsg}</p>
            </div>
          )}

          {/* Grid fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Room selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Select Room</label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {state.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} - {r.type} (৳{r.baseRate}/night, Cap: {r.capacity})
                  </option>
                ))}
              </select>
            </div>

            {/* Booking type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Booking Interval</label>
              <select
                value={bookingType}
                onChange={(e) => setBookingType(e.target.value as BookingType)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={BookingType.DAILY}>Daily Stay (Overnight)</option>
                <option value={BookingType.HOURLY}>Hourly Stay (3h Block)</option>
                {activeRole !== UserRole.GUEST && (
                  <option value={BookingType.BLOCK}>Maintenance Block (No Revenue)</option>
                )}
              </select>
            </div>

            {/* Dates */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Check-In Date</label>
              <input
                type="date"
                required
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Check-Out Date</label>
              <input
                type="date"
                required
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Hours selection for hourly bookings */}
          {bookingType === BookingType.HOURLY && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-semibold text-gray-750 uppercase tracking-wider mb-2">Hourly Stay Duration</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={hoursCount}
                  onChange={(e) => setHoursCount(Math.max(1, Number(e.target.value)))}
                  className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
                <span className="font-mono font-bold text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg shrink-0">
                  {hoursCount} Hours Block
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">Drag the slider to adjust the duration of this hourly stay.</p>
            </div>
          )}

          {/* Stay Duration System breakdown */}
          {roomId && checkInDate && checkOutDate && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px] text-slate-500 mb-1">Stay Duration System</p>
              <div className="flex justify-between">
                <span>Check-In Date:</span>
                <span className="font-semibold text-slate-900">{checkInDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-Out Date:</span>
                <span className="font-semibold text-slate-900">{checkOutDate}</span>
              </div>
              <div className="flex justify-between border-t border-slate-250 pt-1.5 mt-1.5">
                <span>Stay Duration:</span>
                <span className="font-extrabold text-indigo-600">
                  {bookingType === BookingType.HOURLY ? `${hoursCount} Hours Block` : `${Math.max(1, Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)))} Nights / Days`}
                </span>
              </div>
            </div>
          )}

          {/* Conflict Display bar */}
          {warning && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">Reservation Alert</p>
                <p className="mt-0.5">{warning}</p>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 my-4" />

          {/* Guest Profile Details */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Guest Profile Credentials</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Phone lookup trigger */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., +880 1711..."
                  value={guestPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />

                {/* Suggest autocomplete dropdown */}
                {suggestedGuests.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto z-50 divide-y divide-gray-100">
                    {suggestedGuests.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => selectSuggestedGuest(g)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 text-xs transition-colors duration-150 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-gray-800">{g.name}</p>
                          <p className="text-gray-500 text-[10px]">{g.phone}</p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{g.tag}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Guest Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 my-4" />

          {/* Payment Handling (Only show for Staff Booking or Booking Creator) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Payment Source</label>
              <select
                value={source}
                onChange={(e: any) => setSource(e.target.value)}
                disabled={activeRole === UserRole.GUEST}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50"
              >
                <option value="Walk-In">Walk-In</option>
                <option value="Website">Guest Portal</option>
                <option value="Airbnb">Airbnb Sync</option>
                <option value="Booking.com">Booking.com</option>
                <option value="Agent">External Booking Agent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Collect Amount (৳)</label>
              <input
                type="number"
                placeholder="Leave blank for ৳0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Banking">bKash/Nagad Mobile</option>
                <option value="Card">Stripe Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Internal/Special Requests Notes</label>
            <textarea
              rows={2}
              placeholder="E.g., early check-in, dietary constraints, airport shuttle requirement..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Instant Audit Calculator Invoice bar */}
          {estimatedCost > 0 && (
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-indigo-600 rounded-xl text-white">
                  <Calculator className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider leading-3">Aesthetic Rate Auditor</p>
                  <p className="text-sm font-bold text-indigo-950 mt-1">Total Stay Cost: <span className="text-lg font-extrabold text-indigo-600">৳{estimatedCost}</span></p>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>Base Rate: ৳{bookingType === BookingType.HOURLY ? room?.hourlyRate + "/hr" : room?.baseRate + "/night"}</p>
                <p>Tax Inclusive ({state.settings.taxRate}%)</p>
              </div>
            </div>
          )}

          {/* Footer controls */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50 -mx-6 -mb-6 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl shadow-md hover:bg-indigo-700 focus:outline-hidden disabled:bg-indigo-300 transition-all cursor-pointer"
            >
              {isSubmitting ? "Processing..." : activeRole === UserRole.GUEST ? "Book Instantly with Stripe" : "Confirm Booking"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
