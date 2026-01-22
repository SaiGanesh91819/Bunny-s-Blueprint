import { Directive, ElementRef, HostListener, Renderer2, NgZone, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appTilt]'
})
export class TiltDirective implements OnDestroy {
  private bounds: DOMRect | null = null;
  private mouseX = 0;
  private mouseY = 0;
  private rafId: number | null = null;
  private mouseMoveListener: (() => void) | null = null;

  constructor(private el: ElementRef, private renderer: Renderer2, private ngZone: NgZone) {
    this.renderer.setStyle(this.el.nativeElement, 'transform-style', 'preserve-3d');
    this.renderer.setStyle(this.el.nativeElement, 'will-change', 'transform');
  }

  @HostListener('mouseenter')
  onMouseEnter() {
    this.bounds = this.el.nativeElement.getBoundingClientRect();
    
    // Run mousemove logic outside Angular to prevent Change Detection spam
    this.ngZone.runOutsideAngular(() => {
      this.mouseMoveListener = this.renderer.listen(this.el.nativeElement, 'mousemove', (e: MouseEvent) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        
        if (!this.rafId) {
          this.rafId = requestAnimationFrame(() => this.updateTilt());
        }
      });
    });
  }

  updateTilt() {
    if (!this.bounds) return;

    const width = this.bounds.width;
    const height = this.bounds.height;
    
    const x = this.mouseX - this.bounds.left;
    const y = this.mouseY - this.bounds.top;

    // Calculate rotation (max 10 degrees - reduced for subtlety & perf)
    const rotateX = ((y - height / 2) / height) * -10;
    const rotateY = ((x - width / 2) / width) * 10;

    const transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.02)`;
    
    // Direct DOM manipulation skipping Angular's renderer for perf in RAF loop
    this.el.nativeElement.style.transform = transform;
    
    // Dynamic Shadow
    const shadowX = (x - width / 2) / 12;
    const shadowY = (y - height / 2) / 12;
    this.el.nativeElement.style.boxShadow = `${-shadowX.toFixed(1)}px ${-shadowY.toFixed(1)}px 30px rgba(0,0,0,0.1)`;

    this.rafId = null;
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    if (this.mouseMoveListener) {
      this.mouseMoveListener(); // Unlisten
      this.mouseMoveListener = null;
    }
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Reset style
    this.renderer.setStyle(this.el.nativeElement, 'transform', 'perspective(1000px) rotateX(0) rotateY(0) scale(1)');
    this.renderer.setStyle(this.el.nativeElement, 'box-shadow', '0 15px 40px rgba(0,0,0,0.1)');
    this.bounds = null;
  }

  ngOnDestroy() {
    if (this.mouseMoveListener) {
      this.mouseMoveListener();
    }
  }
}
