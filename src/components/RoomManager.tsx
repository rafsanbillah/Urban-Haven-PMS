import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Layers, 
  Users, 
  DollarSign, 
  Sparkles, 
  Image as ImageIcon, 
  HelpCircle,
  Wifi, 
  Tv, 
  Wind, 
  Flame, 
  Coffee, 
  LogOut, 
  Compass, 
  UtensilsCrossed, 
  Check, 
  Info,
  X,
  PlusCircle,
  FolderMinus
} from "lucide-react";
import { AppState, Room, RoomCategory, RoomStatus, UserRole } from "../types";
import { db } from "../lib/firebase";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

interface RoomManagerProps {
  state: AppState;
  activeRole: UserRole;
  onRefresh: () => Promise<void> | void;
  tenantId?: string;
}

const AVAILABLE_AMENITIES = [
  "WiFi", "TV", "AC", "Minibar", "Balcony", "Espresso Machine", "Terrace", "Jacuzzi", "Kitchenette", "Attached Bath"
];

const PRESET_IMAGES: Record<RoomCategory, string[]> = {
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

export const RoomManager: React.FC<RoomManagerProps> = ({ state, activeRole, onRefresh, tenantId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  
  // Form State
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomCategory>(RoomCategory.STANDARD);
  const [floor, setFloor] = useState(1);
  const [capacity, setCapacity] = useState(2);
  const [baseRate, setBaseRate] = useState(60);
  const [weekendRate, setWeekendRate] = useState(75);
  const [hourlyRate, setHourlyRate] = useState(15);
  const [description, setDescription] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [imagesText, setImagesText] = useState("");
  const [airbnbImportUrl, setAirbnbImportUrl] = useState("");
  const [parentId, setParentId] = useState("");
  const [linkedRoomIds, setLinkedRoomIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setId("");
    setName("");
    setType(RoomCategory.STANDARD);
    setFloor(1);
    setCapacity(2);
    setBaseRate(60);
    setWeekendRate(75);
    setHourlyRate(15);
    setDescription("");
    setSelectedAmenities([]);
    setImagesText("");
    setAirbnbImportUrl("");
    setParentId("");
    setLinkedRoomIds([]);
    setError("");
  };

  const openAddModal = () => {
    resetForm();
    setEditingRoom(null);
    setIsModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setId(room.id);
    setName(room.name);
    setType(room.type);
    setFloor(room.floor);
    setCapacity(room.capacity);
    setBaseRate(room.baseRate);
    setWeekendRate(room.weekendRate);
    setHourlyRate(room.hourlyRate);
    setDescription(room.description);
    setSelectedAmenities(room.amenities);
    setImagesText((room.images || []).join(", "));
    setAirbnbImportUrl(room.airbnbImportUrl || "");
    setParentId(room.parentId || "");
    const children = state.rooms.filter(r => r.parentId === room.id).map(r => r.id);
    setLinkedRoomIds(children);
    setError("");
    setIsModalOpen(true);
  };

  const handleToggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(prev => prev.filter(a => a !== amenity));
    } else {
      setSelectedAmenities(prev => [...prev, amenity]);
    }
  };

  const handleAutoFillPresets = () => {
    const presets = PRESET_IMAGES[type] || PRESET_IMAGES[RoomCategory.STANDARD];
    setImagesText(presets.join(", "));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim()) {
      setError("Room ID/Number is required.");
      return;
    }

    setLoading(true);
    setError("");

    const imagesArray = imagesText
      .split(",")
      .map(url => url.trim())
      .filter(url => url.length > 0);

    const payload = {
      id: id.trim(),
      name: name.trim() || `Room ${id.trim()}`,
      type,
      floor: Number(floor),
      capacity: Number(capacity),
      description: description.trim(),
      amenities: selectedAmenities,
      baseRate: Number(baseRate),
      weekendRate: Number(weekendRate),
      hourlyRate: Number(hourlyRate),
      images: imagesArray,
      airbnbImportUrl: airbnbImportUrl.trim(),
      isApartment: type === RoomCategory.APARTMENT,
      parentId: type === RoomCategory.APARTMENT ? "" : (parentId || undefined),
      actor: `Staff (${activeRole})`,
      actorRole: activeRole,
      tenantId: editingRoom?.tenantId || tenantId || "default" // we will need to pass the tenantId
    };

    try {
      const roomRef = doc(db, "rooms", payload.id);
      
      if (editingRoom) {
        await updateDoc(roomRef, payload);
      } else {
        await setDoc(roomRef, {
          ...payload,
          status: RoomStatus.AVAILABLE // default status
        });
      }

      // Sync sub-rooms parentId links if this is an Apartment
      if (type === RoomCategory.APARTMENT) {
        const apartmentId = id.trim();
        const previouslyLinked = state.rooms.filter(r => r.parentId === apartmentId);
        const previouslyLinkedIds = previouslyLinked.map(r => r.id);

        const toLink = linkedRoomIds.filter(rid => !previouslyLinkedIds.includes(rid));
        const toUnlink = previouslyLinkedIds.filter(rid => !linkedRoomIds.includes(rid));

        await Promise.all([
          ...toLink.map(async rid => {
            const roomToUpdate = state.rooms.find(r => r.id === rid);
            if (roomToUpdate) {
              await updateDoc(doc(db, "rooms", rid), { parentId: apartmentId });
            }
          }),
          ...toUnlink.map(async rid => {
            const roomToUpdate = state.rooms.find(r => r.id === rid);
            if (roomToUpdate) {
              await updateDoc(doc(db, "rooms", rid), { parentId: "" });
            }
          })
        ]);
      }

      await onRefresh();
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete Room ${roomId}? This will cancel all bookings and housekeeping tasks for this unit.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "rooms", roomId));

      await onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const getCategoryBadgeColor = (cat: RoomCategory) => {
    switch (cat) {
      case RoomCategory.SUITE: return "bg-purple-100 text-purple-800 border-purple-200";
      case RoomCategory.EXECUTIVE: return "bg-blue-100 text-blue-800 border-blue-200";
      case RoomCategory.STUDIO: return "bg-amber-100 text-amber-800 border-amber-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getAmenityIcon = (name: string) => {
    const norm = name.toLowerCase();
    if (norm.includes("wifi")) return <Wifi className="w-3.5 h-3.5 text-blue-600" />;
    if (norm.includes("tv")) return <Tv className="w-3.5 h-3.5 text-red-500" />;
    if (norm.includes("ac")) return <Wind className="w-3.5 h-3.5 text-teal-500" />;
    if (norm.includes("jacuzzi")) return <Flame className="w-3.5 h-3.5 text-pink-500" />;
    if (norm.includes("espresso")) return <Coffee className="w-3.5 h-3.5 text-amber-700" />;
    if (norm.includes("balcony")) return <Compass className="w-3.5 h-3.5 text-emerald-600" />;
    if (norm.includes("kitchenette")) return <UtensilsCrossed className="w-3.5 h-3.5 text-orange-500" />;
    return <Sparkles className="w-3.5 h-3.5 text-indigo-500" />;
  };

  return (
    <div className="space-y-6">
      
      {/* Top action block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Catalog & Unit Administration</h3>
          <p className="text-xs text-slate-400 mt-1">Add, update, or remove property suites, nightly rates, amenities, and Airbnb synchronization endpoints.</p>
        </div>
        
        {(activeRole === UserRole.SUPER_ADMIN || activeRole === UserRole.ADMIN) && (
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Rental Room
          </button>
        )}
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.rooms.map(room => {
          const mainPic = (room.images && room.images.length > 0) 
            ? room.images[0] 
            : (PRESET_IMAGES[room.type] || PRESET_IMAGES[RoomCategory.STANDARD])[0];
            
          return (
            <div key={room.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col group relative">
              
              {/* Image Banner */}
              <div className="relative h-44 overflow-hidden bg-slate-900 shrink-0">
                <img 
                  src={mainPic} 
                  alt={room.name} 
                  className="w-full h-full object-cover group-hover:scale-103 transition-all duration-300 opacity-90"
                  referrerPolicy="no-referrer"
                />
                
                {/* ID Tag and Category */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 bg-slate-900/85 text-white font-mono font-bold text-[10px] rounded-lg tracking-wider border border-white/15">
                    ID: {room.id}
                  </span>
                  <span className={`px-2.5 py-1 border text-[9px] font-extrabold uppercase rounded-lg tracking-wider shadow-sm ${getCategoryBadgeColor(room.type)}`}>
                    {room.type}
                  </span>
                </div>

                {/* Rates overlay */}
                <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-xl text-right">
                  <p className="text-[10px] text-gray-400 font-bold uppercase leading-none">Starting from</p>
                  <p className="text-sm font-black text-emerald-400 mt-1 leading-none">৳{room.baseRate}<span className="text-[10px] text-gray-300 font-medium">/nt</span></p>
                </div>
              </div>

              {/* Room Content Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800">{room.name}</h4>
                    <span className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">Floor {room.floor}</span>
                  </div>
                  
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed h-8">
                    {room.description || "No description provided. Edit to write custom welcome notes."}
                  </p>
                </div>

                {/* Capacity and Price Breakdowns */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center text-[10px] text-slate-500 font-bold bg-slate-50/50 rounded-xl p-1.5">
                  <div className="border-r border-slate-100 space-y-0.5">
                    <p className="text-slate-400 uppercase tracking-wider text-[8px]">Capacity</p>
                    <p className="text-slate-800 font-black text-xs flex items-center justify-center gap-1"><Users className="w-3.5 h-3.5 text-indigo-600" /> {room.capacity} Guests</p>
                  </div>
                  <div className="border-r border-slate-100 space-y-0.5">
                    <p className="text-slate-400 uppercase tracking-wider text-[8px]">Weekend</p>
                    <p className="text-slate-800 font-black text-xs">৳{room.weekendRate}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-slate-400 uppercase tracking-wider text-[8px]">Hourly</p>
                    <p className="text-slate-800 font-black text-xs">৳{room.hourlyRate}/hr</p>
                  </div>
                </div>

                {/* Amenities List */}
                <div className="space-y-1.5">
                  <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Amenities & Accessories</p>
                  <div className="flex flex-wrap gap-1.5">
                    {room.amenities.slice(0, 5).map(amenity => (
                      <span key={amenity} className="flex items-center gap-1 bg-slate-50 border border-slate-150 rounded-lg px-2 py-1 text-[9px] text-slate-600 font-medium">
                        {getAmenityIcon(amenity)}
                        {amenity}
                      </span>
                    ))}
                    {room.amenities.length > 5 && (
                      <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold border border-indigo-100 rounded-lg px-2 py-1">
                        +{room.amenities.length - 5} More
                      </span>
                    )}
                  </div>
                </div>

                {/* Apartment and Room Link Indicators */}
                {room.type === RoomCategory.APARTMENT ? (() => {
                  const subRooms = state.rooms.filter(r => r.parentId === room.id);
                  if (subRooms.length > 0) {
                    return (
                      <div className="bg-indigo-50 border border-indigo-100 p-2 rounded-xl">
                        <p className="text-[8px] uppercase tracking-wider font-extrabold text-indigo-800">Linked Sub-Rooms ({subRooms.length})</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {subRooms.map(sr => (
                            <span key={sr.id} className="bg-indigo-600 text-white font-mono font-bold text-[8px] px-1.5 py-0.5 rounded-sm" title={sr.name}>
                              {sr.id}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="bg-slate-50 border border-dashed border-slate-200 p-2 rounded-xl">
                      <p className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">No linked sub-rooms yet</p>
                    </div>
                  );
                })() : (() => {
                  if (room.parentId) {
                    const parent = state.rooms.find(r => r.id === room.parentId);
                    return (
                      <div className="bg-indigo-50/50 border border-indigo-100 p-2 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-[8px] uppercase tracking-wider font-extrabold text-indigo-800">Belongs to Apartment</p>
                          <p className="text-[10px] font-black text-slate-700 mt-0.5 truncate max-w-[150px]">{parent ? parent.name : room.parentId}</p>
                        </div>
                        <span className="bg-indigo-600 text-white font-mono font-bold text-[8px] px-1.5 py-0.5 rounded-sm shrink-0">
                          {room.parentId}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Airbnb URL check */}
                {room.airbnbImportUrl ? (
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-100 p-2 rounded-xl">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                    <span>Airbnb Calendar Auto-Sync Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                    <span>No Airbnb sync linked yet</span>
                  </div>
                )}

                {/* Admin controls */}
                {(activeRole === UserRole.SUPER_ADMIN || activeRole === UserRole.ADMIN) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => openEditModal(room)}
                      className="flex-1 py-2 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Unit
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="p-2 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50/20 rounded-xl transition-all cursor-pointer"
                      title="Delete Room"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center shrink-0">
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider">{editingRoom ? "Edit Rental Property" : "Add New Rental Room"}</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Provide specifications, nightly pricing tiers, and Airbnb export endpoints.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
              
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Core Attributes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Room ID / Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={!!editingRoom}
                    placeholder="e.g. 104, 303"
                    value={id}
                    onChange={e => setId(e.target.value)}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden font-mono disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Room Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Deluxe Suite 104"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Category</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as RoomCategory)}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden cursor-pointer font-bold text-slate-700"
                  >
                    <option value={RoomCategory.STANDARD}>Standard Double</option>
                    <option value={RoomCategory.EXECUTIVE}>Executive Studio</option>
                    <option value={RoomCategory.SUITE}>Luxury Suite</option>
                    <option value={RoomCategory.STUDIO}>Loft Studio</option>
                    <option value={RoomCategory.APARTMENT}>Apartment Combo</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Floor Level</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={floor}
                    onChange={e => setFloor(Number(e.target.value))}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Guest Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={capacity}
                    onChange={e => setCapacity(Number(e.target.value))}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden font-mono font-bold"
                  />
                </div>
              </div>

              {/* Apartment and Room Linking Interface */}
              {type === RoomCategory.APARTMENT ? (
                <div className="bg-indigo-50/30 p-4 border border-indigo-150/60 rounded-2xl space-y-3">
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" /> Linked Sub-Rooms in Apartment Combo
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">Select individual rooms inside this composite apartment. Booking this apartment will block all checked rooms, and booking any of those rooms will block this apartment.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto bg-white p-3 border border-slate-200 rounded-xl">
                    {state.rooms
                      .filter(r => r.type !== RoomCategory.APARTMENT && r.id !== id)
                      .map(r => {
                        const isChecked = linkedRoomIds.includes(r.id);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setLinkedRoomIds(prev => prev.filter(x => x !== r.id));
                              } else {
                                setLinkedRoomIds(prev => [...prev, r.id]);
                              }
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg text-[10px] font-bold text-left cursor-pointer transition-all border ${
                              isChecked
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-350"
                            }`}
                          >
                            <span className="truncate">{r.name} ({r.id})</span>
                            {isChecked ? <Check className="w-3 h-3 text-white shrink-0" /> : null}
                          </button>
                        );
                      })}
                  </div>

                  {linkedRoomIds.length > 0 && (() => {
                    const subRooms = state.rooms.filter(r => linkedRoomIds.includes(r.id));
                    const totalSubRoomsBase = subRooms.reduce((sum, r) => sum + r.baseRate, 0);
                    const totalSubRoomsWeekend = subRooms.reduce((sum, r) => sum + (r.weekendRate || Math.round(r.baseRate * 1.15)), 0);
                    const totalSubRoomsHourly = subRooms.reduce((sum, r) => sum + r.hourlyRate, 0);
                    return (
                      <div className="bg-white p-3.5 border border-indigo-100 rounded-xl space-y-2.5 shadow-xs">
                        <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-bold">
                          <p className="flex justify-between">
                            <span>Sub-Rooms Sum Rate:</span>
                            <span className="font-mono text-slate-700">৳{totalSubRoomsBase} (Base) / ৳{totalSubRoomsWeekend} (Wknd)</span>
                          </p>
                          <p className="flex justify-between">
                            <span>Sub-Rooms Hourly Sum:</span>
                            <span className="font-mono text-slate-700">৳{totalSubRoomsHourly}/hr</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBaseRate(Math.round(totalSubRoomsBase * 0.85));
                            setWeekendRate(Math.round(totalSubRoomsWeekend * 0.85));
                            setHourlyRate(Math.round(totalSubRoomsHourly * 0.85));
                          }}
                          className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded-lg border border-indigo-100 transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Apply Combo Pricing (15% Package Discount)
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-indigo-50/30 p-4 border border-indigo-150/60 rounded-2xl space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" /> Belongs to Apartment Combo (Parent)
                  </label>
                  <p className="text-[10px] text-slate-500 font-medium">Optional. Link this room to a parent luxury apartment so reservations are fully integrated and clashing is prevented.</p>
                  <select
                    value={parentId}
                    onChange={e => setParentId(e.target.value)}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden cursor-pointer font-bold text-slate-700"
                  >
                    <option value="">None (Standalone Unit)</option>
                    {state.rooms
                      .filter(r => r.type === RoomCategory.APARTMENT && r.id !== id)
                      .map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} (ID: {r.id})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Pricing breakdown */}
              <div className="bg-indigo-50/50 p-4 border border-indigo-100 rounded-2xl">
                <p className="text-[10px] uppercase tracking-widest font-extrabold text-indigo-950 mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-600" /> Hourly & Nightly Pricing Breakdown
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-indigo-900">Base Nightly (৳)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={baseRate}
                      onChange={e => setBaseRate(Number(e.target.value))}
                      className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-indigo-900">Weekend Nightly (৳)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={weekendRate}
                      onChange={e => setWeekendRate(Number(e.target.value))}
                      className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-indigo-900">Hourly Rate (৳)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={hourlyRate}
                      onChange={e => setHourlyRate(Number(e.target.value))}
                      className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Unit Welcome & Overview Description</label>
                <textarea
                  rows={3}
                  placeholder="Cozy double bed suite near the skyline overlooking private green terrace garden..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden leading-relaxed"
                />
              </div>

              {/* Predefined Amenities Checkboxes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Select Available Amenities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3.5 border border-slate-150 rounded-xl max-h-36 overflow-y-auto">
                  {AVAILABLE_AMENITIES.map(amenity => {
                    const active = selectedAmenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => handleToggleAmenity(amenity)}
                        className={`flex items-center justify-between p-2 rounded-lg text-[10px] font-bold text-left cursor-pointer transition-all border ${
                          active 
                            ? "bg-indigo-600 text-white border-indigo-600" 
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-350"
                        }`}
                      >
                        <span className="truncate">{amenity}</span>
                        {active ? <Check className="w-3 h-3 text-white shrink-0" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pics/Images Upload Link */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Custom Room Pictures & Image URLs
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoFillPresets}
                    className="text-[9px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold border border-indigo-150 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    Auto-fill Category Presets
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="https://image1.jpg, https://image2.jpg"
                  value={imagesText}
                  onChange={e => setImagesText(e.target.value)}
                  className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden font-mono text-slate-700 leading-normal"
                />
                <p className="text-[9px] text-slate-400 font-bold leading-normal">Enter comma-separated public web-accessible Unsplash/CDN image URLs. If left empty, category standard image libraries will be applied.</p>
              </div>

              {/* Airbnb Sync iCal */}
              <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-orange-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-pulse" /> Airbnb Import Calendar URL (iCal .ics)
                </label>
                <input
                  type="url"
                  placeholder="https://www.airbnb.com/calendar/ical/1234567.ics"
                  value={airbnbImportUrl}
                  onChange={e => setAirbnbImportUrl(e.target.value)}
                  className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden font-mono text-slate-700"
                />
                <p className="text-[9px] text-orange-800 font-bold leading-normal">
                  Provide your Airbnb listing's exported Calendar feed link. This auto-blocks dates inside Urban Haven matching reservations on the Airbnb OTA platform.
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-100 flex items-center gap-1.5"
                >
                  {loading ? "Saving Room..." : (editingRoom ? "Save Changes" : "Create Room")}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
