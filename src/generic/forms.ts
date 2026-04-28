/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */

import {
  AdvancedSearchForm,
  ButtonRow,
  Form,
  type FormItemElement,
  type FormSectionElement,
  NavigationRow,
  type SearchQuery,
  Section,
  SelectRow,
  StepperRow,
  ToggleRow,
} from "@paperback/types";

import { filter, MangaWorldGeneric } from "./main";
import type { SearchMetadata } from "./models";
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
  /*
"genres" "year",       id: "status",
 */
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
      SelectRow("genres", {
        title: "Generi",
        subtitle: "Seleziona i Generi da includere nella ricerca",
        value: this.searchMetadata.genres ?? [],
        minItemCount: 0,
        maxItemCount: filter.getGenreFilter().length,
        options: filter.getGenreFilter().map((x) => ({ id: x.id, title: x.value })),
        onValueChange: Application.Selector(
          this as MangaWorldAdvancedSearchForm,
          "handleGenreChange",
        ),
      }),
    ];
  }

  getTypeFilter(): FormItemElement<unknown>[] {
    return [
      SelectRow("type", {
        title: "Tipologia",
        subtitle: "Seleziona la tipologia",
        value: this.searchMetadata.type ?? [],
        minItemCount: 0,
        maxItemCount: 1,
        options: filter.getMangaTypeFilter().map((x) => ({ id: x.id, title: x.value })),
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
  async handleTypeChange(value: string[]): Promise<void> {
    this.searchMetadata.type = value;
  }
  async handleGenreChange(value: string[]): Promise<void> {
    this.searchMetadata.genres = value;
  }
  async handleStatusChange(value: string[]): Promise<void> {
    this.searchMetadata.status = value;
  }
  async handleYearChange(value: number): Promise<void> {
    this.searchMetadata.year = value;
  }
}
export class Forms extends Form {
  manga_source: MangaWorldGeneric;
  constructor(manga_source: MangaWorldGeneric) {
    super();
    this.manga_source = manga_source;
  }
  override getSections() {
    return [
      Section("settings", [
        NavigationRow("contenuti", {
          title: "Contenuti",
          subtitle: "Impostazioni Contenuti",
          form: new FilterSettings(),
        }),
        NavigationRow("home", {
          title: "Preferenze Home",
          subtitle: "Impostazioni Home",
          form: new HomeSettings(),
        }),
        ButtonRow("reload_genres", {
          title: "Ricarica Tutti i Filtri",
          onSelect: Application.Selector(this as Forms, "refreshFilters"),
        }),
      ]),
    ];
  }

  async refreshFilters() {
    await filter.populateFilter(this.manga_source, true);
  }
}

class FilterSettings extends Form {
  genres = filter.getGenreFilter().map(({ value, ...rest }) => ({
    title: value,
    ...rest,
  }));

  mangaTypes = filter.getMangaTypeFilter().map(({ value, ...rest }) => ({
    title: value,
    ...rest,
  }));

  public async updateValue(value: string[], filter: string): Promise<void> {
    Application.setState(value, filter);
    this.reloadForm();
  }
  override getSections() {
    return [
      Section(
        {
          id: "update_settings",
          footer:
            "Potrebbero non venir nascosti in tutte le sezioni della home. " +
            "Tieni presente che verranno rimossi anche dalla ricerca",
        },
        [
          SelectRow("hide_tags", {
            title: "Nascondi Generi",
            subtitle: "Nascondi alcuni Generi",
            value: this.getHideTagsStatus(),
            options: this.genres,
            minItemCount: 0,
            maxItemCount: this.genres.length,
            onValueChange: Application.Selector(
              this as FilterSettings,
              "handleHideTagsStatusChange",
            ),
          }),

          SelectRow("hide_type", {
            title: "Nascondi Tipologia",
            subtitle: "Nascondi alcune Tipologie",
            value: this.getHideTypeStatus(),
            options: this.mangaTypes,
            minItemCount: 0,
            maxItemCount: this.mangaTypes.length,
            onValueChange: Application.Selector(
              this as FilterSettings,
              "handleHideTypeStatusChange",
            ),
          }),
        ],
      ),
      Section(
        {
          id: "default_settings",
          footer: "Cambia i filtri di default della ricerca",
        },
        [
          SelectRow("def_type", {
            title: "Tipologia",
            subtitle: "Tipologia di default",
            value: this.getDefTypeStatus(),
            options: this.mangaTypes,
            minItemCount: 0,
            maxItemCount: 1,
            onValueChange: Application.Selector(
              this as FilterSettings,
              "handleDefTypeStatusChange",
            ),
          }),
        ],
      ),
    ];
  }

  getHideTagsStatus(): string[] {
    return (Application.getState("hide_tags") as string[] | undefined) ?? [];
  }

  async handleHideTagsStatusChange(value: string[]): Promise<void> {
    await this.updateValue(value, "hide_tags");
  }

  getHideTypeStatus(): string[] {
    return (Application.getState("hide_type") as string[] | undefined) ?? [];
  }

  async handleHideTypeStatusChange(value: string[]): Promise<void> {
    await this.updateValue(value, "hide_type");
  }

  getDefTypeStatus(): string[] {
    return (Application.getState("def_type") as string[] | undefined) ?? [];
  }

  async handleDefTypeStatusChange(value: string[]): Promise<void> {
    await this.updateValue(value, "def_type");
  }
}

class FavSettings extends Form {
  public async updateValue(value: string[], filter: string): Promise<void> {
    Application.setState(value, filter);
    this.reloadForm();
  }

  public async updateToggleValue(value: boolean, filter: string): Promise<void> {
    Application.setState(value, filter);
    this.reloadForm();
    Application.invalidateDiscoverSections();
  }
  genres = filter.getGenreFilter().map(({ value, ...rest }) => ({
    title: value,
    ...rest,
  }));
  override getSections() {
    return [
      Section(
        {
          id: "home_settings",
          footer: "Mostra/Nascondi le Sezioni nella Home",
        },
        [
          ToggleRow("fav_section_enabled", {
            title: "Abilita le Ultime Aggiunte dei Generi Preferiti",
            subtitle: "Puoi impostare i generi tramite l'impostazione sotto",
            value: this.getFavStatus(),
            onValueChange: Application.Selector(this as FavSettings, "handleFavStatusChange"),
          }),
          SelectRow("fav_tags_new", {
            title: "Generi Preferiti",
            subtitle: "Seleziona i generi per la sezione sopra",
            value: this.getFavTagsNewStatus(),
            options: this.genres,
            minItemCount: 0,
            maxItemCount: 3,
            onValueChange: Application.Selector(
              this as FavSettings,
              "handleFavTagsNewStatusChange",
            ),
            isHidden: !this.getFavStatus(),
          }),
        ],
      ),
    ];
  }

  getFavStatus(): boolean {
    return (Application.getState("fav_section_enabled") as boolean) ?? true;
  }

  async handleFavStatusChange(value: boolean): Promise<void> {
    await this.updateToggleValue(value, "fav_section_enabled");
  }

  getFavTagsNewStatus(): string[] {
    return (Application.getState("fav_tags_new") as string[] | undefined) ?? [];
  }

  async handleFavTagsNewStatusChange(value: string[]): Promise<void> {
    await this.updateValue(value, "fav_tags_new");
    Application.invalidateDiscoverSections();
  }
}

class HomeSettings extends Form {
  public async updateToggleValue(value: boolean, filter: string): Promise<void> {
    Application.setState(value, filter);
    this.reloadForm();
    Application.invalidateDiscoverSections();
  }
  override getSections() {
    return [
      Section(
        {
          id: "home_settings",
          footer: "Mostra/Nascondi le Sezioni nella Home",
        },
        [
          ToggleRow("popular_section_enabled", {
            title: "Abilita Popolari",
            value: this.getPopularStatus(),
            onValueChange: Application.Selector(this as HomeSettings, "handlePopularStatusChange"),
          }),
          ToggleRow("mese_section_enabled", {
            title: "Abilita Tendenze del Mese",
            value: this.getMeseStatus(),
            onValueChange: Application.Selector(this as HomeSettings, "handleMeseStatusChange"),
          }),
          ToggleRow("most_read_section_enabled", {
            title: "Abilita Più Letti",
            value: this.getMostReadStatus(),
            onValueChange: Application.Selector(this as HomeSettings, "handleMostReadStatusChange"),
          }),
          ToggleRow("update_section_enabled", {
            title: "Abilita Aggiornati di Recente",
            value: this.getUpdateStatus(),
            onValueChange: Application.Selector(this as HomeSettings, "handleUpdateStatusChange"),
          }),
          ToggleRow("new_section_enabled", {
            title: "Abilita Ultime Aggiunte",
            value: this.getNewStatus(),
            onValueChange: Application.Selector(this as HomeSettings, "handleNewStatusChange"),
          }),
          ToggleRow("type_section_enabled", {
            title: "Abilita Tipologia",
            value: this.getTypeStatus(),
            onValueChange: Application.Selector(this as HomeSettings, "handleTypeStatusChange"),
          }),
          ToggleRow("genres_section_enabled", {
            title: "Abilita Generi",
            value: this.getGenreStatus(),
            onValueChange: Application.Selector(this as HomeSettings, "handleGenreStatusChange"),
          }),
          NavigationRow("fav_section", {
            title: "Preferiti",
            subtitle: "Impostazioni sui Preferiti",
            form: new FavSettings(),
          }),
        ],
      ),
    ];
  }

  getPopularStatus(): boolean {
    return (Application.getState("popular_section_enabled") as boolean) ?? true;
  }

  async handlePopularStatusChange(value: boolean): Promise<void> {
    await this.updateToggleValue(value, "popular_section_enabled");
  }

  getMeseStatus(): boolean {
    return (Application.getState("mese_section_enabled") as boolean) ?? true;
  }

  async handleMeseStatusChange(value: boolean): Promise<void> {
    await this.updateToggleValue(value, "mese_section_enabled");
  }

  getMostReadStatus(): boolean {
    return (Application.getState("most_read_section_enabled") as boolean) ?? true;
  }

  async handleMostReadStatusChange(value: boolean): Promise<void> {
    await this.updateToggleValue(value, "most_read_section_enabled");
  }

  getUpdateStatus(): boolean {
    return (Application.getState("update_section_enabled") as boolean) ?? true;
  }

  async handleUpdateStatusChange(value: boolean): Promise<void> {
    await this.updateToggleValue(value, "update_section_enabled");
  }

  getNewStatus(): boolean {
    return (Application.getState("new_section_enabled") as boolean) ?? true;
  }

  async handleNewStatusChange(value: boolean): Promise<void> {
    await this.updateToggleValue(value, "new_section_enabled");
  }

  getTypeStatus(): boolean {
    return (Application.getState("type_section_enabled") as boolean) ?? true;
  }

  async handleTypeStatusChange(value: boolean): Promise<void> {
    await this.updateToggleValue(value, "type_section_enabled");
  }

  getGenreStatus(): boolean {
    return (Application.getState("genre_section_enabled") as boolean) ?? true;
  }

  async handleGenreStatusChange(value: boolean): Promise<void> {
    await this.updateToggleValue(value, "genre_section_enabled");
  }
}
