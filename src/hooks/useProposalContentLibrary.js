/**
 * useProposalContentLibrary.js
 *
 * Hook personalizado para gestionar la biblioteca de contenido reutilizable.
 * Expone operaciones CRUD simples y lista reactiva de items.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getLibraryItems,
  saveToLibrary,
  deleteFromLibrary,
  getItemById,
  getCategories,
} from '@/lib/proposalContentLibrary';

export function useProposalContentLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar items al montar
  useEffect(() => {
    const all = getLibraryItems();
    setItems(all);
    setLoading(false);
  }, []);

  // Guardar nuevo item
  const save = useCallback((type, title, content, category) => {
    const saved = saveToLibrary({ type, title, content, category });
    if (saved) {
      setItems(prev => [...prev, saved]);
      return saved;
    }
    return null;
  }, []);

  // Eliminar item
  const remove = useCallback((itemId) => {
    if (deleteFromLibrary(itemId)) {
      setItems(prev => prev.filter(i => i.id !== itemId));
      return true;
    }
    return false;
  }, []);

  // Obtener items por tipo
  const getByType = useCallback((type) => {
    return items.filter(i => i.type === type);
  }, [items]);

  // Obtener categorías para un tipo
  const getCats = useCallback((type) => {
    return getCategories(type);
  }, []);

  return {
    items,
    loading,
    save,
    remove,
    getByType,
    getCategories: getCats,
    getItemById: (id) => getItemById(id),
  };
}