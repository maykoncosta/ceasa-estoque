import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {

  private loadingSubject = new Subject<any>();
  loading$ = this.loadingSubject.asObservable();

  showLoading() {
    this.loadingSubject.next(true);
  }

  closeLoading() {
    this.loadingSubject.next(false);
  }
}
