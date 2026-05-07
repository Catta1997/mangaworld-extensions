/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */

import {
  AdvancedSearchForm,
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
      const def_type = (Application.getState("def_type") as string[] | undefined) ?? [];
      const hyde_type = (Application.getState("hide_type") as string[] | undefined) ?? [];
      const hide_tags = (Application.getState("hide_tags") as string[] | undefined) ?? [];
      this.searchMetadata = {
        type: Object.fromEntries([
          ...def_type.map((k) => [k, "included"] as const),
          ...hyde_type.map((k) => [k, "excluded"] as const),
        ]),
        genres: Object.fromEntries(hide_tags.map((k) => [k, "excluded"])) ?? {},
      };
    }
  }

  override getSearchQueryMetadata(): SearchMetadata {
    return this.searchMetadata;
  }
  override getSections(): FormSectionElement<unknown>[] {
    return [
      Section("type", [
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
      ]),
      Section("genres", [
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
      ]),
      Section("year", [
        StepperRow(`year`, {
          title: "Anno",
          value: this.searchMetadata.year ?? 0,
          minValue: 1990,
          maxValue: new Date().getFullYear(),
          stepValue: 1,
          loopOver: false,
          onValueChange: Application.Selector(
            this as MangaWorldAdvancedSearchForm,
            "handleYearChange",
          ),
        }),
      ]),
      Section("status", [
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
      ]),
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
