import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LoginComponent } from './pages/login/login.component';
import { ProdutoComponent } from './pages/produto/produto.component';
import { UnidadeMedidaComponent } from './pages/unidade-medida/unidade-medida.component';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginGuard } from './core/guards/login.guard';
import { VendaComponent } from './pages/venda/venda.component';
import { VendaFormComponent } from './pages/venda/venda-form/venda-form.component';
import { ClienteComponent } from './pages/cliente/cliente.component';
import { ClienteVendasComponent } from './pages/cliente/cliente-vendas/cliente-vendas.component';
import { RelatorioComponent } from './pages/relatorio/relatorio.component';
import { ContaComponent } from './pages/conta/conta.component';

const routes: Routes = [
  {path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard]},
  {path: 'produtos', component: ProdutoComponent, canActivate: [AuthGuard]},
  {path: 'unidades', component: UnidadeMedidaComponent, canActivate: [AuthGuard]},
  {path: 'clientes', component: ClienteComponent, canActivate: [AuthGuard]},
  {path: 'clientes/:nome/vendas', component: ClienteVendasComponent, canActivate: [AuthGuard]},
  {path: 'vendas', component: VendaComponent, canActivate: [AuthGuard]},
  {path: 'vendas/nova', component: VendaFormComponent, canActivate: [AuthGuard]},
  {path: 'vendas/editar/:id', component: VendaFormComponent, canActivate: [AuthGuard]},
  {path: 'relatorios', component: RelatorioComponent, canActivate: [AuthGuard]},
  {path: 'conta', component: ContaComponent, canActivate: [AuthGuard]},
  {path: 'login', component: LoginComponent, canActivate: [LoginGuard]},
  {path: '', component: DashboardComponent, canActivate: [AuthGuard]},
  {path: '**', redirectTo: '', canActivate: [AuthGuard]}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
