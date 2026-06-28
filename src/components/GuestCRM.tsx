/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, GuestProfile, UserRole } from "../types";
import { Users, Search, Mail, Phone, Calendar, DollarSign, Award, AlertOctagon, FileText, MessageCircle, Link2 } from "lucide-react";
import jsPDF from "jspdf";

interface GuestCRMProps {
  state: AppState;
  activeRole: UserRole;
  onUpdateGuest: (updated: GuestProfile) => void;
}

export default function GuestCRM({ state, activeRole, onUpdateGuest }: GuestCRMProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null);

  // Search filter
  const filteredGuests = state.guests.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.phone.includes(searchTerm) ||
    g.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGuestTagColor = (tag: string) => {
    switch (tag) {
      case "VIP":
        return "bg-amber-100 text-amber-800 border-amber-200 font-extrabold";
      case "Blacklisted":
        return "bg-red-100 text-red-800 border-red-200 font-black animate-pulse";
      case "Corporate":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getGuestStays = (guestId: string) => {
    return state.bookings.filter(b => b.guestId === guestId);
  };

  const calculateSpend = (guestId: string) => {
    const guestBookings = getGuestStays(guestId);
    return guestBookings.reduce((sum, b) => sum + b.paidAmount, 0);
  };

  const handleGeneratePDF = (guest: GuestProfile) => {
    const doc = new jsPDF();
    doc.text(`Guest Confirmation Profile: ${guest.name}`, 14, 20);
    doc.text(`Phone: ${guest.phone}`, 14, 30);
    doc.text(`Email: ${guest.email}`, 14, 40);
    doc.text(`Nationality: ${guest.nationality}`, 14, 50);
    doc.text(`ID Reference: ${guest.idNumber || "N/A"}`, 14, 60);
    doc.text(`Status Tag: ${guest.tag}`, 14, 70);
    doc.text(`Total Stays: ${getGuestStays(guest.id).length}`, 14, 80);
    doc.text(`Total Spend: $${calculateSpend(guest.id)}`, 14, 90);
    doc.save(`Guest_Profile_${guest.name.replace(/\s+/g, "_")}.pdf`);
  };

  const handleWhatsApp = (guest: GuestProfile) => {
    const message = `Hello ${guest.name}, this is Urban Haven. We are looking forward to your upcoming stay!`;
    const phone = guest.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCopyCheckInLink = (guest: GuestProfile) => {
    // Generate a mock unique checkin portal link
    const link = `${window.location.origin}/checkin/${guest.id}-${Date.now().toString().slice(-4)}`;
    navigator.clipboard.writeText(link);
    alert(`Interactive Check-In Portal Link copied to clipboard:\n${link}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Search Directory column */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Urban Haven Guest CRM
          </h3>
          <p className="text-xs text-slate-500 mt-1">Review historic records, booking volume, spend, and guest status tags.</p>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search guests by name, phone number, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
          />
        </div>

        {/* List of profiles */}
        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
          {filteredGuests.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No matching guests found.</p>
          ) : (
            filteredGuests.map(guest => {
              const stays = getGuestStays(guest.id);
              const totalSpend = calculateSpend(guest.id);
              return (
                <div
                  key={guest.id}
                  onClick={() => setSelectedGuest(guest)}
                  className={`p-3 rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors duration-150 cursor-pointer border-2 ${
                    selectedGuest?.id === guest.id ? "bg-indigo-50/40 border-indigo-100" : "border-transparent"
                  }`}
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      {guest.name}
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border ${getGuestTagColor(guest.tag)}`}>
                        {guest.tag}
                      </span>
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {guest.phone}</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {guest.email}</span>
                    </div>
                  </div>

                  {/* Quick summary numbers */}
                  <div className="text-right text-[10px] text-slate-400 shrink-0">
                    <p className="font-extrabold text-slate-600">{stays.length} Stays</p>
                    <p className="font-mono text-indigo-600 font-bold mt-0.5">৳{totalSpend} Spend</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Guest Detail Pane Column */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        {selectedGuest ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="border-b border-slate-105 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-indigo-600 font-bold tracking-wider uppercase font-mono">Guest Information Card</p>
                  <h4 className="text-base font-extrabold text-slate-800 mt-1">{selectedGuest.name}</h4>
                  <p className="text-[10px] text-slate-450 font-semibold mt-0.5 font-mono">ID Ref: {selectedGuest.id}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleWhatsApp(selectedGuest)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors" title="Send WhatsApp Confirmation">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleGeneratePDF(selectedGuest)} className="p-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors" title="Export PDF Record">
                    <FileText className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleCopyCheckInLink(selectedGuest)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors" title="Copy Guest Check-in Portal Link">
                    <Link2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold">Nationality</span>
                <span className="font-bold text-slate-800">{selectedGuest.nationality}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold">National ID/Passport</span>
                <span className="font-mono font-bold text-slate-800">{selectedGuest.idNumber || "Not on file"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-1">Billing Address</span>
                <span className="text-slate-700 font-medium">{selectedGuest.address || "No billing address logged"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-1">Staff Administrative Notes</span>
                <p className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-700 italic">
                  {selectedGuest.notes || "No special instructions logged."}
                </p>
              </div>
            </div>

            {/* Loyalty KPI Boxes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                <Award className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Bookings Volume</p>
                <p className="text-base font-extrabold text-indigo-950 mt-1">{getGuestStays(selectedGuest.id).length} stays</p>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-center">
                <DollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Total Revenue</p>
                <p className="text-base font-extrabold text-emerald-950 mt-1">৳{calculateSpend(selectedGuest.id)}</p>
              </div>
            </div>

            {/* Blacklist flag toggle */}
            {(activeRole === UserRole.SUPER_ADMIN || activeRole === UserRole.ADMIN) && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Blacklist Credentials</p>
                    <p className="text-[10px] text-slate-400 font-mono">Restricts public self-bookings</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...selectedGuest,
                      tag: selectedGuest.tag === "Blacklisted" ? ("Regular" as const) : ("Blacklisted" as const)
                    };
                    setSelectedGuest(updated);
                    onUpdateGuest(updated);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold border cursor-pointer transition-all ${
                    selectedGuest.tag === "Blacklisted"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                  }`}
                >
                  {selectedGuest.tag === "Blacklisted" ? "Whitelist Guest" : "Flag Blacklist"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400 flex flex-col items-center justify-center animate-pulse">
            <Users className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-650">Select a guest from the directory</p>
            <p className="text-[10px] text-slate-400 max-w-xs mt-1">
              Select a guest card to view stays, total revenue contribution, passport scans, and modify tags.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
