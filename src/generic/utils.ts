import { ContentRating, type Tag } from "@paperback/types";
import * as cheerio from "cheerio";
import type {
    ChapterList,
    Genre,
    GlobalData,
    JSONConfig,
    MangaPageData,
    MangaWorldData,
    SearchInfo,
    SearchResults,
    TrendingChaptersData,
    WindowEntry,
} from "./jsonInterface";
import { jsonParser, type MangaWorldGeneric } from "./main";
import type { CacheItem, OptionItem, RawEntry } from "./models";
import { Requests } from "./network";

const cacheMap = new Map<string, CacheItem>();
const requestMap = new Map<string, Promise<ArrayBuffer>>();
const requests = new Requests();

export class Cache {
    async getPageCache(name: string, url: string): Promise<ArrayBuffer> {
        const cacheTime = 10; //cache seconds
        const cached = cacheMap.get(name);
        if (cached && cached.expires > Math.floor(Date.now() / 1000)) {
            //console.log(`[CACHE] Use Cached Page "${name}"`);
            return cached.data;
        }

        // If a request is already in progress for this name, return that promise
        if (requestMap.has(name)) {
            //console.log(`[CACHE] Awaiting Request "${name}"`);
            return requestMap.get(name)!;
        }

        //console.log(`[CACHE] Fetching New Page "${name}"`);

        const fetchPromise = requests
            .fetchPage(url)
            .then((data) => {
                cacheMap.set(name, {
                    expires: Math.floor(Date.now() / 1000) + cacheTime,
                    data: data,
                });
                //console.log(`[CACHE] New Cached "${name}"`);
                requestMap.delete(name);
                return data;
            })
            .catch((error) => {
                //console.log(`[CACHE] Error on cache "${name} - ${error}"`);
                requestMap.delete(name);
                throw error;
            });

        requestMap.set(name, fetchPromise);
        return fetchPromise;
    }
}

export class Tags {
    /**
     * Check Excluded tags
     * @param tags
     * @param exc
     * @return true: hide
     */
    public excludedTags = (tags: string[], exc: string[]): boolean => {
        return tags.some((tag) => {
            return exc.includes(tag);
        });
    };
    /**
     * Check Blacklisted tags
     * @param tags : string[] - tags
     * @return true: hide
     */
    public blacklistedTags = (tags: string[]): boolean => {
        const blacklistedSettings =
            (Application.getState("hide_tags") as string[] | undefined) ?? [];
        return tags.some((tag) => {
            return blacklistedSettings.includes(tag);
        });
    };
    /**
     * Get manga Rating
     * @param {string[]} tags - tags
     * @return {ContentRating} - ContentRating
     */
    tagRatingMap: Record<string, ContentRating> = {
        ADULTI: ContentRating.ADULT,
        MATURO: ContentRating.MATURE,
    };

    getRating(tags: string[]): ContentRating {
        for (const tag of tags) {
            const matchedRating =
                this.tagRatingMap[tag.toUpperCase()] ?? undefined;
            if (matchedRating) return matchedRating;
        }
        return ContentRating.EVERYONE;
    }
}

export class Type {
    /**
     * Check Excluded tags
     * @return true: hide
     * @param type
     * @param excluded
     */
    public excludedTypes = (type: string, excluded: string[]): boolean => {
        return excluded.includes(type.toLowerCase());
    };

    /**
     * Check Blacklisted types
     * @param {string}  type - type
     * @return true: hide
     */
    public blacklistedType = (type: string): boolean => {
        const blacklistedSettings =
            (Application.getState("hide_type") as string[] | undefined) ?? [];
        return blacklistedSettings.includes(type.toLowerCase());
    };
}

export class FilterPreferences {
    YearFilter: OptionItem[] = [];
    GenreFilter: OptionItem[] = [];
    MangaTypeFilter: OptionItem[] = [];
    OrderFilter: OptionItem[] = [];
    StatusFilter: OptionItem[] = [];
    /**
     * Set Manga Type Filter
     */
    private setMangaTypeFilter(newValue: OptionItem[]) {
        this.MangaTypeFilter = newValue;
    }

    /**
     * Get Manga Type
     * @return [{ value: string, id: string }]
     */
    public getMangaTypeFilter() {
        return this.MangaTypeFilter;
    }

    /**
     * Set Ordering Filter
     */
    private setOrderFilter(newValue: OptionItem[]) {
        this.OrderFilter = newValue;
    }

    /**
     * Get Ordering Type
     * @return [{value: string, id: string}]
     */
    public getOrderFilter() {
        return this.OrderFilter;
    }

    /**
     * Set Status Filter
     */
    private setStatusFilter(newValue: OptionItem[]) {
        this.StatusFilter = newValue;
    }

    /**
     * Get Status
     * @return [{value: string, id: string}]
     */
    public getStatusFilter() {
        return this.StatusFilter;
    }

    /**
     * Set Genres
     */
    private setGenreFilter(newValue: OptionItem[]) {
        this.GenreFilter = newValue;
    }

    /**
     * Get Genres
     * @return [{ value: string, id: string }]
     */
    public getGenreFilter() {
        return this.GenreFilter;
    }

    /**
     * Set Years
     */
    private setYearFilter(newValue: OptionItem[]) {
        this.YearFilter = newValue;
    }

    /**
     * Get Years
     * @return [{ value: string, id: string }]
     */
    public getYearFilter() {
        return this.YearFilter;
    }
    /**
     * Populate Search Filter
     */
    async populateFilter(source: MangaWorldGeneric) {
        const lastFilterFetch = Number(
            Application.getState("last-filter-fetch-date") ?? 0,
        );
        if (lastFilterFetch - 604800 > new Date().valueOf() / 1000) {
            //console.log("[CACHE] Use Cached Filters");
            this.setGenreFilter(
                JSON.parse(
                    Application.getState(".genres") as string,
                ) as OptionItem[],
            );
            this.setMangaTypeFilter(
                JSON.parse(
                    Application.getState(".type") as string,
                ) as OptionItem[],
            );
            this.setStatusFilter(
                JSON.parse(
                    Application.getState(".status") as string,
                ) as OptionItem[],
            );
            this.setOrderFilter(
                JSON.parse(
                    Application.getState(".sort") as string,
                ) as OptionItem[],
            );
            this.setYearFilter(
                JSON.parse(
                    Application.getState(".year") as string,
                ) as OptionItem[],
            );
        } else {
            const $ = await requests.parseFilters(source);
            const windowEntry = jsonParser.getWindowEntry($);
            const JSONFilter = this.extractOptionJSON(windowEntry);
            //this.setGenreFilter(this.extractOptions($, ".genres"));
            this.setMangaTypeFilter(this.extractOptions($, ".type"));
            this.setStatusFilter(this.extractOptions($, ".status"));
            this.setOrderFilter(this.extractOptions($, ".sort"));
            //this.setYearFilter(this.extractOptions($, ".year"));
            this.setGenreFilter(JSONFilter.genres);
            this.setYearFilter(JSONFilter.year);
            Application.setState(
                String(new Date().valueOf() / 1000),
                "last-filter-fetch-date",
            );
        }
    }
    mapGenresToOptionItem(genres?: Genre[] | null): OptionItem[] {
        if (!genres) return [];
        return genres.map((genre) => ({
            id: genre._id,
            value: genre.name,
        }));
    }

    mapStringToOptionItem(tags: (string | number)[]): OptionItem[] {
        if (!tags) return [];
        const stringtags = tags.map((v) => String(v));
        return stringtags.map((tag) => ({
            id: tag,
            value: tag,
        }));
    }

    extractOptionJSON(json: WindowEntry[]): {
        genres: OptionItem[];
        author: OptionItem[];
        artist: OptionItem[];
        year: OptionItem[];
    } {
        const filters: {
            genres: OptionItem[];
            author: OptionItem[];
            artist: OptionItem[];
            year: OptionItem[];
        } = {
            genres: [],
            author: [],
            artist: [],
            year: [],
        };
        json.forEach((item) => {
            if (item.kind == "global") {
                filters.genres = this.mapGenresToOptionItem(
                    item.data.globalData.genres,
                );
            }
            if (item.kind == "search") {
                filters.artist = this.mapStringToOptionItem(item.data.artists);
                filters.year = this.mapStringToOptionItem(item.data.years);
                filters.author = this.mapStringToOptionItem(item.data.authors);
            }
        });
        return filters;
    }
    /**
     * Extract filter option {value, id}.
     * @param $ - Requests.
     * @param filterSelector - CSS selector.
     * @returns{[{value, id}]}.
     */
    extractOptions(
        $: cheerio.CheerioAPI,
        filterSelector: string,
    ): OptionItem[] {
        const options = $(`${filterSelector} select.filter-select option`);
        const result: OptionItem[] = [];

        options.each((_, el) => {
            const id = $(el).attr("data-name");
            const label = $(el).text().trim();

            if (id) {
                result.push({ value: label, id });
            }
        });
        Application.setState(JSON.stringify(result), filterSelector);
        return result;
    }
}

export class JsonParser {
    isMangaData(data: unknown): data is MangaPageData {
        return typeof data === "object" && data !== null && "manga" in data;
    }

    isGlobalData(data: unknown): data is { globalData: GlobalData } {
        return (
            typeof data === "object" && data !== null && "globalData" in data
        );
    }

    isMangaChapterData(data: unknown): data is ChapterList {
        return typeof data === "object" && data !== null && "pages" in data;
    }

    isTrendingData(data: unknown): data is TrendingChaptersData {
        return (
            typeof data === "object" &&
            data !== null &&
            "mostViewedChapters" in data
        );
    }

    isSearchData(data: unknown): data is SearchResults {
        return typeof data === "object" && data !== null && "selected" in data;
    }

    isSearchInfoData(data: unknown): data is SearchInfo {
        return (
            typeof data === "object" && data !== null && "totalPages" in data
        );
    }
    //[MangaWorld] error: A JavaScript error occurred: undefined is not an object (evaluating 'json.o.w').; additionalInfo: stack=getWindowEntry@main.js:21824:40

    convertEntries(w: (RawEntry | WindowEntry)[]): WindowEntry[] {
        return w.map((entry): WindowEntry => {
            // se è già un oggetto tipizzato, lo ritorni diretto
            if (!Array.isArray(entry)) return entry;

            const [key, index, data, meta] = entry;

            if (this.isMangaData(data))
                return { kind: "manga", key, index, data, meta };
            if (this.isGlobalData(data))
                return { kind: "global", key, index, data, meta };
            if (this.isTrendingData(data))
                return { kind: "trending", key, index, data, meta };
            if (this.isMangaChapterData(data))
                return { kind: "chapter", key, index, data, meta };
            if (this.isSearchData(data))
                return { kind: "search", key, index, data, meta };
            if (this.isSearchInfoData(data))
                return { kind: "searchInfo", key, index, data, meta };
            return {
                kind: "config",
                key,
                index,
                data: data as JSONConfig,
                meta,
            };
        });
    }

    getWindowEntry($: cheerio.CheerioAPI): WindowEntry[] {
        const html = $.html();
        const regex =
            /<script[^>]*>\s*[^<]*?\$MC\s*=\s*\(window\.\$MC\|\|\[\]\)\.concat\(([\s\S]*?)\)\s*<\/script>/i;

        const match = html.match(regex);

        if (!match?.[1]) {
            throw new Error("No JSON Found");
        }
        const jsonText = match[1].trim();
        const json = JSON.parse(jsonText) as MangaWorldData;
        return this.convertEntries(json.o.w);
    }

    mapGenresToTags(genres: Genre[]): Tag[] {
        return genres.map((genre) => ({
            id: genre._id,
            title: genre.name,
        }));
    }
}
