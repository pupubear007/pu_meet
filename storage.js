// Storage layer: Firebase Firestore when configured, otherwise localStorage demo mode.
import { firebaseConfig } from './firebase-config.js';

export const personKey = (name) => encodeURIComponent(name.trim().toLowerCase()).slice(0, 150);

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const useFirebase = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

async function makeFirebaseStore() {
  const { initializeApp } = await import(FB + 'firebase-app.js');
  const f = await import(FB + 'firebase-firestore.js');
  const db = f.getFirestore(initializeApp(firebaseConfig));
  return {
    mode: 'firebase',
    async createEvent(ev) { await f.setDoc(f.doc(db, 'events', ev.id), ev); },
    async getEvent(id) {
      const s = await f.getDoc(f.doc(db, 'events', id));
      return s.exists() ? s.data() : null;
    },
    watchPeople(id, cb) {
      return f.onSnapshot(f.collection(db, 'events', id, 'people'),
        (snap) => cb(snap.docs.map((d) => d.data())),
        (err) => console.error(err));
    },
    async savePerson(id, person) {
      await f.setDoc(f.doc(db, 'events', id, 'people', personKey(person.name)), person);
    },
  };
}

function makeLocalStore() {
  const K = (id) => 'pu_meet:' + id;
  const listeners = new Map();
  const read = (id) => { try { return JSON.parse(localStorage.getItem(K(id))); } catch { return null; } };
  const write = (id, v) => { localStorage.setItem(K(id), JSON.stringify(v)); emit(id); };
  const emit = (id) => (listeners.get(id) || []).forEach((cb) => cb(Object.values(read(id)?.people || {})));
  window.addEventListener('storage', (e) => { if (e.key?.startsWith('pu_meet:')) emit(e.key.slice(8)); });
  return {
    mode: 'local',
    async createEvent(ev) { write(ev.id, { event: ev, people: {} }); },
    async getEvent(id) { return read(id)?.event || null; },
    watchPeople(id, cb) {
      if (!listeners.has(id)) listeners.set(id, []);
      listeners.get(id).push(cb);
      setTimeout(() => cb(Object.values(read(id)?.people || {})), 0);
      return () => listeners.set(id, listeners.get(id).filter((x) => x !== cb));
    },
    async savePerson(id, person) {
      const v = read(id); if (!v) return;
      v.people[personKey(person.name)] = person; write(id, v);
    },
  };
}

export const store = useFirebase ? await makeFirebaseStore() : makeLocalStore();
