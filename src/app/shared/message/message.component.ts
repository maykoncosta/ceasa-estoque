import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message, MessageService } from '../services/message.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css']
})
export class MessageComponent implements OnInit {
  messages: Message[] = [];
  type: 'success' | 'error' | 'info' = 'info';
  visible = false;

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    this.messageService.message$.subscribe((msg: Message) => {
      this.messages.push(msg);

      setTimeout(() => {
        this.removeMessage(msg);
      }, msg.duration || 3000);
    });
  }

  removeMessage(msg: Message): void {
    const index = this.messages.indexOf(msg);
    if (index > -1) {
      this.messages.splice(index, 1);
    }
  }
}