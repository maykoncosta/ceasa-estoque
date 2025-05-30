import { Component } from '@angular/core';
import { LoaderService } from '../services/loader.service';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.css']
})
export class LoaderComponent {
  show = false;

  constructor(private loaderService: LoaderService) { }

  ngOnInit(): void {
    this.loaderService.loading$.subscribe((visible: boolean) => {
      this.show = visible;
    });
  }
}
