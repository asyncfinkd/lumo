import type { ReactNode } from 'react';
import { asc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { categories } from '@/db/schema';
import { type CategoryRow, CategoryRowsContext } from './categories';

/** Mount once the database is ready; screens below read categories through `useCategories`. */
export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { data } = useLiveQuery(db.select().from(categories).orderBy(asc(categories.sortOrder)));
  return (
    <CategoryRowsContext.Provider value={data as CategoryRow[]}>
      {children}
    </CategoryRowsContext.Provider>
  );
}
