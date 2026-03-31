import { normalizeDocumentStructureSettings } from "@/lib/document-config";
import { normalizeDocumentSettings } from "@/lib/document-settings";
import { sanitizeSafeRedirectPath, sanitizeSingleLineText } from "@/lib/sanitize";
import type { EditorDraftData, UserProfile } from "@/types/editor";

export const GUEST_DRAFT_STORAGE_KEY = "guest_draft";
export const ACTIVE_USER_STORAGE_KEY = "reportforge_active_user";
const LEGACY_DRAFT_STORAGE_PREFIX = "reportforge-doc:";
const USER_DRAFT_STORAGE_PREFIX = "reportforge_";
const USER_DRAFT_KEY_PATTERN = /^reportforge_[0-9a-f-]{20,}$/i;
const USER_LAST_EDITOR_STORAGE_PREFIX = "reportforge_last_editor_";
const USER_LAST_EDITOR_KEY_PATTERN = /^reportforge_last_editor_[0-9a-f-]{20,}$/i;
const GUEST_LAST_EDITOR_STORAGE_KEY = "reportforge_last_editor_guest";

const parseJson = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const getUserDraftStorageKey = (userId: string) => {
  return `${USER_DRAFT_STORAGE_PREFIX}${userId}`;
};

const getLastEditorStorageKey = (userId?: string | null) => {
  return userId
    ? `${USER_LAST_EDITOR_STORAGE_PREFIX}${userId}`
    : GUEST_LAST_EDITOR_STORAGE_KEY;
};

export const normalizeDraftData = (
  templateId: string,
  draft: Partial<EditorDraftData> | null | undefined,
  fallback: EditorDraftData,
  profile?: UserProfile | null
): EditorDraftData => {
  const normalizedTitlePage = {
    ...fallback.titlePage,
    ...(draft?.titlePage ?? {}),
  };

  if (!normalizedTitlePage.studentName && profile?.full_name) {
    normalizedTitlePage.studentName = profile.full_name;
  }

  if (!normalizedTitlePage.collegeName && profile?.college_name) {
    normalizedTitlePage.collegeName = profile.college_name;
  }

  return {
    templateId,
    title: sanitizeSingleLineText(draft?.title, fallback.title, 200),
    titlePage: normalizedTitlePage,
    blocks: Array.isArray(draft?.blocks) && draft.blocks.length ? draft.blocks : fallback.blocks,
    images:
      draft?.images && typeof draft.images === "object" ? draft.images : fallback.images,
    documentSettings: normalizeDocumentSettings({
      ...fallback.documentSettings,
      ...(draft?.documentSettings ?? {}),
      fontFamily: sanitizeSingleLineText(
        draft?.documentSettings?.fontFamily || fallback.documentSettings.fontFamily,
        fallback.documentSettings.fontFamily,
        80
      ),
    }),
    documentStructure: normalizeDocumentStructureSettings({
      ...fallback.documentStructure,
      ...(draft?.documentStructure ?? {}),
    }),
    compactMode: Boolean(draft?.compactMode),
    collapsedBlockIds: Array.isArray(draft?.collapsedBlockIds)
      ? draft.collapsedBlockIds.filter((value): value is string => typeof value === "string")
      : [],
  };
};

export const buildDraftPayload = (
  templateId: string,
  draft: EditorDraftData
): EditorDraftData => {
  return normalizeDraftData(templateId, draft, draft);
};

export const clearLegacyDraftStorage = () => {
  if (typeof window === "undefined") {
    return;
  }

  const keys = Object.keys(window.localStorage);
  keys.forEach((key) => {
    if (key.startsWith(LEGACY_DRAFT_STORAGE_PREFIX)) {
      window.localStorage.removeItem(key);
    }
  });
};

export const clearDraftCachesForLogin = (userId: string) => {
  if (typeof window === "undefined") {
    return;
  }

  clearLegacyDraftStorage();
  window.localStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);

  const keys = Object.keys(window.localStorage);
  keys.forEach((key) => {
    if (
      (USER_DRAFT_KEY_PATTERN.test(key) && key !== getUserDraftStorageKey(userId)) ||
      (USER_LAST_EDITOR_KEY_PATTERN.test(key) &&
        key !== getLastEditorStorageKey(userId))
    ) {
      window.localStorage.removeItem(key);
    }
  });

  window.localStorage.removeItem(GUEST_LAST_EDITOR_STORAGE_KEY);
  window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId);
};

export const readGuestDraft = <T>(templateId: string) => {
  if (typeof window === "undefined") {
    return null as T | null;
  }

  const payload = parseJson<{ templateId?: string; draft?: T }>(
    window.localStorage.getItem(GUEST_DRAFT_STORAGE_KEY)
  );

  if (!payload || payload.templateId !== templateId) {
    return null as T | null;
  }

  return payload.draft ?? null;
};

export const writeGuestDraft = (templateId: string, draft: EditorDraftData) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    GUEST_DRAFT_STORAGE_KEY,
    JSON.stringify({
      templateId,
      draft,
    })
  );
};

export const readUserDraft = <T>(userId: string, templateId: string) => {
  if (typeof window === "undefined") {
    return null as T | null;
  }

  const activeUserId = window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
  if (activeUserId && activeUserId !== userId) {
    return null as T | null;
  }

  const payload = parseJson<{ drafts?: Record<string, T> }>(
    window.localStorage.getItem(getUserDraftStorageKey(userId))
  );

  if (!payload?.drafts) {
    return null as T | null;
  }

  return payload.drafts[templateId] ?? null;
};

export const writeUserDraft = (
  userId: string,
  templateId: string,
  draft: EditorDraftData
) => {
  if (typeof window === "undefined") {
    return;
  }

  const key = getUserDraftStorageKey(userId);
  const payload = parseJson<{ drafts?: Record<string, EditorDraftData> }>(
    window.localStorage.getItem(key)
  );

  window.localStorage.setItem(
    key,
    JSON.stringify({
      drafts: {
        ...(payload?.drafts ?? {}),
        [templateId]: draft,
      },
    })
  );
  window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId);
};

export const readLastEditorPath = (userId?: string | null) => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(getLastEditorStorageKey(userId));
  const safePath = sanitizeSafeRedirectPath(rawValue, "");
  return safePath || null;
};

export const writeLastEditorPath = (path: string, userId?: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  const safePath = sanitizeSafeRedirectPath(path, "");
  if (!safePath) {
    return;
  }

  window.localStorage.setItem(getLastEditorStorageKey(userId), safePath);

  if (userId) {
    window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId);
  }
};

export const clearBrowserSessionStorage = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.clear();
  window.sessionStorage.clear();
};
