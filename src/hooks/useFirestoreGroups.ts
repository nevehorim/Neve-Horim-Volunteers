import { useEffect, useState } from 'react';
import {
  QuerySnapshot,
  Timestamp,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { groupsRef, Group } from '@/services/firestore';

export interface GroupUI extends Omit<Group, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

export function ensureGroupShape(raw: any): GroupUI {
  const createdAt =
    raw.createdAt instanceof Timestamp
      ? raw.createdAt.toDate().toISOString()
      : (raw.createdAt || new Date().toISOString());
  const updatedAt =
    raw.updatedAt instanceof Timestamp
      ? raw.updatedAt.toDate().toISOString()
      : (raw.updatedAt || createdAt);

  return {
    id: raw.id || '',
    name: raw.name || '',
    isDefault: Boolean(raw.isDefault),
    createdAt,
    updatedAt,
  };
}

export async function ensureDefaultGroup(): Promise<GroupUI> {
  const q = query(groupsRef, where('isDefault', '==', true), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return ensureGroupShape({ id: d.id, ...d.data() });
  }

  const now = Timestamp.now();
  const docRef = await addDoc(groupsRef, {
    name: 'Default',
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  } satisfies Omit<Group, 'id'>);

  return ensureGroupShape({
    id: docRef.id,
    name: 'Default',
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  });
}

export function useGroups() {
  const [groups, setGroups] = useState<GroupUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      groupsRef,
      (snapshot: QuerySnapshot) => {
        const data: GroupUI[] = snapshot.docs.map((d) =>
          ensureGroupShape({ id: d.id, ...d.data() })
        );
        // Sort with default group first, then name
        data.sort((a, b) => {
          if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        setGroups(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { groups, loading, error };
}

export function useAddGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addGroup = async (data: { name: string; isDefault?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const now = Timestamp.now();
      const payload: Omit<Group, 'id'> = {
        name: data.name.trim(),
        isDefault: Boolean(data.isDefault),
        createdAt: now,
        updatedAt: now,
      };
      const docRef = await addDoc(groupsRef, payload);
      return docRef.id;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { addGroup, loading, error };
}

export function useUpdateGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateGroup = async (id: string, data: Partial<Pick<Group, 'name'>>) => {
    setLoading(true);
    setError(null);
    try {
      const ref = doc(groupsRef, id);
      await updateDoc(ref, {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        updatedAt: Timestamp.now(),
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { updateGroup, loading, error };
}

export function useDeleteGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteGroup = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const ref = doc(groupsRef, id);
      await deleteDoc(ref);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { deleteGroup, loading, error };
}

