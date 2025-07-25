import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { EmpresaService } from './core/services/empresa.service';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { User } from '@angular/fire/auth';
import { Empresa } from './shared/models/empresa.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  title = 'ceasa-estoque';
  sidebarOpen = true;
  user$: Observable<User | null>;
  empresa: Empresa | null = null;

  constructor(
    private authService: AuthService,
    private empresaService: EmpresaService,
    private router: Router
  ) {
    this.user$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    // Carregar dados da empresa quando o usuário estiver logado
    this.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        this.loadEmpresaData();
      } else {
        this.empresa = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadEmpresaData(): void {
    this.empresaService.obterEmpresa().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (empresa) => {
        this.empresa = empresa;
      },
      error: (error) => {
        console.error('Erro ao carregar dados da empresa no header:', error);
      }
    });
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  async logout() {
    await this.authService.logout();
  }

  navegarParaDashboard() {
    // Só navega se o usuário estiver logado
    this.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  // Getters para facilitar o acesso no template
  get nomeEmpresa(): string {
    return this.empresa?.nome || 'Balcão Rápido';
  }

  get logoEmpresa(): string | null {
    return this.empresa?.logo_url || null;
  }

  get empresaAtiva(): boolean {
    return this.empresa?.ativo ?? true;
  }
}
