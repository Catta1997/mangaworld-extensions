import {
    ContentRating,
    type Chapter,
    type ChapterDetails,
    type ChapterUpdatesCarouselItem,
    type DiscoverSectionItem,
    type MangaInfo,
    type PagedResults,
    type SearchResultItem,
    type SourceManga,
    type Tag,
    type TagSection,
} from "@paperback/types";
import type {
    Manga,
    MangaPageData,
    TrendinManga,
    WindowEntry,
} from "./jsonInterface";
import { jsonParser, MangaWorldGeneric, tags, types } from "./main";
import type { MangaMetadata } from "./models";
import { Requests } from "./network";

const requests = new Requests();
export class Parsers {
    /**
     * Get Manga Detail
     * @param mangaInfo
     * @param {string} mangaId - MangaID
     * @param {string} shareURL - shareURL
     * @param source
     * @return {SourceManga} - SourceManga
     */
    parseMangaDetails(
        mangaInfo: WindowEntry[],
        mangaId: string,
        shareURL: string,
        source: MangaWorldGeneric,
    ): SourceManga {
        let artist = "";
        let image = "";
        let trama = "";
        let titolo = "";
        let stato = "";
        let autore = "";
        let info: string | undefined = "";
        let titoliSecondari: string[] = [];
        let arrayTags: Tag[] = [];
        let rating: ContentRating = source.defaultContentRating;
        mangaInfo.forEach((manga) => {
            if (manga.kind == "manga") {
                const parsedManga = manga.data.manga;
                artist = parsedManga.artist.join(", ");
                trama = parsedManga.trama;
                titolo = parsedManga.title;
                image = parsedManga.imageT ?? parsedManga.image;
                stato = parsedManga.status;
                autore = parsedManga.author.join(", ");
                info = parsedManga.fansub?.name ?? "Ufficiale";
                titoliSecondari = parsedManga.extraTitles;
                arrayTags = jsonParser.mapGenresToTags(parsedManga.genres);
                rating = tags.getRating(
                    parsedManga.genres?.map((genre) => genre.name) ?? [],
                );
            }
        });
        const tagSections: TagSection[] = [
            { id: "genres", title: "genres", tags: arrayTags },
        ];

        return {
            mangaId: mangaId,
            mangaInfo: {
                artist: artist,
                thumbnailUrl: image,
                synopsis: trama,
                primaryTitle: titolo,
                contentRating:
                    source.defaultContentRating === ContentRating.ADULT
                        ? ContentRating.ADULT
                        : rating,
                status: stato,
                author: autore,
                tagGroups: tagSections,
                secondaryTitles: titoliSecondari,
                additionalInfo: { subs: info },
                shareUrl: shareURL,
            } as MangaInfo,
        } as SourceManga;
    }

    /**
     * Get Chapter List
     * @param items
     * @param {SourceManga} sourceManga - Manga
     * @return {Chapter[]} - Chapters
     */
    parseChapters(items: WindowEntry[], sourceManga: SourceManga): Chapter[] {
        const chapters: Chapter[] = [];
        items.forEach((item) => {
            if (item.kind == "chapter") {
                if (item.data.pages.volumes.length > 0) {
                    item.data.pages.volumes.forEach((volume) => {
                        volume.chapters.forEach((chapter) => {
                            chapters.push({
                                chapterId: chapter.id,
                                sourceManga: sourceManga,
                                volume: Number(
                                    volume.volume.slugFolder.split("-")[1],
                                ),
                                version:
                                    sourceManga.mangaInfo.additionalInfo
                                        ?.subs ?? "",
                                langCode: "🇮🇹",
                                chapNum: Number(
                                    chapter.slugFolder.split("-")[1],
                                ),
                                publishDate: new Date(chapter.createdAt),
                            });
                        });
                    });
                }
                if (item.data.pages.singleChapters.length > 0) {
                    item.data.pages.singleChapters.forEach((chapter) => {
                        chapters.push({
                            chapterId: chapter.id,
                            sourceManga: sourceManga,
                            version:
                                sourceManga.mangaInfo.additionalInfo?.subs ??
                                "",
                            langCode: "🇮🇹",
                            chapNum: Number(chapter.slugFolder.split("-")[1]),
                            publishDate: new Date(chapter.createdAt),
                        });
                    });
                }
            }
        });
        return chapters;
    }

    parseChapterDetails(
        json: WindowEntry[],
        chapterId: string,
        slug: string,
        mangaID: string,
    ): ChapterDetails {
        const pages: string[] = [];
        json.forEach((item) => {
            if (item.kind == "chapter") {
                const info = jsonParser.findChapterData(
                    item.data.pages,
                    chapterId,
                );
                info?.pages.forEach((page) => {
                    pages.push(
                        `https://cdn.mangaworld.cx/chapters/${slug}-${info?.mangaId}/${info?.chapterURL}/${page}`,
                    );
                });
            }
        });
        return {
            id: chapterId,
            mangaId: mangaID,
            pages: pages,
        };
    }

    /**
     * Page Parsing
     * @param json
     * @return {[{id:string,title:string,image:string,tags:string[], authors: string, type: string}]}
     */
    parsePage(json: WindowEntry[]): {
        id: string;
        title: string;
        image: string;
        tags: string[];
        authors: string;
        type: string;
    }[] {
        const items: {
            id: string;
            title: string;
            image: string;
            tags: string[];
            authors: string;
            type: string;
        }[] = [];
        json.forEach((manga) => {
            if (manga.kind == "search") {
                manga.data.mangas.forEach((manga) => {
                    items.push({
                        id: manga.linkId + "/" + manga.slug,
                        title: manga.title ?? "",
                        image: manga.imageT ?? manga.image ?? "",
                        tags: manga.genres?.map((genre) => genre.name) ?? [],
                        authors: manga.author.join(", ") ?? "",
                        type: manga.typeT ?? manga.type ?? "",
                    });
                });
            }
        });
        return items;
    }

    /**
     * Search Parsing
     * @param excluded
     * @param source
     * @param metadata
     * @param json
     * @return {SearchResultItem[]} items
     */
    async parseSearchResults(
        excluded: { generi: string[]; tipi: string[] },
        source: MangaWorldGeneric,
        metadata: MangaMetadata | undefined,
        json: WindowEntry[],
    ): Promise<PagedResults<SearchResultItem>> {
        const results: SearchResultItem[] = [];
        const page = metadata?.page ?? 1;
        const parse = this.parsePage(json);
        for (const item of parse) {
            if (
                !types.excludedTypes(item.type, excluded.tipi) &&
                !tags.excludedTags(item.tags, excluded.generi)
            ) {
                results.push({
                    imageUrl: item.image,
                    title: item.title,
                    subtitle: item.authors,
                    mangaId: item.id,
                    contentRating:
                        source.defaultContentRating === ContentRating.ADULT
                            ? ContentRating.ADULT
                            : tags.getRating(item.tags),
                });
            }
        }
        let totalPages = 1;
        json.forEach((item) => {
            if (item.kind == "searchInfo") {
                totalPages = item.data.totalPages ?? 1;
            }
        });
        if (page + 1 > totalPages)
            return { items: results, metadata: undefined };
        else return { items: results, metadata: { page: page + 1 } };
    }

    /**
     * Parsing trending chapters
     * @param {Metadata} metadata - metadata
     * @param source
     * @param chapters
     * @return { items: DiscoverSectionItem[] }
     */
    parseTrendingChapters(
        metadata: MangaMetadata,
        source: MangaWorldGeneric,
        chapters: TrendinManga[],
    ): { items: DiscoverSectionItem[]; metadata: MangaMetadata } {
        const trending: DiscoverSectionItem[] = [];
        chapters.forEach((chapter) => {
            trending.push({
                metadata: metadata,
                type: "featuredCarouselItem",
                contentRating:
                    source.defaultContentRating === ContentRating.ADULT
                        ? ContentRating.ADULT
                        : source.defaultContentRating,
                supertitle: chapter.name,
                mangaId: chapter.manga.linkId + "/" + chapter.manga.slug,
                title: chapter.manga.title,
                imageUrl: chapter.manga.imageT ?? chapter.manga.image,
            });
        });
        return { items: trending, metadata: metadata };
    }

    /**
     * Parsing month trending
     * @param {Metadata} metadata - metadata
     * @param source
     * @param mangas
     * @return [ { items: DiscoverSectionItem[], metadata: Metadata }, { items: DiscoverSectionItem[], metadata: Metadata } ]
     */
    parseMonthTrending(
        metadata: MangaMetadata,
        source: MangaWorldGeneric,
        mangas: Manga[],
    ): { items: DiscoverSectionItem[]; metadata: MangaMetadata } {
        const hot: DiscoverSectionItem[] = [];
        mangas.forEach((manga) => {
            hot.push({
                metadata: metadata,
                type: "prominentCarouselItem",
                contentRating:
                    source.defaultContentRating === ContentRating.ADULT
                        ? ContentRating.ADULT
                        : tags.getRating(
                              manga.genres?.map((genre) => genre.name) ?? [],
                          ),
                imageUrl: manga.imageT ?? manga.image,
                mangaId: manga.linkId + "/" + manga.slug,
                title: manga.title,
            });
        });
        return { items: hot, metadata: metadata };
    }

    /**
     *
     * Parsing most read
     * @param {Metadata} metadata - metadata
     * @param source
     * @return {{ items: DiscoverSectionItem[], metadata: Metadata }}
     */
    async parseMostReadSection(
        metadata: MangaMetadata,
        source: MangaWorldGeneric,
    ): Promise<{ items: DiscoverSectionItem[]; metadata: MangaMetadata }> {
        let page = metadata?.page ?? 1;
        const $ = await requests.parsePopularSectionRequests(page, source);
        page++;
        const windowEntry = jsonParser.getWindowEntry($);
        const latest = await this.parseSection(page, source, windowEntry);
        return { items: latest, metadata: { page: page } };
    }

    async parseLastMangaAddedSection(
        metadata: MangaMetadata,
        source: MangaWorldGeneric,
        favTags: boolean,
    ): Promise<{ items: DiscoverSectionItem[]; metadata: MangaMetadata }> {
        let page = metadata?.page ?? 1;
        const html = await requests.parseLastMangaAddedTagsSectionRequests(
            page,
            source,
            favTags,
        );
        page++;
        const windowEntry = jsonParser.getWindowEntry(html);
        const latest = await this.parseSection(page, source, windowEntry);
        return { items: latest, metadata: { page: page } };
    }

    async parseSection(
        page: number,
        source: MangaWorldGeneric,
        json: WindowEntry[],
    ) {
        const latest: DiscoverSectionItem[] = [];
        const parse = this.parsePage(json);
        for (const item of parse) {
            if (
                !tags.blacklistedTags(item.tags) &&
                !types.blacklistedType(item.type)
            ) {
                latest.push({
                    metadata: { page: page },
                    subtitle: item.authors,
                    type: "simpleCarouselItem",
                    contentRating:
                        source.defaultContentRating === ContentRating.ADULT
                            ? ContentRating.ADULT
                            : tags.getRating(item.tags),
                    imageUrl: item.image,
                    mangaId: item.id,
                    title: item.title,
                });
            }
        }
        return latest;
    }

    /**
     * Parse new chapters
     * @param {Metadata} metadata - manga metadata
     * @param source
     * @param manga
     * @return {{
     *        items: DiscoverSectionItem[],
     *        metadata: Metadata | undefined
     *    }}
     */

    async parseLastAddedSection(
        metadata: MangaMetadata,
        source: MangaWorldGeneric,
        manga: MangaPageData,
    ): Promise<ChapterUpdatesCarouselItem | undefined> {
        return {
            chapterId: "items.manga",
            metadata: metadata,
            type: "chapterUpdatesCarouselItem",
            publishDate: new Date(manga.manga.createdAt),
            contentRating:
                source.defaultContentRating === ContentRating.ADULT
                    ? ContentRating.ADULT
                    : source.defaultContentRating,
            imageUrl: manga.manga.imageT ?? manga.manga.image,
            mangaId: manga.manga.linkId + "/" + manga.manga.slug,
            title: manga.manga.title,
            subtitle: manga.chapters[0]?.name ?? "",
        };
    }
}
