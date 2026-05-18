import React, { createContext, useContext, useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const api = useApi();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ projects: [], tasks: [], members: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ projects: [], tasks: [], members: [] });
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        // We'll perform a multi-search
        const [pData, tData, mData] = await Promise.all([
          api.get(`/projects?search=${query}`),
          api.get(`/tasks?search=${query}`),
          api.get('/users/team') // In real app, /users/team?search=query
        ]);

        setResults({
          projects: (pData.projects || []).slice(0, 5),
          tasks: (tData.tasks || []).slice(0, 5),
          members: (mData.users || []).filter(u => 
            u.name.toLowerCase().includes(query.toLowerCase()) || 
            u.email.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 5)
        });
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  return (
    <SearchContext.Provider value={{ query, setQuery, results, loading }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
