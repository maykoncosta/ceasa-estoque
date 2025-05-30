import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router) { }

  canActivate(): Observable<boolean> {
    return new Observable<boolean>((observer) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        if (user) {
          observer.next(true);
        } else {
          this.router.navigate(['/login']);
          observer.next(false);
        }
        observer.complete();
      });

      return { unsubscribe };
    });
  }

}
