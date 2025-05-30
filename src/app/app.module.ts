import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardModule } from './pages/dashboard/dashboard.module';
import { LoginModule } from './pages/login/login.module';
import { SidebarComponent } from './pages/sidebar/sidebar.component';
import { ProdutoComponent } from './pages/produto/produto.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { MessageComponent } from './shared/message/message.component';
import { LoaderComponent } from './shared/loader/loader.component';
import { ConfirmModalComponent } from './shared/confirm-modal/confirm-modal.component';
import { UnidadeMedidaComponent } from './pages/unidade-medida/unidade-medida.component';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { environment } from '../environments/environment';


@NgModule({
  declarations: [
    AppComponent,
    SidebarComponent,
    ProdutoComponent,
    MessageComponent,
    LoaderComponent,
    ConfirmModalComponent,
    UnidadeMedidaComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    DashboardModule,
    LoginModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    provideStorage(() => getStorage()), 

  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
