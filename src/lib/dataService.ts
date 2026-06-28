import { db } from './firebase';
import { collection, doc, getDocs, setDoc, writeBatch, onSnapshot, query, where, updateDoc, addDoc } from 'firebase/firestore';
import { AppState, Room, Booking, GuestProfile, HousekeepingTask, MaintenanceRequest, AuditLog, User } from '../types';
import localData from '../../data.json'; // fallback/seed data

export const seedDatabase = async () => {
  const roomsSnapshot = await getDocs(collection(db, 'rooms'));
  if (!roomsSnapshot.empty) {
    console.log('Database already seeded');
    return;
  }
  console.log('Seeding database...');
  const batch = writeBatch(db);

  localData.rooms.forEach(room => {
    const ref = doc(collection(db, 'rooms'), room.id);
    batch.set(ref, { ...room, tenantId: 'default' });
  });

  localData.bookings.forEach(booking => {
    const ref = doc(collection(db, 'bookings'), booking.id);
    batch.set(ref, { ...booking, tenantId: 'default' });
  });

  localData.guests.forEach(guest => {
    const ref = doc(collection(db, 'guests'), guest.id);
    batch.set(ref, { ...guest, tenantId: 'default' });
  });

  localData.housekeepingTasks.forEach(task => {
    const ref = doc(collection(db, 'housekeepingTasks'), task.id);
    batch.set(ref, { ...task, tenantId: 'default' });
  });

  localData.maintenanceRequests.forEach(req => {
    const ref = doc(collection(db, 'maintenanceRequests'), req.id);
    batch.set(ref, { ...req, tenantId: 'default' });
  });

  localData.users.forEach(user => {
    const ref = doc(collection(db, 'users'), user.id);
    batch.set(ref, { ...user, tenantId: 'default' });
  });
  
  const settingsRef = doc(collection(db, 'settings'), 'default');
  batch.set(settingsRef, localData.settings);

  await batch.commit();
  console.log('Seeding complete');
};

export const subscribeToAppState = (tenantId: string, onUpdate: (state: AppState) => void) => {
  let state: Partial<AppState> = {};

  const checkAndEmit = () => {
    if (
      state.rooms && state.bookings && state.guests &&
      state.housekeepingTasks && state.maintenanceRequests && state.users && state.settings
    ) {
      onUpdate(state as AppState);
    }
  };

  const qRooms = query(collection(db, 'rooms'), where('tenantId', '==', tenantId));
  const unsubRooms = onSnapshot(qRooms, (snapshot) => {
    state.rooms = snapshot.docs.map(doc => doc.data() as Room);
    checkAndEmit();
  });

  const qBookings = query(collection(db, 'bookings'), where('tenantId', '==', tenantId));
  const unsubBookings = onSnapshot(qBookings, (snapshot) => {
    state.bookings = snapshot.docs.map(doc => doc.data() as Booking);
    checkAndEmit();
  });

  const qGuests = query(collection(db, 'guests'), where('tenantId', '==', tenantId));
  const unsubGuests = onSnapshot(qGuests, (snapshot) => {
    state.guests = snapshot.docs.map(doc => doc.data() as GuestProfile);
    checkAndEmit();
  });

  const qHK = query(collection(db, 'housekeepingTasks'), where('tenantId', '==', tenantId));
  const unsubHK = onSnapshot(qHK, (snapshot) => {
    state.housekeepingTasks = snapshot.docs.map(doc => doc.data() as HousekeepingTask);
    checkAndEmit();
  });

  const qMaint = query(collection(db, 'maintenanceRequests'), where('tenantId', '==', tenantId));
  const unsubMaint = onSnapshot(qMaint, (snapshot) => {
    state.maintenanceRequests = snapshot.docs.map(doc => doc.data() as MaintenanceRequest);
    checkAndEmit();
  });

  const qUsers = query(collection(db, 'users'), where('tenantId', '==', tenantId));
  const unsubUsers = onSnapshot(qUsers, (snapshot) => {
    state.users = snapshot.docs.map(doc => doc.data() as User);
    checkAndEmit();
  });

  const unsubSettings = onSnapshot(doc(db, 'settings', tenantId), (docSnap) => {
    if (docSnap.exists()) {
      state.settings = docSnap.data() as AppState['settings'];
    } else {
      state.settings = localData.settings; // Fallback to default
    }
    // Set empty array for auditLogs as we removed them from UI
    state.auditLogs = [];
    checkAndEmit();
  });

  return () => {
    unsubRooms();
    unsubBookings();
    unsubGuests();
    unsubHK();
    unsubMaint();
    unsubUsers();
    unsubSettings();
  };
};
