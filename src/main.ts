import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { importProvidersFrom, LOCALE_ID, ErrorHandler } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CurrencyPipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import * as Sentry from '@sentry/angular';
import { Router } from '@angular/router';

import { AppComponent } from './app/app.component';
import { routes } from './app/app-routing.module';
import { FirebaseModule } from './app/firebase/firebase.module';
import { environment } from './environments/environment';

registerLocaleData(localePt);

Sentry.init({
  dsn: environment.sentry.dsn,
  environment: environment.sentry.environment,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Captura 100% das transações em dev
  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% das sessões
  replaysOnErrorSampleRate: 1.0, // 100% quando há erro
});

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(
      FormsModule,
      ReactiveFormsModule,
      FontAwesomeModule,
      FirebaseModule
    ),
    CurrencyPipe,
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler({
        showDialog: false,
      }),
    },
    {
      provide: Sentry.TraceService,
      deps: [Router],
    }
  ]
}).catch(err => console.error(err));
