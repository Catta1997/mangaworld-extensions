/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */

import {
  AdvancedSearchForm,
  type FormItemElement,
  type FormSectionElement,
  type SearchQuery,
  Section,
  SelectRow,
  StepperRow,
  TriStateSelectRow,
} from "@paperback/types";

import { filter } from "../main";
import type { SearchMetadata } from "../models";

export class MangaWorldAdvancedSearchForm extends AdvancedSearchForm {
  private searchMetadata: SearchMetadata;
  constructor(searchQuery: SearchQuery<SearchMetadata>) {
    super();
    if (searchQuery.metadata !== undefined) {
      this.searchMetadata = searchQuery.metadata;
    } else {
      this.searchMetadata = {
        language: [],
        male: [],
        female: [],
        character: [],
        other: [],
        parody: [],
        author: [],
        mixed: [],
      };
    }
  }

  override getSearchQueryMetadata(): SearchMetadata {
    return this.searchMetadata;
  }
  override getSections(): FormSectionElement<unknown>[] {
    return [
      Section("type", this.getGenreFilter()),
      Section("genres", this.getTypeFilter()),
      Section("year", this.getYearFilter()),
      Section("status", this.getStatusFilter()),
    ];
  }
  getGenreFilter(): FormItemElement<unknown>[] {
    return [
      TriStateSelectRow("genres", {
        title: "Generi",
        value: this.searchMetadata.genres ?? {},
        layout: "list",
        items: filter.getGenreFilter().map((x) => ({ id: x.id, title: x.value })),
        allowExclusion: true,
        allowEmptySelection: true,
        onValueChange: Application.Selector(
          this as MangaWorldAdvancedSearchForm,
          "handleGenreChange",
        ),
      }),
    ];
  }

  getTypeFilter(): FormItemElement<unknown>[] {
    return [
      TriStateSelectRow("type", {
        title: "Tipologia",
        value: this.searchMetadata.type ?? {},
        layout: "list",
        allowExclusion: true,
        allowEmptySelection: true,
        items: filter.getMangaTypeFilter().map((x) => ({ id: x.id, title: x.value })),
        onValueChange: Application.Selector(
          this as MangaWorldAdvancedSearchForm,
          "handleTypeChange",
        ),
      }),
    ];
  }
  getStatusFilter(): FormItemElement<unknown>[] {
    return [
      SelectRow("status", {
        title: "Stato",
        subtitle: "Seleziona lo stato",
        value: this.searchMetadata.status ?? [],
        minItemCount: 0,
        maxItemCount: 1,
        options: filter.getStatusFilter().map((x) => ({ id: x.id, title: x.value })),
        onValueChange: Application.Selector(
          this as MangaWorldAdvancedSearchForm,
          "handleStatusChange",
        ),
      }),
    ];
  }
  getYearFilter(): FormItemElement<unknown>[] {
    return [
      StepperRow(`year`, {
        title: "Year",
        value: this.searchMetadata.year ?? 0,
        minValue: 0,
        maxValue: 5,
        stepValue: 1,
        loopOver: false,
        onValueChange: Application.Selector(
          this as MangaWorldAdvancedSearchForm,
          "handleYearChange",
        ),
      }),
    ];
  }
  async handleTypeChange(value: Record<string, "included" | "excluded">): Promise<void> {
    this.searchMetadata.type = value;
  }
  async handleGenreChange(value: Record<string, "included" | "excluded">): Promise<void> {
    this.searchMetadata.genres = value;
  }
  async handleStatusChange(value: string[]): Promise<void> {
    this.searchMetadata.status = value;
  }
  async handleYearChange(value: number): Promise<void> {
    this.searchMetadata.year = value;
  }
}
