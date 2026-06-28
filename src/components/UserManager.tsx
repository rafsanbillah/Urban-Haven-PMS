import React, { useState } from "react";
import { 
  UserPlus, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  User, 
  Mail, 
  Briefcase, 
  Calendar,
  X,
  Search,
  CheckCircle,
  PlusCircle,
  Clock,
  Fingerprint
} from "lucide-react";
import { AppState, UserRole, User as UserType } from "../types";
import { db } from "../lib/firebase";
import { setDoc, doc, deleteDoc } from "firebase/firestore";

interface UserManagerProps {
  state: AppState;
  activeRole: UserRole;
  onRefresh: () => Promise<void> | void;
  tenantId?: string;
}

export const UserManager: React.FC<UserManagerProps> = ({ state, activeRole, onRefresh, tenantId }) => {
  const usersList: UserType[] = state.users || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.HOUSEKEEPER);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const userId = `U-${Date.now()}`;
    const newUser: UserType = {
      id: userId,
      name: name.trim(),
      email: email.trim(),
      role,
      createdAt: new Date().toISOString(),
      tenantId: tenantId || "default"
    };

    try {
      await setDoc(doc(db, "users", userId), newUser);

      setSuccess(`Successfully added ${name} as ${role}!`);
      setName("");
      setEmail("");
      setPassword("");
      setRole(UserRole.HOUSEKEEPER);
      await onRefresh();
      
      // Keep success message visible for 3s, then close modal
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess("");
      }, 1500);

    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: UserType) => {
    if (user.role === UserRole.SUPER_ADMIN && activeRole !== UserRole.SUPER_ADMIN) {
      alert("Only Super Administrators can delete other Super Admins!");
      return;
    }

    if (!window.confirm(`Are you sure you want to remove user ${user.name} (${user.email}) from the system?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "users", user.id));
      await onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const getRoleBadgeStyle = (userRole: UserRole) => {
    switch (userRole) {
      case UserRole.SUPER_ADMIN:
        return "bg-rose-50 text-rose-700 border-rose-200/60";
      case UserRole.ADMIN:
        return "bg-indigo-50 text-indigo-700 border-indigo-200/60";
      case UserRole.AGENT:
        return "bg-teal-50 text-teal-700 border-teal-200/60";
      case UserRole.HOUSEKEEPER:
        return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
      case UserRole.MAINTENANCE:
        return "bg-amber-50 text-amber-700 border-amber-200/60";
      case UserRole.GUEST:
        return "bg-slate-100 text-slate-700 border-slate-200/60";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  // Filter list
  const filteredUsers = usersList.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesRole = roleFilter === "All" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      
      {/* Top action block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Users, Roles & Security Administration</h3>
          <p className="text-xs text-slate-400 mt-1">Manage staff user profiles, role access levels, and audit authentication records on the property.</p>
        </div>
        
        {(activeRole === UserRole.SUPER_ADMIN || activeRole === UserRole.ADMIN) && (
          <button
            onClick={() => {
              setError("");
              setSuccess("");
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Invite Staff Member
          </button>
        )}
      </div>

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, or user ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-[10px] uppercase font-bold text-slate-400">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 outline-hidden cursor-pointer"
          >
            <option value="All">All Roles</option>
            {Object.values(UserRole).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <User className="w-8 h-8 mx-auto mb-3 opacity-60 text-indigo-600" />
            <p className="text-sm font-bold text-slate-700">No users found</p>
            <p className="text-xs text-slate-400 mt-1">Try widening your search terms or clearing your role filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">User ID</th>
                  <th className="px-6 py-4">Name & Email</th>
                  <th className="px-6 py-4">Assigned Role</th>
                  <th className="px-6 py-4">Linked Profile</th>
                  <th className="px-6 py-4">Created On</th>
                  {(activeRole === UserRole.SUPER_ADMIN || activeRole === UserRole.ADMIN) && (
                    <th className="px-6 py-4 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4.5 font-mono font-bold text-indigo-600">
                      {user.id}
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800">{user.name}</p>
                        <p className="text-slate-400 font-medium text-[10px] flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" /> {user.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase rounded-lg border tracking-wider shadow-inner ${getRoleBadgeStyle(user.role)}`}>
                        {user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 font-bold text-[10px]">
                      {user.role === UserRole.HOUSEKEEPER ? (
                        <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">Housekeeper Roster</span>
                      ) : user.role === UserRole.MAINTENANCE ? (
                        <span className="text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-100">Technician Fleet</span>
                      ) : (
                        <span className="text-slate-400">Administrative Portal</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 text-slate-400 font-mono text-[10px] font-bold">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user.createdAt.split("T")[0]}</span>
                      </div>
                    </td>
                    {(activeRole === UserRole.SUPER_ADMIN || activeRole === UserRole.ADMIN) && (
                      <td className="px-6 py-4.5 text-right">
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.email === "rafsanbillah@gmail.com"}
                          className="p-2 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50/20 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                          title="Revoke User Access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider">Invite Staff Member</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5 font-sans">Send an email invitation to authorize a new user to your workspace.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{success}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Staff Full Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sultana Begum"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden font-bold"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Corporate Email Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. s.begum@urbanhaven.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden font-bold font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Password / Access Code</label>
                <div className="relative">
                  <Fingerprint className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Leave blank to default to password123"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden font-bold"
                  />
                </div>
              </div>

              {/* Role Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">PMS Permission Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden font-bold text-slate-700 cursor-pointer"
                >
                  <option value={UserRole.HOUSEKEEPER}>Housekeeper (Restricted module)</option>
                  <option value={UserRole.MAINTENANCE}>Maintenance Tech (Restricted module)</option>
                  <option value={UserRole.AGENT}>Booking Agent (Standard access)</option>
                  <option value={UserRole.ADMIN}>PMS Administrator (Elevated access)</option>
                  <option value={UserRole.SUPER_ADMIN}>Super Owner / Administrator (Full root access)</option>
                </select>
              </div>

              {/* Security Warning info */}
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[9px] text-indigo-950 font-bold leading-normal">
                  Important: Permissions corresponding to the selected role will be applied immediately. A system email will automatically dispatch instructions on secure credential registration.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-100"
                >
                  {loading ? "Adding User..." : "Authorize Access"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
