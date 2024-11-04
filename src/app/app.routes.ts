import { Routes } from '@angular/router';
import { UsersPageComponent } from './pages/users-page/users-page.component';

export const routes: Routes = [{
    path: '',
    title: 'User List',
    component: UsersPageComponent
}, {
    path: '**',
    redirectTo: ''
}];
