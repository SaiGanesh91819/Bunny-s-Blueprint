import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-legal',
  templateUrl: './legal.component.html',
  styleUrls: ['./legal.component.scss']
})
export class LegalComponent implements OnInit {
  type: string = '';
  title: string = '';

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.route.url.subscribe(url => {
      const path = url[0].path;
      if (path.includes('privacy')) {
        this.type = 'privacy';
        this.title = 'Privacy Policy';
      } else if (path.includes('terms')) {
        this.type = 'terms';
        this.title = 'Terms & Conditions';
      } else if (path.includes('refund')) {
        this.type = 'refund';
        this.title = 'Refund & Cancellation Policy';
      }
    });
  }
}
