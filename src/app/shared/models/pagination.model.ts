import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  lastVisible?: QueryDocumentSnapshot<DocumentData>;
  hasMore?: boolean; // Indica se há mais páginas sem precisar calcular total
}

export interface PaginationConfig {
  pageSize: number;
  orderByField: string;
}
