/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, Booking, BookingStatus, Room, RoomStatus, UserRole } from "../types";
import { Shield, Sparkles, TrendingUp, Key, LogOut, DollarSign, Brain, Users, ClipboardCheck, Play, Download, BarChart2 } from "lucide-react";
import AvailabilitySearchAndHourlyChart from "./AvailabilitySearchAndHourlyChart";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface DashboardOverviewProps {
  state: AppState;
  activeRole: UserRole;
  onCheckIn: (bookingId: string) => Promise<void>;
  onCheckOut: (bookingId: string, lateFee: number, notes: string) => Promise<void>;
  onTriggerAIInsights: () => Promise<string>;
  onBookRoom: (roomId: string, checkInDate: string, checkOutDate: string) => void;
}

export default function DashboardOverview({
  state,
  activeRole,
  onCheckIn,
  onCheckOut,
  onTriggerAIInsights,
  onBookRoom
}: DashboardOverviewProps) {
  const [aiInsights, setAiInsights] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  // Late checkout modal state
  const [checkoutTarget, setCheckoutTarget] = useState<Booking | null>(null);
  const [lateFee, setLateFee] = useState("0");
  const [checkoutNotes, setCheckoutNotes] = useState("");

  const handleFetchAI = async () => {
    setLoadingAI(true);
    setAiInsights("");
    try {
      const insights = await onTriggerAIInsights();
      setAiInsights(insights);
    } catch (err) {
      console.error(err);
      setAiInsights("Failed to load recommendations.");
    } finally {
      setLoadingAI(false);
    }
  };

  // KPI Calculations
  const roomCount = state.rooms.length;
  const activeStays = state.bookings.filter(b => b.status === BookingStatus.CHECKED_IN);
  const occupancyRate = roomCount > 0 ? Math.round((activeStays.length / roomCount) * 100) : 0;

  const todayStr = "2026-06-24"; // consistent simulation today date
  const arrivalsToday = state.bookings.filter(b => b.checkInDate === todayStr && b.status === BookingStatus.CONFIRMED);
  const departuresToday = state.bookings.filter(b => b.checkOutDate === todayStr && b.status === BookingStatus.CHECKED_IN);

  // Calculate outstanding balance across all bookings
  const outstandingBalance = state.bookings.reduce((sum, b) => {
    if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED) return sum;
    return sum + Math.max(0, b.totalAmount - b.paidAmount);
  }, 0);

  const canManageCheckInOut = activeRole === UserRole.SUPER_ADMIN || activeRole === UserRole.ADMIN || activeRole === UserRole.AGENT;

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CHECKED_IN:
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case BookingStatus.CONFIRMED:
        return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case BookingStatus.CHECKED_OUT:
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const handleExportCSV = () => {
    const headers = ["Booking ID", "Guest Name", "Room", "Check-in", "Check-out", "Status", "Total Amount"];
    const rows = state.bookings.map(b => {
      const room = state.rooms.find(r => r.id === b.roomId);
      return [
        b.id,
        `"${b.guestName}"`,
        `"${room?.name || b.roomId}"`,
        b.checkInDate,
        b.checkOutDate,
        b.status,
        b.totalAmount
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bookings_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Urban Haven - Bookings Export", 14, 15);
    
    const tableData = state.bookings.map(b => {
      const room = state.rooms.find(r => r.id === b.roomId);
      return [
        b.id.substring(0, 8),
        b.guestName,
        room?.name || b.roomId,
        b.checkInDate,
        b.checkOutDate,
        b.status,
        `$${b.totalAmount}`
      ];
    });

    autoTable(doc, {
      startY: 20,
      head: [["ID", "Guest", "Room", "In", "Out", "Status", "Total"]],
      body: tableData,
    });

    doc.save("bookings_export.pdf");
  };

  // Generate mock revenue data for the chart based on active bookings and past bookings
  const revenueData = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 2000 },
    { name: 'Apr', revenue: 2780 },
    { name: 'May', revenue: 1890 },
    { name: 'Jun', revenue: state.bookings.reduce((sum, b) => b.status !== BookingStatus.CANCELLED && b.status !== BookingStatus.REJECTED ? sum + b.totalAmount : sum, 0) },
  ];

  const housekeepingData = [
    { name: 'Mon', completed: 5, pending: 2 },
    { name: 'Tue', completed: 7, pending: 1 },
    { name: 'Wed', completed: 4, pending: 3 },
    { name: 'Thu', completed: 8, pending: 0 },
    { name: 'Fri', completed: 6, pending: 2 },
    { name: 'Sat', completed: 10, pending: 1 },
    { name: 'Sun', completed: 9, pending: 2 },
  ];

  return (
    <div className="space-y-6">
      
      {/* Dynamic Key Performance Indicator Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Occupancy */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Live Occupancy Rate</p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-black text-slate-800">{occupancyRate}%</h3>
              <span className="text-emerald-600 text-xs font-semibold mb-1 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Healthy
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${occupancyRate}%` }}></div>
          </div>
        </div>

        {/* KPI 2: Arrivals */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Arrivals Expected Today</p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-black text-slate-800">{arrivalsToday.length}</h3>
              <span className="text-indigo-600 text-xs font-semibold mb-1 uppercase tracking-wider">June 24</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${roomCount > 0 ? (arrivalsToday.length / roomCount) * 100 : 0}%` }}></div>
          </div>
        </div>

        {/* KPI 3: Departures */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Departures Slated Today</p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-black text-slate-800">{departuresToday.length}</h3>
              <span className="text-amber-600 text-xs font-semibold mb-1">Housekeeping Queue</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${roomCount > 0 ? (departuresToday.length / roomCount) * 100 : 0}%` }}></div>
          </div>
        </div>

        {/* KPI 4: Pending payments */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Outstanding Receivable</p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-black text-slate-800">৳{outstandingBalance}</h3>
              <span className="text-rose-600 text-xs font-semibold mb-1">Taxes Incl.</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: outstandingBalance > 0 ? "75%" : "0%" }}></div>
          </div>
        </div>

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            Revenue Trajectory (YTD)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`$${value}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Housekeeping Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Housekeeping Efficiency
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={housekeepingData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="completed" name="Completed Tasks" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending Tasks" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Unit Availability Search & Hourly Visualizer Scheduling grid */}
      <AvailabilitySearchAndHourlyChart state={state} onBookRoom={onBookRoom} />

      {/* Main Grid: Left Arrivals/Departures, Right AI recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Active Checkin / Checkout Operational queues */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                Check-In & Check-Out Desk
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Select key operations below. Checking out auto-flags room Dirty & spawns Housekeeper Clean tickets.
              </p>
            </div>
            
            {/* Export Action Buttons */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> CSV Export
              </button>
              <button 
                onClick={handleExportPDF}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> PDF Export
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {state.bookings.filter(b => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.CHECKED_IN).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10 font-bold">No active arrivals or stays currently.</p>
            ) : (
              state.bookings
                .filter(b => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.CHECKED_IN)
                .map(b => {
                  const room = state.rooms.find(r => r.id === b.roomId);
                  const isCheckedIn = b.status === BookingStatus.CHECKED_IN;
                  return (
                    <div key={b.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 first:pt-0">
                      <div>
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          {b.guestName}
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${getStatusColor(b.status)}`}>
                            {b.status}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Booking ID: <span className="font-mono font-bold">{b.id}</span> • Room <span className="font-bold text-indigo-600">{room?.name}</span> • Dates: {b.checkInDate} to {b.checkOutDate}
                        </p>
                      </div>

                      {/* Operations buttons */}
                      {canManageCheckInOut && (
                        <div className="flex items-center gap-2">
                          {!isCheckedIn ? (
                            <button
                              onClick={() => onCheckIn(b.id)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Key className="w-3.5 h-3.5" /> Check In
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setCheckoutTarget(b);
                                setLateFee("0");
                                setCheckoutNotes("");
                              }}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                            >
                              <LogOut className="w-3.5 h-3.5" /> Check Out
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Right: AI Assistant Dynamic Pricing Recommendation Panel */}
        <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
              Urban Haven AI Assistant
            </h3>
            <p className="text-xs text-slate-450 mt-1.5">
              Audits room occupancy metrics & leverages Gemini models for dynamic weekend surcharge recommendations.
            </p>

            {/* AI Response Display box */}
            <div className="mt-4 bg-slate-950 rounded-xl p-4 border border-slate-800 min-h-48 text-[11px] text-slate-300 font-medium leading-relaxed overflow-y-auto">
              {aiInsights ? (
                <div className="space-y-2">
                  <div className="prose prose-invert prose-xs">
                    {aiInsights.split("\n").map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-550 italic text-center py-12">
                  Click 'Generate Recommendations' below to trigger server-side Gemini analysis.
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleFetchAI}
            disabled={loadingAI}
            className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loadingAI ? "Consulting Gemini..." : "Generate AI Insights"}
          </button>
        </div>

      </div>

      {/* Late Checkout Details Modal */}
      {checkoutTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-md shadow-lg border border-slate-100 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-slate-800">Checkout Bill: {checkoutTarget.guestName}</h4>
              <button onClick={() => setCheckoutTarget(null)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onCheckOut(checkoutTarget.id, parseFloat(lateFee || "0"), checkoutNotes);
                setCheckoutTarget(null);
              }}
              className="p-6 space-y-4"
            >
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs space-y-2 text-indigo-950">
                <div className="flex justify-between">
                  <span>Room Charge:</span>
                  <span className="font-bold">৳{checkoutTarget.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span className="font-bold text-emerald-700">৳{checkoutTarget.paidAmount}</span>
                </div>
                <div className="flex justify-between border-t border-indigo-200 pt-2 font-black">
                  <span>Pending Balance:</span>
                  <span className="text-indigo-600">৳{Math.max(0, checkoutTarget.totalAmount - checkoutTarget.paidAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Add Late Checkout Surcharge (৳)</label>
                <input
                  type="number"
                  value={lateFee}
                  onChange={(e) => setLateFee(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Housekeeping Instructions / Damage Logs</label>
                <textarea
                  rows={2}
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  placeholder="AC controller left on bedside, request deep floor sweep..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheckoutTarget(null)}
                  className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg text-slate-650 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Finalize Checkout
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
