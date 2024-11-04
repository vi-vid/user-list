import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ComponentStore } from '@ngrx/component-store';
import {
  catchError,
  debounceTime,
  EMPTY,
  first,
  filter,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';

export interface DataTableStoreConfiguration {
  requestBaseUrl: string;
  requestEntity: string;
  select: string[];
  limit?: number;
  skip?: number;
  sort?: SortModel;
  filter?: FilterModel;
}

export interface SortModel {
  sortBy: string;
  order: 'asc' | 'desc';
}

export interface FilterModel {
  key: string;
  value: string;
}

export interface ResultModel {
  [key: string]: any[];
}

export interface DataTableState {
  isLoading: boolean;
  error: string | null;
  result: any[] | null;
  total: number | null;
  configuration: DataTableStoreConfiguration | null;
}

function paginateItems(values: any[], limit?: number, skip?: number): any[] {
  if (!limit) {
    return values;
  }
  return values.slice(skip, (skip ?? 0) + limit);
}

function filterItems(values: any[], filter?: FilterModel): any[] {
  if (!filter) return values;

  return values.filter((item) => item[filter.key].toLowerCase().includes(filter.value.toLowerCase()));
}

function sortItems(values: any[], sort?: SortModel): any[] {
  if (!sort) return values;

  const { sortBy, order } = sort;

  return values.slice().sort((a, b) => {
    if (a[sortBy] < b[sortBy]) return order === 'asc' ? -1 : 1;
    if (a[sortBy] > b[sortBy]) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

@UntilDestroy()
@Injectable()
export class DataTableStore extends ComponentStore<DataTableState> {
  private readonly http = inject(HttpClient);

  private items = computed(() => {
    const { requestEntity } = this.selectSignal((state) => state.configuration)() || {};
    const result = (this.selectSignal((state) => state.result)() ?? {}) as ResultModel;

    return result[requestEntity!] || [];
  });

  private filteredItems = computed(() => {
    const { sort, filter } = this.selectSignal((state) => state.configuration)() || {};

    return sortItems(filterItems(this.items(), filter), sort);
  });

  private paginatedItems = computed(() => {
    const { skip, limit } = this.selectSignal((state) => state.configuration)() || {};

    return paginateItems(this.filteredItems(), limit, skip);
  });
    
  public vm = computed(() => {
    const configuration = this.selectSignal((state) => state.configuration)();
    const isLoading = this.selectSignal((state) => state.isLoading)();
    const error = this.selectSignal((state) => state.error)();
    const filteredItems = this.filteredItems();
    const paginatedItems = this.paginatedItems();

    return {
      items: paginatedItems,
      total: filteredItems.length,
      error,
      isLoading,
      configuration,
    }
  });

  private readonly setLoading = this.updater(
    (state: DataTableState): DataTableState => ({
      ...state,
      isLoading: true,
      error: null,
    })
  );

  private readonly setError = this.updater(
    (state: DataTableState, error: string): DataTableState => ({
      ...state,
      result: null,
      isLoading: false,
      error,
    })
  );

  private readonly fetchSuccess = this.updater(
    (state: DataTableState, result: any): DataTableState => ({
      ...state,
      isLoading: false,
      result,
    })
  );

  private readonly fetch = this.effect(
    (configuration$: Observable<DataTableStoreConfiguration | null>) => {
      return configuration$.pipe(
        tap(() => {
          this.setLoading();
        }),
        debounceTime(512),
        switchMap((configuration) => {
          if (configuration) {
            const { requestBaseUrl, select, requestEntity } = configuration;

            return this.http.get(new URL(requestEntity, requestBaseUrl).href, {
              params: {
                select: select.join(','),
                limit: 0,
              }
            });
          } else {
            return of(null);
          }
        }),
        tap((response) => {
          this.fetchSuccess(response);
        }),
        catchError(() => {
          this.setError('error happened');
          return EMPTY;
        })
      );
    }
  );

  private readonly patchConfig = this.updater(
    (state: DataTableState, configuration: Partial<DataTableStoreConfiguration>): DataTableState => ({
      ...state,
      configuration: {
        ...state.configuration as DataTableStoreConfiguration,
        ...configuration
      }
    })
  );

  constructor() {
    super({
      isLoading: false,
      error: null,
      result: null,
      configuration: null,
      total: null,
    });

    this.select((state) => state.configuration).pipe(
      filter(Boolean), 
      untilDestroyed(this), 
      first()
    ).subscribe((configuration) => this.fetch(configuration));
  }

  public initialize(configuration: DataTableStoreConfiguration): void {
    this.patchConfig(configuration);
  };

  public patchConfiguration(configuration: Partial<DataTableStoreConfiguration>): void {
    this.patchConfig(configuration);
  }
}
