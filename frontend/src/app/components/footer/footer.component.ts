import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  showPrivacy = false;

  togglePrivacy() {
    this.showPrivacy = !this.showPrivacy;
  }
}
