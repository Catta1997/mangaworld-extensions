export type MangaMetadata = {
    page: number;
};
export type OptionItem = {
    value: string;
    id: string;
};
export type CacheItem = {
    expires: number;
    data: ArrayBuffer;
};

export type RawEntry = [
    key: string,
    index: number,
    data: unknown,
    meta?: { f?: number },
];
