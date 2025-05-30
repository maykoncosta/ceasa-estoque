import { Component } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'ceasa-estoque';
  sidebarOpen = true;
  user$: Observable<User | null>;

  constructor(private authService: AuthService){
    this.user$ = this.authService.currentUser$;
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  async logout() {
    await this.authService.logout();
  }
}
