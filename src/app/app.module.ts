import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardModule } from './pages/dashboard/dashboard.module';
import { LoginModule } from './pages/login/login.module';
import { SidebarComponent } from './pages/sidebar/sidebar.component';
import { ProdutoComponent } from './pages/produto/produto.component';
import { ProdutoFormModalComponent } from './pages/produto/produto-form-modal/produto-form-modal.component';
import { ProdutoEstoqueModalComponent } from './pages/produto/produto-estoque-modal/produto-estoque-modal.component';
import { UnidadeMedidaFormModalComponent } from './pages/unidade-medida/unidade-medida-form-modal/unidade-medida-form-modal.component';
import { ClienteFormModalComponent } from './pages/cliente/cliente-form-modal/cliente-form-modal.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { MessageComponent } from './shared/message/message.component';
import { LoaderComponent } from './shared/loader/loader.component';
import { ConfirmModalComponent } from './shared/confirm-modal/confirm-modal.component';
import { UnidadeMedidaComponent } from './pages/unidade-medida/unidade-medida.component';

import { FirebaseModule } from './firebase/firebase.module';
import { CurrencyPipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { VendaComponent } from './pages/venda/venda.component';
import { VendaFormComponent } from './pages/venda/venda-form/venda-form.component';
import { ClienteComponent } from './pages/cliente/cliente.component';
import { RelatorioComponent } from './pages/relatorio/relatorio.component';
import { RelatorioModule } from './pages/relatorio/relatorio.module';
import { ContaComponent } from './pages/conta/conta.component';
import { ClienteVendasComponent } from './pages/cliente/cliente-vendas/cliente-vendas.component';

registerLocaleData(localePt);

@NgModule({
  declarations: [
    AppComponent,
    SidebarComponent,    ProdutoComponent,
    ProdutoFormModalComponent,
    ProdutoEstoqueModalComponent,
    UnidadeMedidaFormModalComponent,
    ClienteFormModalComponent,
    MessageComponent,
    LoaderComponent,
    ConfirmModalComponent,
    UnidadeMedidaComponent,
    ClienteComponent,
    VendaComponent,
    VendaFormComponent,
    ContaComponent,
    ClienteVendasComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    DashboardModule,
    LoginModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    CurrencyPipe,
    RelatorioModule,
    FirebaseModule
  ],
  providers: [ 
    {provide: LOCALE_ID, useValue: 'pt-BR'}
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
