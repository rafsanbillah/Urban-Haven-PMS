/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, Room, HousekeepingTask, RoomStatus, UserRole } from "../types";
import { Sparkles, Trash2, CheckCircle, RefreshCcw, Camera, AlertTriangle, User } from "lucide-react";

interface HousekeepingBoardProps {
  state: AppState;
  activeRole: UserRole;
  onUpdateTask: (data: any) => Promise<void>;
}

export default function HousekeepingBoard({ state, activeRole, onUpdateTask }: HousekeepingBoardProps) {
  const [selectedTask, setSelectedTask] = useState<HousekeepingTask | null>(null);
  const [assignedTo, setAssignedTo] = useState("");
  const [taskStatus, setTaskStatus] = useState<"Pending" | "In Progress" | "Done" | "Inspected">("Pending");
  const [notes, setNotes] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const canEdit = activeRole === UserRole.SUPER_ADMIN || activeRole === UserRole.ADMIN || activeRole === UserRole.HOUSEKEEPER;

  const handleOpenTask = (task: HousekeepingTask) => {
    setSelectedTask(task);
    setAssignedTo(task.assignedTo || "");
    setTaskStatus(task.status);
    setNotes(task.notes || "");
    setPhotoUrl(task.photoUrl || null);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      await onUpdateTask({
        taskId: selectedTask.id,
        taskStatus,
        assignedTo,
        notes,
        photoUrl,
        actor: `Staff (${activeRole})`,
        actorRole: activeRole
      });
      setSelectedTask(null);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerPhotoUpload = () => {
    setUploadingPhoto(true);
    setTimeout(() => {
      // Simulate snapshot upload of clean room
      setPhotoUrl("https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=400");
      setUploadingPhoto(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* Floor Room Visual board status */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          Live Room Status Grid
        </h3>
        <p className="text-xs text-slate-500 mt-1">Status monitors and cleanup requests of all standard and premium units.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          {state.rooms.map(room => (
            <div
              key={room.id}
              className={`p-4 rounded-xl border flex flex-col justify-between h-28 relative overflow-hidden transition-all duration-200 ${
                room.status === RoomStatus.CLEAN ? "bg-emerald-50/50 border-emerald-100 text-emerald-950" :
                room.status === RoomStatus.DIRTY ? "bg-red-50/50 border-red-100 text-red-955 animate-pulse" :
                room.status === RoomStatus.IN_PROGRESS ? "bg-amber-50/50 border-amber-100 text-amber-955" :
                room.status === RoomStatus.OUT_OF_ORDER ? "bg-slate-50 border-slate-200 text-slate-800" :
                "bg-blue-50/50 border-blue-100 text-blue-955"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-black">{room.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wide">{room.type}</p>
                </div>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                  room.status === RoomStatus.CLEAN ? "bg-emerald-600 text-white" :
                  room.status === RoomStatus.DIRTY ? "bg-red-600 text-white" :
                  room.status === RoomStatus.IN_PROGRESS ? "bg-amber-500 text-white" :
                  "bg-slate-600 text-white"
                }`}>
                  {room.status}
                </span>
              </div>

              {/* Quick operations */}
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] text-slate-450 font-semibold font-mono">Floor {room.floor}</span>
                {canEdit && room.status === RoomStatus.DIRTY && (
                  <button
                    onClick={async () => {
                      await onUpdateTask({
                        roomId: room.id,
                        roomStatus: RoomStatus.IN_PROGRESS,
                        actor: `Staff (${activeRole})`,
                        actorRole: activeRole
                      });
                    }}
                    className="text-[10px] bg-white text-amber-700 font-bold px-2 py-1 rounded-md border border-amber-200 hover:bg-amber-50 shadow-xs transition-all cursor-pointer"
                  >
                    Clean Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Housekeeping Tasks Queue */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between flex-col sm:flex-row gap-4 mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Active Turnaround Task Board
            </h3>
            <p className="text-xs text-slate-500 mt-1">Checkout cleans are generated on guest checkout automatically.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-450 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Task ID</th>
                <th className="p-4">Room</th>
                <th className="p-4">Task Type</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.housekeepingTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-400 font-medium py-8">
                    No active clean tasks currently.
                  </td>
                </tr>
              ) : (
                state.housekeepingTasks.map(task => {
                  const room = state.rooms.find(r => r.id === task.roomId);
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{task.id}</td>
                      <td className="p-4">
                        <span className="font-extrabold text-slate-800">{room?.name}</span>
                        <span className="text-[10px] text-slate-450 block">{room?.type}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-semibold">{task.type}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          task.priority === "High" ? "bg-red-50 text-red-700 border border-red-100" : "bg-slate-50 text-slate-600"
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          task.status === "Inspected" ? "bg-emerald-100 text-emerald-800" :
                          task.status === "Done" ? "bg-blue-100 text-blue-800" :
                          task.status === "In Progress" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-850"
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {task.assignedTo ? (
                          <div className="flex items-center gap-1.5 font-bold text-slate-750">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                            {task.assignedTo}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {canEdit && (
                          <button
                            onClick={() => handleOpenTask(task)}
                            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 font-bold transition-all cursor-pointer"
                          >
                            Update Task
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

      {/* Task Update Modal Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-md shadow-lg border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-slate-800">Configure Cleaning Task {selectedTask.id}</h4>
              <button onClick={() => setSelectedTask(null)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1">Assigned Clean Specialist</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-250 px-3 py-2 text-sm text-slate-800 bg-white"
                >
                  <option value="">Unassigned</option>
                  <option value="Karim Uddin">Karim Uddin (Lead Clean)</option>
                  <option value="Sultana Begum">Sultana Begum (Turnaround Specialist)</option>
                  <option value="Rahim Ali">Rahim Ali (Deep Clean Ops)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1">Turnaround Progress Status</label>
                <select
                  value={taskStatus}
                  onChange={(e: any) => setTaskStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-250 px-3 py-2 text-sm text-slate-800 bg-white"
                >
                  <option value="Pending">Pending (Not Started)</option>
                  <option value="In Progress">In Progress (Active cleaning)</option>
                  <option value="Done">Done (Awaiting Supervisor Review)</option>
                  <option value="Inspected">Inspected (Passed, Set Room Clean)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1">Condition Reports / Special Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes about minibar refills, broken items or damage reports..."
                  className="w-full rounded-lg border border-slate-250 px-3 py-2 text-sm text-slate-800 bg-white"
                />
              </div>

              {/* Photo upload Simulator */}
              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1">Room Condition Snap (Verify High-quality check)</label>
                {photoUrl ? (
                  <div className="space-y-2">
                    <img src={photoUrl} alt="Inspection proof" className="w-full h-32 object-cover rounded-lg border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(null)}
                      className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={triggerPhotoUpload}
                    disabled={uploadingPhoto}
                    className="w-full border-2 border-dashed border-slate-200 rounded-lg py-4 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-600">
                      {uploadingPhoto ? "Uploading high-res snap..." : "Upload Clean Proof Photo"}
                    </span>
                  </button>
                )}
              </div>

              {/* Warnings */}
              {taskStatus === "Inspected" && activeRole === UserRole.HOUSEKEEPER && (
                <div className="p-2.5 bg-amber-50 text-amber-800 text-[10px] rounded-lg border border-amber-100 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <p>Note: Supervisor permission is recommended to set state to Inspected.</p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 rounded-lg text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
                >
                  Save Updates
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
