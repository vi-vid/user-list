import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal, Signal, WritableSignal } from '@angular/core';
import { DataTableStore } from './data-table.store';
import { DecimalPipe, JsonPipe } from '@angular/common';

export interface ColumnConfiguration {
  label: string;
  propertyKey: string;
  sortable: boolean;
  filterable: boolean;
  renderFn?: (value: any, entry: any) => string | number | boolean | null
}

export type SortConfiguration = undefined | {
  propertyKey: string;
  isAscending: boolean;
};

export type FilterConfiguration = undefined | {
  key: string;
  value: string;
};

const DEFAULT_LIMIT = 10;

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DataTableStore]
})
export class DataTableComponent implements OnInit {
  private readonly dataTableStore = inject(DataTableStore);

  public entity = input.required<string>();
  public columns = input.required<ColumnConfiguration[]>();
  public apiBaseURL = input<string>('https://dummyjson.com');

  public vm = this.dataTableStore.vm;

  public entries: Signal<any[]> = computed(() => {
    const vm = this.vm();
    const limit = this.limit();

    if (vm.items) {
      const entries = vm.items;
      return [...entries, ...Array.from({length: Math.max(limit - entries.length, 0)}, () => ({}))]
    } else {
      return Array.from({length: limit}, () => ({}));
    }
  });

  public skip: Signal<number>  = computed(() => {
    const vm = this.vm();

    if (vm.configuration) {
      return vm.configuration.skip ?? 0;
    } else {
      return 0;
    }
  });

  public limit: Signal<number>  = computed(() => {
    return DEFAULT_LIMIT;
  });

  public total: Signal<number> = computed(() => {
    return this.vm().total;
  });

  public page = computed(() => {
    return Math.floor(this.skip() / this.limit()) + 1;
  });

  public maxPage = computed(() => {
    return Math.ceil(this.total() / this.limit());
  });

  public sort = signal<SortConfiguration>(undefined); 

  public ngOnInit(): void {
    this.dataTableStore.initialize({
      requestBaseUrl: this.apiBaseURL(),
      requestEntity: this.entity(),
      select: this.columns().map((column) => column.propertyKey),
      limit: this.limit(),
    });
  }

  public onChangePage(shift: number): void {
    const skip = this.skip();
    const limit = this.limit();

    this.dataTableStore.patchConfiguration({
      skip: skip + shift * limit
    });
  }

  public onChangeSort(sort: SortConfiguration) {
    this.sort.set(sort);

    this.dataTableStore.patchConfiguration({
      sort: sort ? {
        sortBy: sort.propertyKey,
        order: sort.isAscending ? 'asc' : 'desc'
      } : undefined
    });
  }

  public onChangeFilter(event: Event, key: string) {
    const value = (event.target as HTMLInputElement).value;

    this.dataTableStore.patchConfiguration({
      filter: value ? {
        key,
        value,
      } : undefined,
      skip: 0,
    });
  }
}
