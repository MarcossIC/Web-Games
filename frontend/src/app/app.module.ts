import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { AppRoutes } from "./app.routing";
import { AppComponent } from "./app.component";



@NgModule({
  imports: [
    CommonModule,
    BrowserModule, 
    AppRoutes
  ],
  declarations: [
    AppComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
