import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  email: string = '';
  senha: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private loaderService: LoaderService,
    private messageService: MessageService
  ) { }

  onLogin() {
    if(this.email?.length > 0 && this.senha?.length > 0 ) {
      this.loaderService.showLoading();
      this.authService.login(this.email, this.senha)
      .then(() => {
        this.router.navigate(['/']);
        this.loaderService.closeLoading();
        this.messageService.success('Login feito com sucesso!');
      })
      .catch(err => {
        this.loaderService.closeLoading(); 
        this.messageService.error('Erro ao fazer login. Tente novamente.');
      });
    } else {
      this.messageService.info('Preencha Email e Senha.');

    }
  }
}
