import {
    ContentRating,
    type Chapter,
    type ChapterDetails,
    type DiscoverSectionItem,
    type MangaInfo,
    type SearchResultItem,
    type SourceManga,
    type Tag,
    type TagSection,
} from "@paperback/types";
import * as cheerio from "cheerio";
import { MangaWorldGeneric, tags, types } from "./main";
import type { Metadata } from "./models";
import { Requests } from "./network";

const requests = new Requests();
export class Parsers {
    /**
     * Get Manga Detail
     * @param {cheerio.CheerioAPI} $ - Request
     * @param {string} mangaId - MangaID
     * @param {string} shareURL - shareURL
     * @param source
     * @return {SourceManga} - SourceManga
     */
    parseMangaDetails(
        $: cheerio.CheerioAPI,
        mangaId: string,
        shareURL: string,
        source: MangaWorldGeneric,
    ): SourceManga {
        const title: string = $(".name.bigger").text().trim() ?? "";
        const image: string =
            $(".thumb.mb-3.text-center img").attr("src") ?? "";
        const desc: string = $("#noidungm").text().trim() ?? "";
        let subs: string = "";
        const artists: string[] = [];
        const authors: string[] = [];
        const titles: string[] = [];
        const data = {
            genre: [] as string[],
            state: "",
        };
        for (const obj of $(".meta-data.row.px-1 .col-12").toArray()) {
            const text = $(obj).text().trim();
            if (text.includes("Fansub")) {
                subs = $(obj).find("a").first().text().trim();
            }
            if (text.includes("Stato")) {
                const stateLink = $(obj).find("a").first();
                if (stateLink.length) data.state = stateLink.text().trim();
            } else if (text.includes("Artist")) {
                $(obj)
                    .find("a")
                    .each(function (_, e) {
                        artists.push($(e).text().trim());
                    });
            } else if (text.includes("Autor")) {
                $(obj)
                    .find("a")
                    .each(function (_, e) {
                        authors.push($(e).text().trim());
                    });
            } else if (text.includes("Gener")) {
                $(obj)
                    .find("a")
                    .each(function (_, e) {
                        data.genre.push($(e).text().trim());
                    });
            } else if (text.includes("Titol")) {
                let t = $(obj).text().trim();
                t = t.slice(t.indexOf(":") + 1, t.length);
                t.split(",").forEach((element: string) => {
                    titles.push(element.trim());
                });
            }
        }
        const author = authors.join(", ");
        const artist = artists.join(", ");
        const status = data.state;
        const arrayTags: Tag[] = [];
        for (const tag of data.genre) {
            arrayTags.push({ title: tag, id: tag.replaceAll(" ", "-") });
        }
        const rating =
            source.defaultContentRating === ContentRating.ADULT
                ? ContentRating.ADULT
                : tags.getRating(arrayTags.map((tag) => tag.title));
        const tagSections: TagSection[] = [
            { id: "genres", title: "genres", tags: arrayTags },
        ];
        return {
            mangaId: mangaId,
            mangaInfo: {
                artist: artist,
                thumbnailUrl: image,
                synopsis: desc,
                primaryTitle: title,
                contentRating: rating,
                status: status,
                author: author,
                tagGroups: tagSections,
                secondaryTitles: titles,
                additionalInfo: { subs: subs },
                shareUrl: shareURL,
            } as MangaInfo,
        } as SourceManga;
    }

    /**
     * Get Chapter List
     * @param {cheerio.CheerioAPI} $ - Request
     * @param {SourceManga} sourceManga - Manga
     * @return {Chapter[]} - Chapters
     */
    parseChapters($: cheerio.CheerioAPI, sourceManga: SourceManga): Chapter[] {
        const chapters: Chapter[] = [];
        const arrChapters = $(".chapter").toArray().reverse();
        for (const item of arrChapters) {
            const href = $("a", item).attr("href") ?? "";
            const chapterId =
                (href.match(/read\/([^/]+)+/i) ?? ["null", ""])[1] ?? "";
            const volN = $(item)
                .closest(".volume-element")
                .find(".volume-name")
                .text()
                .split(" ")[1];
            const chapN = $(".d-inline-block", item).text().split(" ")[1];
            const chapNum = isNaN(Number(chapN)) ? 1 : Number(chapN);
            const volumeNum = isNaN(Number(volN)) ? undefined : Number(volN);

            const date = $("i.text-right.text-muted.chap-date", item).text();
            chapters.push({
                chapterId: chapterId,
                sourceManga: sourceManga,
                volume: volumeNum,
                version: sourceManga.mangaInfo.additionalInfo?.subs ?? "",
                langCode: "🇮🇹",
                chapNum: chapNum,
                publishDate: this.getDate(date),
            });
        }
        return chapters;
    }

    /**
     * Parsing chapter details
     * @param {cheerio.CheerioAPI} $ - Request
     * @param {string} mangaId - ID manga
     * @param {string} id - ID chapter
     * @return {{
     *   id: string
     *   mangaId: string
     *   pages: string[]
     * }} - Details
     */
    parseChapterDetails(
        $: cheerio.CheerioAPI,
        mangaId: string,
        id: string,
    ): ChapterDetails {
        const pages: string[] = [];
        for (const item of $(
            ".col-12.text-center.position-relative img",
        ).toArray()) {
            const imageUrl = $(item).attr("src");
            if (!imageUrl) continue;
            pages.push(imageUrl.trim());
        }
        return {
            id: id,
            mangaId: mangaId,
            pages: pages,
        };
    }

    /**
     * Page Parsing
     * @param {cheerio.CheerioAPI} $ - Request
     * @return {[{id:string,title:string,image:string,tags:string[], authors: string, type: string}]}
     */
    parsePage($: cheerio.CheerioAPI): {
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
        for (const item of $(".comics-grid .entry").toArray()) {
            const id =
                (($("a", item).attr("href") ?? "").match(
                    /[0-9]+\/[a-zA-Z0-9-]+/i,
                ) ?? ["null"])[0] ?? "";
            const authors: string[] = [];
            const tags: string[] = [];
            $("div.author", item)
                .find("a")
                .each(function (_, e) {
                    authors.push($(e).text().trim());
                });
            const title = $("a", item).attr("title") ?? "";
            const image = $("a img", item).attr("src") ?? "";
            const mangaType = $("div.genre", item).find("a").text().trim();
            $("div.genres", item)
                .find("a")
                .each(function (_, e) {
                    tags.push($(e).text().trim());
                });
            const author: string = authors.join(", ");
            items.push({
                id: id,
                title: title,
                image: image,
                tags: tags,
                authors: author,
                type: mangaType,
            });
        }
        return items;
    }

    /**
     * Search Parsing
     * @param {cheerio.CheerioAPI} $ - Request
     * @param excluded
     * @param source
     * @param page
     * @return {SearchResultItem[]} items
     */
    async parseSearchResults(
        $: cheerio.CheerioAPI,
        excluded: { generi: string[]; tipi: string[] },
        source: MangaWorldGeneric,
        page: number,
    ): Promise<{ items: SearchResultItem[]; metadata: Metadata | undefined }> {
        const results: SearchResultItem[] = [];
        const parse = this.parsePage($);
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
        const regexDinamica = new RegExp(`"totalPages":(\\d+)`, "m");
        const match = $.html().match(regexDinamica);
        let totalPages = 1;
        if (match && match[1]) {
            totalPages = parseInt(match[1], 10) ?? 1;
        }
        if (page + 1 > totalPages)
            return { items: results, metadata: undefined };
        else return { items: results, metadata: { page: page + 1 } };
    }

    /**
     * Parsing trending chapters
     * @param {Metadata} metadata - metadata
     * @param {cheerio.CheerioAPI} $ - Request
     * @param source
     * @return { items: DiscoverSectionItem[] }
     */
    parseTrendingChapters(
        $: cheerio.CheerioAPI,
        metadata: Metadata,
        source: MangaWorldGeneric,
    ): { items: DiscoverSectionItem[] } {
        const trending: DiscoverSectionItem[] = [];
        const arrTrending = $(".entry.vertical").toArray();
        for (const obj of arrTrending) {
            const id =
                (($("a", obj).attr("href") ?? "").match(
                    /[0-9]+\/[a-zA-Z0-9-]+/i,
                ) ?? ["null"])[0] ?? "";
            const image = $("a img", obj).attr("src") ?? "";
            const chapNum = $("a div", obj).text() ?? "";
            const title = $(".manga-title", obj).text().trim();
            trending.push({
                metadata: metadata,
                type: "featuredCarouselItem",
                contentRating: source.defaultContentRating,
                supertitle: chapNum,
                imageUrl: image,
                mangaId: id,
                title: title,
            });
        }
        return { items: trending };
    }

    /**
     * Parsing month trending
     * @param {Metadata} metadata - metadata
     * @param {cheerio.CheerioAPI} $ - Request
     * @param source
     * @return [ { items: DiscoverSectionItem[], metadata: Metadata }, { items: DiscoverSectionItem[], metadata: Metadata } ]
     */
    parseMonthTrending(
        $: cheerio.CheerioAPI,
        metadata: Metadata,
        source: MangaWorldGeneric,
    ): { items: DiscoverSectionItem[]; metadata: Metadata } {
        const arrHotTitle = $(".col-12 .top-wrapper .entry").toArray();
        const hot: DiscoverSectionItem[] = [];
        for (const obj of arrHotTitle) {
            const id =
                (($("a", obj).attr("href") ?? "").match(
                    /[0-9]+\/[a-zA-Z0-9-]+/i,
                ) ?? ["null"])[0] ?? "";
            const image = $(".img-fluid", obj).attr("src") ?? "";
            const title = $(".name", obj).first().text().trim() ?? "";
            if (hot.length < 10) {
                hot.push({
                    metadata: metadata,
                    type: "prominentCarouselItem",
                    contentRating: source.defaultContentRating,
                    imageUrl: image,
                    mangaId: id,
                    title: title,
                });
            }
        }
        return { items: hot, metadata: metadata };
    }

    /**
     * Parsing most read
     * @param {Metadata} metadata - metadata
     * @param source
     * @return {{ items: DiscoverSectionItem[], metadata: Metadata }}
     */
    async parseMostReadSection(
        metadata: Metadata,
        source: MangaWorldGeneric,
    ): Promise<{ items: DiscoverSectionItem[]; metadata: Metadata }> {
        let page = metadata?.page ?? 1;
        const $ = await requests.parsePopularSectionRequests(page, source);
        page++;
        const latest = await this.parseSection($, page, source);
        return { items: latest, metadata: { page: page } };
    }

    /**
     * Parsing last added
     * @param {Metadata} metadata - metadata
     * @param source
     * @return {{ items: DiscoverSectionItem[], metadata: Metadata }}
     */
    async parseLastMangaAddedSection(
        metadata: Metadata,
        source: MangaWorldGeneric,
    ): Promise<{ items: DiscoverSectionItem[]; metadata: Metadata }> {
        let page = metadata?.page ?? 1;
        const $ = await requests.parseLastMangaAddedSectionRequests(
            page,
            source,
        );
        page++;
        const latest = await this.parseSection($, page, source);
        return { items: latest, metadata: { page: page } };
    }

    async parseLastMangaAddedTagsSection(
        metadata: Metadata,
        source: MangaWorldGeneric,
    ): Promise<{ items: DiscoverSectionItem[]; metadata: Metadata }> {
        let page = metadata?.page ?? 1;
        const $ = await requests.parseLastMangaAddedTagsSectionRequests(
            page,
            source,
        );
        page++;
        const latest = await this.parseSection($, page, source);
        return { items: latest, metadata: { page: page } };
    }

    async parseSection(
        $: cheerio.CheerioAPI,
        page: number,
        source: MangaWorldGeneric,
    ) {
        const latest: DiscoverSectionItem[] = [];
        const parse = this.parsePage($);
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
     * @param {cheerio.CheerioAPI} $ - page
     * @param {Metadata} metadata - manga metadata
     * @param source
     * @return {{
     *        items: DiscoverSectionItem[],
     *        metadata: Metadata | undefined
     *    }}
     */
    async parseLastAddedSection(
        $: cheerio.CheerioAPI,
        metadata: Metadata,
        source: MangaWorldGeneric,
    ): Promise<{
        items: DiscoverSectionItem[];
        metadata: Metadata | undefined;
    }> {
        let page = metadata?.page ?? 1;
        if (page > 1) {
            $ = await requests.parseLastAddedSectionRequests(page, source);
        }
        page++;
        const arrLatest = $(
            ".col-sm-12.col-md-8.col-xl-9 .comics-grid .entry",
        ).toArray();
        const latest: DiscoverSectionItem[] = [];
        for (const obj of arrLatest) {
            const id: string =
                (($("a", obj).attr("href") ?? "").match(
                    /[0-9]+\/[a-zA-Z0-9-]+/i,
                ) ?? ["null"])[0] ?? "";
            const title: string = $("a", obj).attr("title") ?? "";
            const mangaType: string = $(".genre a", obj).text().trim() ?? "";
            const image: string = $("a img", obj).attr("src") ?? "";
            const sub: string =
                $(".d-flex.flex-wrap.flex-row a", obj).first().attr("title") ??
                "";
            const chapterId: string =
                ((
                    $(".d-flex.flex-wrap.flex-row a", obj).attr("href") ?? ""
                ).match(/\/read\/([a-f0-9]+)(?:\?.*)?$/i) ?? ["null", ""])[1] ??
                "";
            const regexDinamica = new RegExp(
                `"createdAt":\\s*"([^"]+)"\\s*,\\s*"updatedAt":\\s*"[^"]*"\\s*,\\s*"slugFolder":\\s*"[^"]*"\\s*,\\s*"__v":\\s*\\d+\\s*,\\s*"createdAtT":\\s*"[^"]*"\\s*,\\s*"createdAtTWithYear":\\s*"[^"]*"\\s*,\\s*"isNew":\\s*(true|false)\\s*,\\s*"id":\\s*"${chapterId}"`,
                "m",
            );
            const match = $.html().match(regexDinamica);
            let data = new Date();
            if (match && match[1]) {
                data = new Date(match[1]);
            }
            if (!types.blacklistedType(mangaType)) {
                latest.push({
                    chapterId: chapterId,
                    metadata: metadata,
                    type: "chapterUpdatesCarouselItem",
                    publishDate: data,
                    contentRating: source.defaultContentRating,
                    imageUrl: image,
                    mangaId: id,
                    title: title,
                    subtitle: sub,
                });
            }
        }
        return { items: latest, metadata: { page: page } };
    }

    /**
     * String to date
     * @param {string} dataString - date in string format
     * @return {Date} - Date
     */
    getDate(dataString: string): Date {
        const mesi: { [key: string]: number } = {
            gennaio: 0,
            febbraio: 1,
            marzo: 2,
            aprile: 3,
            maggio: 4,
            giugno: 5,
            luglio: 6,
            agosto: 7,
            settembre: 8,
            ottobre: 9,
            novembre: 10,
            dicembre: 11,
        };
        const oggi = new Date();
        const parts = dataString.trim().toLowerCase().split(" ");
        if (parts.length !== 3) return oggi;
        const [giornoStr, meseStr, annoStr] = parts as [string, string, string];
        const giorno = parseInt(giornoStr, 10);
        const mese = mesi[meseStr];
        const anno = parseInt(annoStr, 10);
        if (isNaN(giorno) || mese === undefined || isNaN(anno)) return oggi;
        return new Date(anno, mese, giorno);
    }
}
