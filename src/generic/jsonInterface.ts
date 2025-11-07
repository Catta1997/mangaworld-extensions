export interface SEOData {
    title: string;
    description: string;
}

export interface JSONConfig {
    CSRFToken: string;
    ADULT: boolean;
    URL: string;
    PUBLIC_URL: string;
    SITE_NAME: string;
    localURL: string;
    seo: SEOData;
}

export interface Genre {
    _id: string;
    name: string;
    slug: string;
}

export interface Fansub {
    _id: string;
    name: string;
    link: string;
    id: string;
}

export interface References {
    _id: string;
    mangaupdatesId?: string | number;
    mangadexId?: number;
    anilistId?: number;
    malId?: number;
    id: string;
}

export interface Manga {
    _id: string;
    extraTitles: string[];
    keywords: string[] | null;
    author: string[];
    artist: string[];
    genres: Genre[];
    references: References;
    totViews: number;
    dayViews: number;
    monthViews: number;
    fansub: Fansub | null;
    vm18: boolean;
    restrictedSigned?: boolean;
    volumesDownload: boolean;
    animeLink: string | null;
    related: string;
    readMode: string;
    title: string;
    status: string;
    type: string;
    trama: string;
    year: number;
    volumesCount: number | null;
    chaptersCount: number | null;
    image: string;
    slug: string;
    createdAt: string;
    updatedAt: string;
    slugFolder: string;
    linkId: number;
    typeT: string;
    statusT: string;
    createdAtT: string;
    imageT: string;
    tramaT: string;
    id: string;
}

export interface MangaChapterList {
    _id: string;
    manga: string | Manga;
    name: string;
    volume?: Volume[] | null;
    __v: number;
    createdAt: string;
    dayViews: number;
    monthViews: number;
    pages: string[];
    slugFolder: string;
    totViews: number;
    updatedAt: string;
    view: boolean;
    createdAtT: string;
    createdAtTWithYear: string;
    isNew: boolean;
    id: string;
}

export interface JSONChapter {
    _id: string;
    pages: string[];
    view: boolean;
    totViews: number;
    dayViews: number;
    monthViews: number;
    manga: Manga;
    volume: string | null;
    name: string;
    title: string | null;
    note: string | null;
    createdAt: string;
    updatedAt: string;
    slugFolder: string;
    __v: number;
    createdAtT: string;
    createdAtTWithYear: string;
    isNew: boolean;
    id: string;
}

export interface Volume {
    _id: string;
    manga: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    slugFolder: string;
    __v: number;
    image: string;
    createdAtTWithYear: string;
    imageT: string;
    id: string;
}

export interface Volumes {
    volume: Volume;
    chapters: MangaChapterList[];
}

export interface Pages {
    volumes: Volumes[];
    singleChapters: MangaChapterList[];
}

export interface ChapterList {
    URL: string;
    CDN_URL: string;
    pages: Pages;
}

export interface MangaPageData {
    URL: string;
    PUBLIC_URL: string;
    type: string;
    manga: Manga;
    chapters: JSONChapter[];
    actualImage: string;
}

export interface GlobalData {
    genres: Genre[];
    topMangas: Manga[];
    latestMangas: Manga[];
}

export interface SelectedFilter {
    keyword: string;
    genre: string[];
    type: string[];
    status: string[];
    author: string[];
    artist: string[];
    year: (number | string)[];
    sort: string;
}

export interface SearchResults {
    URL: string;
    results: number;
    selected: SelectedFilter;
    authors: string[];
    artists: string[];
    years: (number | string)[];
    mangas: Manga[];
    chapters: JSONChapter[];
    actualImage: string;
}

export interface SearchInfo {
    URL: string;
    totalPages: number;
    visiblePages: number;
    page: number;
}

export type WindowEntry =
    | {
          kind: "config";
          key: string; // es: "s0-2"
          index: number; // es: 0
          data: JSONConfig; // contiene CSRFToken, URL, ecc.
          meta?: { f?: number };
      }
    | {
          kind: "global";
          key: string; // es: "s0-6"
          index: number;
          data: { globalData: GlobalData };
          meta?: { f?: number };
      }
    | {
          kind: "manga";
          key: string; // es: "s0-22[1]"
          index: number;
          data: MangaPageData; // contiene manga + chapters
          meta?: { f?: number };
      }
    | {
          kind: "trending";
          key: string; // es: "s0-14"
          index: number;
          data: TrendingChaptersData; // contiene mostViewedChapters
          meta?: { f?: number };
      }
    | {
          kind: "chapter";
          key: string; // es: "s0-22[1]"
          index: number;
          data: ChapterList;
          meta?: { f?: number };
      }
    | {
          kind: "search";
          key: string; // es: "s0-22[1]"
          index: number;
          data: SearchResults;
          meta?: { f?: number };
      }
    | {
          kind: "searchInfo";
          key: string; // es: "s0-22[1]"
          index: number;
          data: SearchInfo;
          meta?: { f?: number };
      };

export interface TrendingChaptersData {
    URL: string;
    mostViewedChapters: MangaChapterList[];
}

export interface MangaWorldData {
    o: {
        l: number;
        g: { maintenance: boolean };
        w: WindowEntry[];
    };
}
