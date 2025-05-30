
import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private auth: Auth,
    private router: Router,
  ) {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
    });
  }

  async login(email: string, password: string): Promise<void> {
    return signInWithEmailAndPassword(this.auth, email, password)
      .then(() => {
        this.router.navigate(['/']);
      });
  }

  async logout(): Promise<void> {
    return signOut(this.auth).then(() => {
      this.router.navigate(['/login']);
    });
  }


  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
}
