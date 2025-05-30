import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { map, Observable, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {

  constructor(private auth: Auth, private router: Router) { }

  canActivate(): Observable<boolean> {
      return new Observable<boolean>((observer) => {
        const unsubscribe = onAuthStateChanged(this.auth, (user) => {
          if (user) {
            this.router.navigate(['/']);
            observer.next(false);
          } else {
            observer.next(true);
          }
          observer.complete();
        });
  
        return { unsubscribe };
      });
    }

}
