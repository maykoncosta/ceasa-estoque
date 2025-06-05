import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LoginComponent } from './pages/login/login.component';
import { ProdutoComponent } from './pages/produto/produto.component';
import { UnidadeMedidaComponent } from './pages/unidade-medida/unidade-medida.component';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginGuard } from './core/guards/login.guard';
import { VendaComponent } from './pages/venda/venda.component';
import { RelatorioComponent } from './pages/relatorio/relatorio.component';

const routes: Routes = [
  {path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard]},
  {path: 'produtos', component: ProdutoComponent, canActivate: [AuthGuard]},
  {path: 'unidades', component: UnidadeMedidaComponent, canActivate: [AuthGuard]},
  {path: 'vendas', component: VendaComponent, canActivate: [AuthGuard]},
  {path: 'relatorios', component: RelatorioComponent, canActivate: [AuthGuard]},
  {path: 'login', component: LoginComponent, canActivate: [LoginGuard]},
  {path: '', component: DashboardComponent, canActivate: [AuthGuard]},
  {path: '**', redirectTo: '', canActivate: [AuthGuard]}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
