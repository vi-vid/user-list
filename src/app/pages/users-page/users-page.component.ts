import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ColumnConfiguration, DataTableComponent } from '../../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [DataTableComponent],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersPageComponent {
  public columns: ColumnConfiguration[] = [{
    label: 'first name',
    propertyKey: 'firstName',
    sortable: true,
    filterable: true,
  }, {
    label: 'last name',
    propertyKey: 'lastName',
    sortable: true,
    filterable: true,
  }, {
    label: 'age',
    propertyKey: 'age',
    sortable: true,
    filterable: false,
  }, {
    label: 'address',
    propertyKey: 'address',
    sortable: false,
    filterable: false,
    renderFn: (value: { address: string }, _entry): string => {
      return value.address;
    }
  }]
}
