import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteVendasComponent } from './cliente-vendas.component';

describe('ClienteVendasComponent', () => {
  let component: ClienteVendasComponent;
  let fixture: ComponentFixture<ClienteVendasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClienteVendasComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteVendasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
