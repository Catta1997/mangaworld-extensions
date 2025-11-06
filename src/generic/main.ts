import {
    BasicRateLimiter,
    ContentRating,
    DiscoverSectionType,
    Form,
    type Chapter,
    type ChapterDetails,
    type ChapterProviding,
    type DiscoverSection,
    type DiscoverSectionItem,
    type DiscoverSectionProviding,
    type Extension,
    type MangaProviding,
    type PagedResults,
    type SearchFilter,
    type SearchQuery,
    type SearchResultItem,
    type SearchResultsProviding,
    type SettingsFormProviding,
    type SortingOption,
    type SourceManga,
} from "@paperback/types";
import * as cheerio from "cheerio";
import { Forms } from "./forms";
import type { Metadata } from "./models";
import { MainInterceptor, Requests } from "./network";
import { Parsers } from "./parsers";
import { Cache, FilterPreferences, Tags, Type } from "./utils";

export const cache = new Cache();
export const filter = new FilterPreferences();
export const tags = new Tags();
export const types = new Type();
export interface GenericParams {
    name: string;
    domain: string;
    contentRating: ContentRating;
    parser?: Parsers;
    requestManager?: Requests;
}

export abstract class MangaWorldGeneric
    implements
        SettingsFormProviding,
        Extension,
        SearchResultsProviding,
        MangaProviding,
        ChapterProviding,
        DiscoverSectionProviding
{
    readonly name: string;
    public base_url = "";
    public defaultContentRating = ContentRating.EVERYONE;
    parser: Parsers;
    requestManager: Requests;
    mainRateLimiter: BasicRateLimiter;
    mainInterceptor: MainInterceptor;

    protected constructor(params: GenericParams) {
        this.name = params.name;
        this.base_url = params.domain;
        this.defaultContentRating =
            params.contentRating ?? ContentRating.EVERYONE;
        this.parser = params.parser ?? new Parsers();
        this.requestManager = params.requestManager ?? new Requests();
        // Rate limit: Wait 1 sec after 3 requests
        this.mainRateLimiter = new BasicRateLimiter("main", {
            numberOfRequests: 3,
            bufferInterval: 1,
            ignoreImages: true,
        });
        this.mainInterceptor = new MainInterceptor("main");
    }

    async initialise(): Promise<void> {
        this.mainRateLimiter.registerInterceptor();
        this.mainInterceptor.registerInterceptor();
    }

    async getSettingsForm(): Promise<Form> {
        await filter.populateFilter(this);
        return new Forms();
    }

    async getSearchFilters(): Promise<SearchFilter[]> {
        await filter.populateFilter(this);
        const filters: SearchFilter[] = [];
        const def_value = ((Application.getState("def_type") as string[]) ??
            [])[0];
        const getExcludedTypeObject = {
            ...Object.fromEntries(
                filter
                    .getMangaTypeFilter()
                    .filter((option) => types.blacklistedType(option.id))
                    .map((item) => [item.id, "excluded" as const]),
            ),
            ...(def_value
                ? { [def_value.toLowerCase()]: "included" as const }
                : {}),
        } as Record<string, "included" | "excluded">;

        const getExcludedValueObject = Object.fromEntries(
            filter
                .getGenreFilter()
                .filter((option) => tags.blacklistedTags([option.id]))
                .map((item) => [item.id, "excluded" as const]),
        ) as Record<string, "included" | "excluded">;
        filters.push({
            type: "multiselect",
            options: filter.getMangaTypeFilter(),
            id: "types",
            allowExclusion: true,
            title: "Tipologia",
            value: getExcludedTypeObject,
            allowEmptySelection: true,
            maximum: 3,
        });
        filters.push({
            type: "multiselect",
            options: filter.getGenreFilter(),
            id: "genres",
            allowExclusion: true,
            title: "Genere",
            value: getExcludedValueObject,
            allowEmptySelection: true,
            maximum: 5,
        });
        filters.push({
            type: "dropdown",
            options: filter.getStatusFilter(),
            id: "status",
            title: "Stato",
            value: "",
        });
        filters.push({
            type: "dropdown",
            options: filter.getYearFilter(),
            id: "year",
            title: "Anno",
            value: "",
        });
        return filters;
    }

    async getSearchResults(
        query: SearchQuery,
        metadata: Metadata,
        sorting: SortingOption,
    ): Promise<PagedResults<SearchResultItem>> {
        const page = metadata?.page ?? 1;
        const { url, excluded } = this.requestManager.constructSearchRequestURL(
            page,
            query,
            sorting,
            this,
        );
        const $ = await this.requestManager.getSearchResultsRequests(url);
        return await this.parser.parseSearchResults($, excluded, this, page);
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const data = cache.getPageCache(
            mangaId,
            `${this.base_url}/manga/${mangaId}`,
        );
        const $ = cheerio.load(Application.arrayBufferToUTF8String(await data));
        return this.parser.parseMangaDetails(
            $,
            mangaId,
            `${this.base_url}/manga/${mangaId}`,
            this,
        );
    }

    async getChapters(sourceManga: SourceManga): Promise<Chapter[]> {
        const data = cache.getPageCache(
            sourceManga.mangaId,
            `${this.base_url}/manga/${sourceManga.mangaId}`,
        );
        const $ = cheerio.load(Application.arrayBufferToUTF8String(await data));
        return this.parser.parseChapters($, sourceManga);
    }

    async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
        const data = cache.getPageCache(
            `${chapter.sourceManga.mangaId}-${chapter.chapterId}`,
            `${this.base_url}/manga/${chapter.sourceManga.mangaId}/read/${chapter.chapterId}/?style=list`,
        );
        const $ = cheerio.load(Application.arrayBufferToUTF8String(await data));
        return this.parser.parseChapterDetails(
            $,
            chapter.sourceManga.mangaId,
            chapter.chapterId,
        );
    }

    async getDiscoverSections(): Promise<DiscoverSection[]> {
        const discover_section: DiscoverSection[] = [];
        if (
            (Application.getState("popular_section_enabled") as boolean) ??
            true
        ) {
            discover_section.push({
                id: "popular_section",
                title: "Capitoli In Tendenza",
                type: DiscoverSectionType.featured,
            });
        }
        if ((Application.getState("mese_section_enabled") as boolean) ?? true) {
            discover_section.push({
                id: "mese_section",
                title: "Tendenze del Mese",
                subtitle: "Più letti del mese",
                type: DiscoverSectionType.prominentCarousel,
            });
        }
        if (
            (Application.getState("most_read_section_enabled") as boolean) ??
            true
        ) {
            discover_section.push({
                id: "most_read_section",
                title: "Più Letti",
                subtitle: "I più popolari di sempre",
                type: DiscoverSectionType.simpleCarousel,
            });
        }
        if ((Application.getState("new_section_enabled") as boolean) ?? true) {
            discover_section.push({
                id: "new_manga_section",
                title: "Nuove Aggiunte",
                subtitle: "Le nuove Aggiunte",
                type: DiscoverSectionType.simpleCarousel,
            });
        }
        if (
            (Application.getState("update_section_enabled") as boolean) ??
            true
        ) {
            discover_section.push({
                id: "updated_section",
                title: "Aggiornati di Recente",
                subtitle: "Ultimi Capitoli Aggiunti",
                type: DiscoverSectionType.chapterUpdates,
            });
        }
        if (
            ((Application.getState("fav_tags_new") as string[])?.length ?? 0) >
                0 &&
            ((Application.getState("fav_section_enabled") as boolean) ?? true)
        ) {
            discover_section.push({
                id: "new_fav_type_section",
                title: "Nuove Aggiunte dei tuoi Generi Preferiti",
                subtitle: "Le nuove Aggiunte dei tuoi Generi Preferiti",
                type: DiscoverSectionType.simpleCarousel,
            });
        }
        if ((Application.getState("new_section_enabled") as boolean) ?? true) {
            discover_section.push({
                id: "new_manga_section",
                title: "Nuove Aggiunte",
                subtitle: "Le nuove Aggiunte",
                type: DiscoverSectionType.simpleCarousel,
            });
        }
        if ((Application.getState("type_section_enabled") as boolean) ?? true) {
            discover_section.push({
                id: "type_section",
                title: "Tipologia",
                subtitle: "Più letti di una tipologia",
                type: DiscoverSectionType.genres,
            });
        }
        if (
            (Application.getState("genre_section_enabled") as boolean) ??
            true
        ) {
            discover_section.push({
                id: "genre_section",
                title: "Genere",
                subtitle: "Più letti di un genere",
                type: DiscoverSectionType.genres,
            });
        }
        return discover_section;
    }

    async getSection(id: string, $: cheerio.CheerioAPI, metadata: Metadata) {
        switch (id) {
            case "popular_section": {
                return this.parser.parseTrendingChapters($, metadata, this);
            }
            case "mese_section": {
                return this.parser.parseMonthTrending($, metadata, this);
            }
            case "most_read_section": {
                return this.parser.parseMostReadSection(metadata, this);
            }
            case "updated_section": {
                return this.parser.parseLastAddedSection($, metadata, this);
            }
            case "new_manga_section": {
                return this.parser.parseLastMangaAddedSection(metadata, this);
            }
            case "new_fav_type_section": {
                return this.parser.parseLastMangaAddedTagsSection(
                    metadata,
                    this,
                );
            }
            case "genre_section": {
                await filter.populateFilter(this);
                const allGenres: DiscoverSectionItem[] = [];
                filter
                    .getGenreFilter()
                    .filter((option) => !tags.blacklistedTags([option.id]))
                    .forEach((filterItem) => {
                        const getExcludedValueObject = {
                            ...Object.fromEntries(
                                filter
                                    .getGenreFilter()
                                    .filter((option) =>
                                        tags.blacklistedTags([option.id]),
                                    )
                                    .map((item) => [
                                        item.id,
                                        "excluded" as const,
                                    ]),
                            ),
                            [filterItem.id]: "included" as const,
                        } as Record<string, "included" | "excluded">;
                        allGenres.push({
                            type: "genresCarouselItem",
                            searchQuery: {
                                title: "",
                                filters: [
                                    {
                                        id: "genres",
                                        value: getExcludedValueObject,
                                    },
                                ],
                            },
                            name: filterItem.value,
                            metadata: metadata,
                            contentRating:
                                this.defaultContentRating ===
                                ContentRating.ADULT
                                    ? ContentRating.ADULT
                                    : tags.getRating([filterItem.value]),
                        });
                    });
                return {
                    items: allGenres,
                    metadata: metadata,
                };
            }
            case "type_section": {
                await filter.populateFilter(this);
                const mangaType: DiscoverSectionItem[] = [];
                filter
                    .getMangaTypeFilter()
                    .filter((option) => !types.blacklistedType(option.value))
                    .forEach((filterItem) => {
                        const getExcludedTypeObject = {
                            ...Object.fromEntries(
                                filter
                                    .getMangaTypeFilter()
                                    .filter((option) =>
                                        types.blacklistedType(option.value),
                                    )
                                    .map((item) => [
                                        item.id,
                                        "excluded" as const,
                                    ]),
                            ),
                            [filterItem.id]: "included" as const,
                        } as Record<string, "included" | "excluded">;
                        mangaType.push({
                            type: "genresCarouselItem",
                            searchQuery: {
                                title: "",
                                filters: [
                                    {
                                        id: "types",
                                        value: getExcludedTypeObject,
                                    },
                                ],
                            },
                            name: filterItem.value,
                            metadata: metadata,
                            contentRating: ContentRating.EVERYONE,
                        });
                    });
                return {
                    items: mangaType,
                    metadata: metadata,
                };
            }
            default:
                return { items: [], metadata: metadata };
        }
    }

    async getDiscoverSectionItems(
        section: DiscoverSection,
        metadata: Metadata,
    ): Promise<PagedResults<DiscoverSectionItem>> {
        const $ = cheerio.load(
            Application.arrayBufferToUTF8String(
                await cache.getPageCache("home", this.base_url),
            ),
        );
        return await this.getSection(section.id, $, metadata);
    }

    async getSortingOptions(): Promise<SortingOption[]> {
        return filter.getOrderFilter().map((item) => ({
            id: item.id,
            label: item.value,
        }));
    }
}
