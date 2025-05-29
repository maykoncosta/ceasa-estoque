import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';


export interface Message {
  text: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private messageSubject = new Subject<Message>();
  message$ = this.messageSubject.asObservable();

  sucessMessage = "Operação Realizada Com Sucesso!"
  errorMessage = "Não Foi Possível Realizar a Operação!"
  infoMessage = "Alerta!"

  showMessage(message: Message) {
    this.messageSubject.next(message);
  }

  success(text = this.sucessMessage, duration = 5000) {
    this.showMessage({ text, type: 'success', duration });
  }

  error(text = this.errorMessage, duration = 5000) {
    this.showMessage({ text, type: 'error', duration });
  }

  info(text = this.infoMessage, duration = 5000) {
    this.showMessage({ text, type: 'info', duration });
  }
}
