/**
 * proposalContentLibrary.js
 *
 * Lightweight content library for reusable proposal text blocks.
 * Stored in localStorage with simple structure: id, type, title, content, category.
 *
 * Types: scope | inclusion | exclusion | timeline
 * No backend complexity — just localStorage with JSON serialization.
 */

const STORAGE_KEY = 'proposal_content_library';

/**
 * Get all saved content items (optionally filtered by type)
 */
export function getLibraryItems(filterType = null) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return filterType ? items.filter(i => i.type === filterType) : items;
  } catch {
    return [];
  }
}

/**
 * Save a new content item to library
 */
export function saveToLibrary({ type, title, content, category = '' }) {
  if (!type || !title || !content) return null;

  try {
    const items = getLibraryItems();
    const newItem = {
      id: `item_${Date.now()}`,
      type,
      title: title.trim(),
      content: content.trim(),
      category: category.trim() || 'General',
      created_at: new Date().toISOString(),
    };
    items.push(newItem);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return newItem;
  } catch (err) {
    console.error('[ContentLibrary] Save failed:', err);
    return null;
  }
}

/**
 * Delete item from library by id
 */
export function deleteFromLibrary(itemId) {
  try {
    const items = getLibraryItems();
    const filtered = items.filter(i => i.id !== itemId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get item by id
 */
export function getItemById(itemId) {
  const items = getLibraryItems();
  return items.find(i => i.id === itemId) || null;
}

/**
 * Clear entire library (destructive)
 */
export function clearLibrary() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get unique categories for a given type
 */
export function getCategories(type) {
  const items = getLibraryItems(type);
  const cats = new Set(items.map(i => i.category || 'General'));
  return Array.from(cats).sort();
}