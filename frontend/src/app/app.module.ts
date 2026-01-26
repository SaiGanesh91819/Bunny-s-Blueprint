import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BackgroundComponent } from './components/background/background.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HomeComponent } from './pages/home/home.component';
import { AuthComponent } from './pages/auth/auth.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ContactComponent } from './pages/contact/contact.component';
import { FooterComponent } from './components/footer/footer.component';
import { ScrollRevealDirective } from './directives/scroll-reveal.directive';
import { TiltDirective } from './directives/tilt.directive';
import { MagneticDirective } from './directives/magnetic.directive';
import { LoaderComponent } from './components/loader/loader.component';
import { AuthInterceptor } from './auth.interceptor';
import { LoaderInterceptor } from './interceptors/loader.interceptor';
import { ToastComponent } from './components/toast/toast.component';
import { PlansComponent } from './pages/plans/plans.component';
import { BmiComponent } from './pages/bmi/bmi.component';
import { LegalComponent } from './pages/legal/legal.component';

@NgModule({
  declarations: [
    AppComponent,
    BackgroundComponent,
    NavbarComponent,
    HomeComponent,
    AuthComponent,
    DashboardComponent,
    ProfileComponent,
    ContactComponent,
    FooterComponent,
    ScrollRevealDirective,
    TiltDirective,
    LoaderComponent,
    ToastComponent,
    PlansComponent,
    MagneticDirective,
    BmiComponent,
    LegalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: LoaderInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
