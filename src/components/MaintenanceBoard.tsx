/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, MaintenanceRequest, RoomStatus, UserRole } from "../types";
import { Wrench, AlertCircle, CheckCircle, RefreshCw, AlertTriangle, Plus, ChevronDown } from "lucide-react";

interface MaintenanceBoardProps {
  state: AppState;
  activeRole: UserRole;
  onRaiseRequest: (data: any) => Promise<void>;
  onUpdateRequest: (data: any) => Promise<void>;
}

export default function MaintenanceBoard({ state, activeRole, onRaiseRequest, onUpdateRequest }: MaintenanceBoardProps) {
  const [showRaiseForm, setShowRaiseForm] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [category, setCategory] = useState<"Plumbing" | "Electrical" | "AC" | "Furniture" | "Other">("AC");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [description, setDescription] = useState("");

  const [updatingReq, setUpdatingReq] = useState<MaintenanceRequest | null>(null);
  const [reqStatus, setReqStatus] = useState<"Open" | "In Progress" | "Resolved" | "Closed">("Open");
  const [reqNotes, setReqNotes] = useState("");

  const canEdit = activeRole === UserRole.SUPER_ADMIN || activeRole === UserRole.ADMIN || activeRole === UserRole.MAINTENANCE;

  // Auto set first room when open raise form
  React.useEffect(() => {
    if (state.rooms.length > 0 && !roomId) {
      setRoomId(state.rooms[0].id);
    }
  }, [state.rooms]);

  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;

    try {
      await onRaiseRequest({
        roomId,
        category,
        priority,
        description,
        actor: `Staff (${activeRole})`,
        actorRole: activeRole
      });
      setShowRaiseForm(false);
      setDescription("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingReq) return;

    try {
      await onUpdateRequest({
        id: updatingReq.id,
        status: reqStatus,
        notes: reqNotes,
        actor: `Staff (${activeRole})`,
        actorRole: activeRole
      });
      setUpdatingReq(null);
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200 font-extrabold";
      case "Medium":
        return "bg-amber-100 text-amber-800 border-amber-200 font-bold";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "Resolved":
        return "bg-emerald-100 text-emerald-800 font-bold";
      case "In Progress":
        return "bg-indigo-100 text-indigo-800 font-bold animate-pulse";
      case "Closed":
        return "bg-slate-100 text-slate-500";
      default:
        return "bg-red-100 text-red-800";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Overview stats & action triggers */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-600" />
            Operations Maintenance Center
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Logging issues locks rooms as Out of Order if set to High Priority automatically.
          </p>
        </div>
        
        {canEdit && (
          <button
            onClick={() => setShowRaiseForm(true)}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Raise Request
          </button>
        )}
      </div>

      {/* Grid of issues */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Unresolved & Closed Operations Issues</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50/20 border-b border-slate-100 text-slate-450 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">ID</th>
                <th className="p-4">Room ID</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.maintenanceRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-400 py-10">
                    No active maintenance tickets logged.
                  </td>
                </tr>
              ) : (
                state.maintenanceRequests.map(req => {
                  const room = state.rooms.find(r => r.id === req.roomId);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{req.id}</td>
                      <td className="p-4">
                        <span className="font-extrabold text-slate-805">{room?.name}</span>
                        <span className="text-[10px] text-slate-400 block">{room?.type}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-800 font-semibold">{req.category}</span>
                      </td>
                      <td className="p-4 max-w-xs truncate font-medium text-slate-700" title={req.description}>
                        {req.description}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] border ${getPriorityBadge(req.priority)}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono">
                        {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" })}
                      </td>
                      <td className="p-4 text-right">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setUpdatingReq(req);
                              setReqStatus(req.status);
                              setReqNotes(req.notes || "");
                            }}
                            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 font-bold transition-all cursor-pointer"
                          >
                            Update Ticket
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raise Request Modal */}
      {showRaiseForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-md shadow-lg border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                Raise Maintenance Ticket
              </h4>
              <button onClick={() => setShowRaiseForm(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleRaiseSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Room Unit</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white cursor-pointer"
                >
                  {state.rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name} - {r.type}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="AC">Air Conditioner</option>
                    <option value="Plumbing">Plumbing/Water</option>
                    <option value="Electrical">Electrical/Lights</option>
                    <option value="Furniture">Furniture/Doors</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Severity / Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="Low">Low (No immediate impact)</option>
                    <option value="Medium">Medium (Affects guest comfort)</option>
                    <option value="High">High (Forces Room Out Of Order)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Issue Description *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="AC not powering on, light flickering, door lock jammed..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white"
                />
              </div>

              {priority === "High" && (
                <div className="p-3 bg-red-50 text-red-800 text-[10px] rounded-lg border border-red-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">High Priority Rule Enforcement</p>
                    <p className="mt-0.5">Submitting a High severity ticket automatically disables room bookings and sets room state to Out Of Order.</p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRaiseForm(false)}
                  className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 rounded-lg text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
                >
                  Create Ticket
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Update Request Modal */}
      {updatingReq && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-md shadow-lg border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-slate-800">Resolve Ticket {updatingReq.id}</h4>
              <button onClick={() => setUpdatingReq(null)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
              
              <div>
                <p className="text-xs text-slate-500 font-bold font-mono">Logged Description:</p>
                <p className="p-3 bg-slate-50 rounded-lg text-xs text-slate-705 mt-1 italic border border-slate-100">
                  {updatingReq.description}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Set Resolution Status</label>
                <select
                  value={reqStatus}
                  onChange={(e: any) => setReqStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white cursor-pointer"
                >
                  <option value="Open">Open (Reported)</option>
                  <option value="In Progress">In Progress (Repair underway)</option>
                  <option value="Resolved">Resolved (Room cleared for guest stay)</option>
                  <option value="Closed">Closed (Completed and Audited)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Resolution Work Log Notes</label>
                <textarea
                  rows={2}
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="Describe repair done, replacement parts purchased, etc."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-805 bg-white"
                />
              </div>

              {(reqStatus === "Resolved" || reqStatus === "Closed") && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 text-[10px] rounded-lg border border-emerald-100 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p>Resolving this ticket automatically clears any Out Of Order room block!</p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUpdatingReq(null)}
                  className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 rounded-lg text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
                >
                  Confirm Resolution
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
