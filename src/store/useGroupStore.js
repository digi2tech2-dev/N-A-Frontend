import { create } from 'zustand';
import { mockGroups } from '../data/mockData';
import apiClient from '../services/client';
import { isRealProvider } from '../config/dataProvider';

let hasFetchedGroupsFromBackendThisSession = false;

const GROUPS_CACHE_KEY = 'kanz-coins:groups-cache:v1';
const GROUPS_CACHE_TTL = isRealProvider ? 30 * 1000 : 3 * 60 * 1000;

let groupsRequest = null;

const readGroupsCache = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(GROUPS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const groups = Array.isArray(parsed?.groups) ? parsed.groups : null;
    const loadedAt = Number(parsed?.loadedAt || 0);
    if (!groups || !Number.isFinite(loadedAt)) return null;
    return { groups, loadedAt };
  } catch {
    return null;
  }
};

const writeGroupsCache = (groups, loadedAt) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(
      GROUPS_CACHE_KEY,
      JSON.stringify({ groups: Array.isArray(groups) ? groups : [], loadedAt: Number(loadedAt || 0) })
    );
  } catch {
    // Best-effort only.
  }
};

const initialCache = isRealProvider ? readGroupsCache() : null;

const useGroupStore = create((set, get) => ({
  groups: Array.isArray(initialCache?.groups) ? initialCache.groups : (isRealProvider ? [] : mockGroups),
  groupsLastLoadedAt: Number(initialCache?.loadedAt || 0) || 0,
  loadGroups: async ({ force = true } = {}) => {
    const { groups, groupsLastLoadedAt } = get();
    const hasGroups = Array.isArray(groups) && groups.length > 0;
    const shouldBypassHydratedCache = isRealProvider && !hasFetchedGroupsFromBackendThisSession;
    const cacheAge = Number(groupsLastLoadedAt || 0) ? (Date.now() - Number(groupsLastLoadedAt || 0)) : Number.POSITIVE_INFINITY;
    const cacheIsFresh = cacheAge >= 0 && cacheAge < GROUPS_CACHE_TTL;
    const hasFreshGroups = !shouldBypassHydratedCache && hasGroups && cacheIsFresh;

    // Serve cached groups when still fresh (even if force=true).
    if (hasFreshGroups) return groups;
    if (!force && hasGroups) return groups;

    if (groupsRequest) return groupsRequest;

    groupsRequest = apiClient.groups.list()
      .then((items) => {
        const nextGroups = Array.isArray(items) ? items : (isRealProvider ? [] : mockGroups);
        const loadedAt = Date.now();
        set({ groups: nextGroups, groupsLastLoadedAt: loadedAt });
        if (isRealProvider) writeGroupsCache(nextGroups, loadedAt);
        if (isRealProvider) hasFetchedGroupsFromBackendThisSession = true;
        return nextGroups;
      })
      .catch(() => {
        if (!hasGroups) set({ groups: isRealProvider ? [] : mockGroups });
        return get().groups;
      })
      .finally(() => { groupsRequest = null; });

    return groupsRequest;
  },
  addGroup: async (group) => {
    const created = await apiClient.groups.create(group);
    set((state) => ({
      groups: [...state.groups, created || { ...group, id: Date.now() }],
      groupsLastLoadedAt: Date.now(),
    }));
    return created;
  },
  updateGroup: async (id, updatedGroup) => {
    const updated = await apiClient.groups.update(id, updatedGroup);
    set((state) => ({
      groups: state.groups.map((g) => (String(g.id) === String(id) ? { ...g, ...updatedGroup, ...(updated || {}) } : g)),
      groupsLastLoadedAt: Date.now(),
    }));
    return updated;
  },
  deleteGroup: async (id) => {
    await apiClient.groups.delete(id);
    set((state) => ({
      groups: state.groups.filter((g) => String(g.id) !== String(id)),
      groupsLastLoadedAt: Date.now(),
    }));
    return { success: true };
  },
}));

export default useGroupStore;
