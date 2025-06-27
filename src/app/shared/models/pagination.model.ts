import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  lastVisible?: QueryDocumentSnapshot<DocumentData>;
}

export interface PaginationConfig {
  pageSize: number;
  orderByField: string;
}
