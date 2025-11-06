export type Metadata = {
    page?: number;
};
export type OptionItem = {
    value: string;
    id: string;
};
export type CacheItem = {
    expires: number;
    data: ArrayBuffer;
};
