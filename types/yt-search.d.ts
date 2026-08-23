declare module "yt-search" {
  interface YtVideo {
    videoId: string;
    title: string;
    author?: { name?: string };
    duration?: { seconds?: number; timestamp?: string };
    thumbnail?: string;
  }
  interface YtResult {
    videos?: YtVideo[];
  }
  const yts: (query: string) => Promise<YtResult>;
  export default yts;
}