import { Component, OnInit } from '@angular/core';
import { Message, MessageService } from '../services/message.service';

@Component({
  selector: 'app-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css']
})
export class MessageComponent implements OnInit {
  message: string = '';
  type: 'success' | 'error' | 'info' = 'info';
  visible = false;

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    this.messageService.message$.subscribe((msg: Message) => {
      this.message = msg.text;
      this.type = msg.type;
      this.visible = true;

      setTimeout(() => {
        this.visible = false;
      }, msg.duration || 3000);
    });
  }
}